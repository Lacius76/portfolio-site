/**
 * Shared Google Calendar booking core (source of truth).
 * validate → FreeBusy re-check → events.insert
 * Used by calendar-book.js and bot-calendar-book.js.
 * Never logs tokens or PII.
 *
 * Idempotency: deterministic event IDs. On insert 409, GET + verify —
 * never treat cancelled/mismatched events as blind success.
 */

const crypto = require("crypto");
const { getAccessToken, requireEnv } = require("./google-auth");
const { sanitizeBusyIntervals } = require("./busy-sanitize");
const { validateBookingBody, slotOverlapsBusy } = require("./booking-validate");

const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

function buildDescription(data, sourceTag) {
  const lines = [
    `Visitor name: ${data.name}`,
    `Visitor email: ${data.email}`,
  ];
  if (data.message) {
    lines.push("", "Message:", data.message);
  }
  lines.push("", `Source: ${sourceTag || "foeldvary.com"}`);
  return lines.join("\n");
}

/**
 * Deterministic Google event id (base32hex-compatible: 0-9a-f from hex).
 * Same slot + email → same id → duplicate CONFIRM is idempotent.
 * Uses server secrets only (never logged / never sent to client).
 */
function bookingEventId(data, namespace) {
  const secret =
    process.env.BOT_CALENDAR_STATE_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    "";
  const material = `${namespace || "book"}|${data.startLocal}|${data.endLocal}|${data.email}`;
  if (!secret) {
    // Still produce a stable-enough id for the request without a durable secret
    return crypto.createHash("sha256").update(material).digest("hex").slice(0, 32);
  }
  return crypto.createHmac("sha256", secret).update(material).digest("hex").slice(0, 32);
}

function eventDateTimeMs(dtObj) {
  if (!dtObj || typeof dtObj !== "object") return NaN;
  if (typeof dtObj.dateTime === "string" && dtObj.dateTime.trim()) {
    return Date.parse(dtObj.dateTime);
  }
  return NaN;
}

/** Active / live Google event statuses (missing defaults to confirmed). */
function isLiveEventStatus(status) {
  if (status == null || status === "") return true;
  return status === "confirmed" || status === "tentative";
}

function eventTimesMatch(existing, data) {
  if (!existing || !data) return false;
  const startMs = eventDateTimeMs(existing.start);
  const endMs = eventDateTimeMs(existing.end);
  const wantStart = Date.parse(data.startIso);
  const wantEnd = Date.parse(data.endIso);
  if (
    Number.isNaN(startMs) ||
    Number.isNaN(endMs) ||
    Number.isNaN(wantStart) ||
    Number.isNaN(wantEnd)
  ) {
    return false;
  }
  return startMs === wantStart && endMs === wantEnd;
}

/**
 * Booking-context check: description must include the visitor email we write.
 */
function descriptionMatchesBooking(existing, data) {
  if (!data || typeof data.email !== "string" || !data.email) return false;
  const desc =
    existing && typeof existing.description === "string" ? existing.description : "";
  const needle = `visitor email: ${data.email}`.toLowerCase();
  return desc.toLowerCase().includes(needle);
}

/**
 * Classify an existing Google event after insert 409.
 * @returns {'verified_existing'|'restore'|'mismatch'|'invalid'}
 */
function classifyExistingEvent(existing, data) {
  if (!existing || typeof existing !== "object") return "invalid";
  const status =
    typeof existing.status === "string" ? existing.status : "confirmed";

  if (status === "cancelled") return "restore";
  if (!isLiveEventStatus(status)) return "invalid";
  if (!eventTimesMatch(existing, data)) return "mismatch";
  if (!descriptionMatchesBooking(existing, data)) return "mismatch";
  return "verified_existing";
}

/**
 * Client/server gate: only notify when a live booking was confirmed.
 */
function isVerifiedLiveBookingResult(result) {
  if (!result || result.ok !== true) return false;
  return (
    result.created === true ||
    result.restored === true ||
    result.verified_existing === true
  );
}

function successCreated(eventId) {
  return {
    ok: true,
    eventId,
    created: true,
    restored: false,
    verified_existing: false,
  };
}

function successVerifiedExisting(eventId) {
  return {
    ok: true,
    eventId,
    created: false,
    restored: false,
    verified_existing: true,
  };
}

function successRestored(eventId) {
  return {
    ok: true,
    eventId,
    created: false,
    restored: true,
    verified_existing: false,
  };
}

function buildEventResource(data, opts, tz, includeId) {
  const body = {
    summary: `Portfolio booking — ${data.name}`,
    description: buildDescription(data, opts.sourceTag || "foeldvary.com"),
    status: "confirmed",
    start: {
      dateTime: data.startLocal,
      timeZone: tz,
    },
    end: {
      dateTime: data.endLocal,
      timeZone: tz,
    },
  };
  if (includeId) body.id = includeId;
  return body;
}

/**
 * @param {object} body - raw booking body { start, end, timeZone?, name, email, message }
 * @param {{ sourceTag?: string, eventId?: string|null, idempotencyNamespace?: string, fetchImpl?: typeof fetch, accessToken?: string, calendarId?: string }} [opts]
 * @returns {Promise<object>}
 */
async function executeBooking(body, opts = {}) {
  const tz = process.env.BOOKING_TZ || "Europe/Budapest";
  const fetchFn = opts.fetchImpl || fetch;
  const validated = validateBookingBody(body, tz);
  if (!validated.ok) {
    return { ok: false, error: validated.code || "validation", status: 400 };
  }

  const data = validated.data;
  const calendarId = opts.calendarId || requireEnv("GOOGLE_CALENDAR_ID");
  const accessToken = opts.accessToken || (await getAccessToken());

  const freeBusyRes = await fetchFn(FREEBUSY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: data.startIso,
      timeMax: data.endIso,
      timeZone: tz,
      items: [{ id: calendarId }],
    }),
  });

  if (!freeBusyRes.ok) {
    return { ok: false, error: "unavailable", status: 502 };
  }

  let busy;
  try {
    const freeBusyJson = await freeBusyRes.json();
    busy = sanitizeBusyIntervals(freeBusyJson, calendarId);
  } catch (err) {
    if (err && err.code === "FREEBUSY_CALENDAR_ERROR") {
      return { ok: false, error: "unavailable", status: 502 };
    }
    throw err;
  }

  if (slotOverlapsBusy(busy, data.startIso, data.endIso)) {
    // Slot looks busy — may be our own prior booking (slower double-submit).
    // Check deterministic id before failing as race-condition busy.
    const maybeId =
      typeof opts.eventId === "string" && opts.eventId
        ? opts.eventId
        : bookingEventId(data, opts.idempotencyNamespace || "portfolio");
    const eventsBase =
      "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(calendarId) +
      "/events";
    try {
      const ownGet = await fetchFn(
        `${eventsBase}/${encodeURIComponent(maybeId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (ownGet.ok) {
        const existing = await ownGet.json();
        if (classifyExistingEvent(existing, data) === "verified_existing") {
          const id =
            existing && typeof existing.id === "string" ? existing.id : maybeId;
          return successVerifiedExisting(id);
        }
      }
    } catch (_) {
      // Fall through to slot_busy
    }
    return { ok: false, error: "slot_busy", status: 409 };
  }

  const eventId =
    typeof opts.eventId === "string" && opts.eventId
      ? opts.eventId
      : bookingEventId(data, opts.idempotencyNamespace || "portfolio");

  const eventsUrl =
    "https://www.googleapis.com/calendar/v3/calendars/" +
    encodeURIComponent(calendarId) +
    "/events";

  const insertBody = buildEventResource(data, opts, tz, eventId);

  const insertRes = await fetchFn(eventsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(insertBody),
  });

  if (insertRes.ok) {
    const created = await insertRes.json();
    const id = created && typeof created.id === "string" ? created.id : eventId;
    return successCreated(id);
  }

  // Idempotent path — never treat 409 as success without verifying GET payload
  if (insertRes.status === 409) {
    const getUrl = `${eventsUrl}/${encodeURIComponent(eventId)}`;
    const getRes = await fetchFn(getUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!getRes.ok) {
      return { ok: false, error: "unavailable", status: 502 };
    }

    let existing;
    try {
      existing = await getRes.json();
    } catch (_) {
      return { ok: false, error: "unavailable", status: 502 };
    }

    const kind = classifyExistingEvent(existing, data);
    const id =
      existing && typeof existing.id === "string" ? existing.id : eventId;

    if (kind === "verified_existing") {
      return successVerifiedExisting(id);
    }

    if (kind === "restore") {
      // Cancelled tombstone: restore via update — do not return blind success
      const updateBody = buildEventResource(data, opts, tz, null);
      const updateRes = await fetchFn(getUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
      });
      if (!updateRes.ok) {
        return { ok: false, error: "unavailable", status: 502 };
      }
      let updated;
      try {
        updated = await updateRes.json();
      } catch (_) {
        updated = null;
      }
      const restoredId =
        updated && typeof updated.id === "string" ? updated.id : id;
      // Ensure we never claim restore without a confirmed live status when Google returns body
      if (
        updated &&
        typeof updated.status === "string" &&
        updated.status === "cancelled"
      ) {
        return { ok: false, error: "unavailable", status: 502 };
      }
      return successRestored(restoredId);
    }

    // mismatch / invalid — fail closed (not HTTP 409 slot_busy)
    return { ok: false, error: "unavailable", status: 502 };
  }

  return { ok: false, error: "unavailable", status: 502 };
}

module.exports = {
  executeBooking,
  bookingEventId,
  buildDescription,
  isLiveEventStatus,
  eventTimesMatch,
  descriptionMatchesBooking,
  classifyExistingEvent,
  isVerifiedLiveBookingResult,
  successCreated,
  successVerifiedExisting,
  successRestored,
};

// --- regression tests (no live Google) ---
if (require.main === module) {
  const assert = (cond, msg) => {
    if (!cond) {
      console.error("FAIL", msg);
      process.exit(1);
    }
  };

  process.env.BOOKING_TZ = process.env.BOOKING_TZ || "Europe/Budapest";
  process.env.BOT_CALENDAR_STATE_SECRET =
    process.env.BOT_CALENDAR_STATE_SECRET || "test-secret-idempotency";

  // Far-future Friday 10:00–11:00 Budapest
  const bookingBody = {
    start: "2027-09-17T10:00:00",
    end: "2027-09-17T11:00:00",
    timeZone: "Europe/Budapest",
    name: "Ada Lovelace",
    email: "ada@example.com",
    message: "Hello",
  };

  const validated = validateBookingBody(bookingBody, "Europe/Budapest");
  assert(validated.ok, "fixture must validate");
  const data = validated.data;

  // --- pure classification ---
  assert(
    classifyExistingEvent(
      {
        id: "abc",
        status: "cancelled",
        start: { dateTime: data.startIso },
        end: { dateTime: data.endIso },
      },
      data
    ) === "restore",
    "E: cancelled → restore (never blind success)"
  );

  assert(
    classifyExistingEvent(
      {
        id: "abc",
        status: "confirmed",
        description: buildDescription(data, "test"),
        start: { dateTime: data.startIso },
        end: { dateTime: data.endIso },
      },
      data
    ) === "verified_existing",
    "B: live matching → verified_existing"
  );

  assert(
    classifyExistingEvent(
      {
        id: "abc",
        status: "confirmed",
        description: buildDescription(data, "test"),
        start: { dateTime: "2027-09-17T12:00:00+02:00" },
        end: { dateTime: "2027-09-17T13:00:00+02:00" },
      },
      data
    ) === "mismatch",
    "D: active mismatched times → mismatch"
  );

  assert(
    classifyExistingEvent(
      {
        id: "abc",
        status: "confirmed",
        description: "unrelated event",
        start: { dateTime: data.startIso },
        end: { dateTime: data.endIso },
      },
      data
    ) === "mismatch",
    "D: active wrong email context → mismatch"
  );

  assert(
    isVerifiedLiveBookingResult(successCreated("x")) === true,
    "F: created notifies"
  );
  assert(
    isVerifiedLiveBookingResult(successRestored("x")) === true,
    "F: restored notifies"
  );
  assert(
    isVerifiedLiveBookingResult(successVerifiedExisting("x")) === true,
    "F: verified_existing notifies"
  );
  assert(
    isVerifiedLiveBookingResult({
      ok: true,
      eventId: "x",
      created: false,
      restored: false,
      verified_existing: false,
    }) === false,
    "F/E: blind ok+created:false must NOT notify"
  );

  const calendarId = "primary@test";
  const freeBusyOk = (body) =>
    new Response(
      JSON.stringify({
        calendars: { [calendarId]: { busy: [] } },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  function mockFetchSequence(handlers) {
    let i = 0;
    return async (url, init) => {
      const h = handlers[i++];
      assert(h, `unexpected fetch #${i} ${url}`);
      return h(url, init || {});
    };
  }

  (async () => {
    // A. fresh booking → created true
    {
      const fetchImpl = mockFetchSequence([
        freeBusyOk,
        () =>
          new Response(JSON.stringify({ id: "evt-new", status: "confirmed" }), {
            status: 200,
          }),
      ]);
      const result = await executeBooking(bookingBody, {
        fetchImpl,
        accessToken: "tok",
        calendarId,
        idempotencyNamespace: "bot",
        sourceTag: "test",
      });
      assert(result.ok && result.created === true, "A: created true");
      assert(result.verified_existing !== true && result.restored !== true, "A flags");
      assert(isVerifiedLiveBookingResult(result), "A notify gate");
    }

    // B. duplicate confirm on live event → verified_existing, no update/insert retry body beyond GET
    {
      let putCount = 0;
      let postCount = 0;
      const fetchImpl = mockFetchSequence([
        freeBusyOk,
        (url, init) => {
          if (init.method === "POST") postCount++;
          return new Response("{}", { status: 409 });
        },
        () =>
          new Response(
            JSON.stringify({
              id: "evt-live",
              status: "confirmed",
              description: buildDescription(data, "test"),
              start: { dateTime: data.startIso },
              end: { dateTime: data.endIso },
            }),
            { status: 200 }
          ),
      ]);
      const result = await executeBooking(bookingBody, {
        fetchImpl,
        accessToken: "tok",
        calendarId,
        eventId: "evt-live",
        sourceTag: "test",
      });
      assert(
        result.ok &&
          result.verified_existing === true &&
          result.created === false &&
          result.restored !== true,
        "B: verified_existing"
      );
      assert(postCount === 1 && putCount === 0, "B: no duplicate write");
      assert(isVerifiedLiveBookingResult(result), "B notify gate");
    }

    // C. manually deleted → restore succeeds
    {
      let putBody = null;
      const fetchImpl = mockFetchSequence([
        freeBusyOk,
        () => new Response("{}", { status: 409 }),
        () =>
          new Response(
            JSON.stringify({
              id: "evt-tomb",
              status: "cancelled",
              start: { dateTime: data.startIso },
              end: { dateTime: data.endIso },
            }),
            { status: 200 }
          ),
        (url, init) => {
          assert(init.method === "PUT", "C: restore via PUT");
          putBody = JSON.parse(init.body);
          return new Response(
            JSON.stringify({
              id: "evt-tomb",
              status: "confirmed",
              start: putBody.start,
              end: putBody.end,
            }),
            { status: 200 }
          );
        },
      ]);
      const result = await executeBooking(bookingBody, {
        fetchImpl,
        accessToken: "tok",
        calendarId,
        eventId: "evt-tomb",
        sourceTag: "test",
      });
      assert(
        result.ok &&
          result.restored === true &&
          result.created === false &&
          result.verified_existing !== true,
        "C: restored true"
      );
      assert(putBody && putBody.status === "confirmed", "C: restored confirmed");
      assert(isVerifiedLiveBookingResult(result), "C notify gate");
    }

    // D. mismatched existing → fail closed
    {
      const fetchImpl = mockFetchSequence([
        freeBusyOk,
        () => new Response("{}", { status: 409 }),
        () =>
          new Response(
            JSON.stringify({
              id: "evt-mis",
              status: "confirmed",
              description: buildDescription(data, "test"),
              start: { dateTime: "2027-09-17T08:00:00+02:00" },
              end: { dateTime: "2027-09-17T09:00:00+02:00" },
            }),
            { status: 200 }
          ),
      ]);
      const result = await executeBooking(bookingBody, {
        fetchImpl,
        accessToken: "tok",
        calendarId,
        eventId: "evt-mis",
        sourceTag: "test",
      });
      assert(!result.ok, "D: fail closed");
      assert(!isVerifiedLiveBookingResult(result), "D: no notify");
    }

    // E. cancelled must never return blind success (classification + no success without PUT)
    {
      const fetchImpl = mockFetchSequence([
        freeBusyOk,
        () => new Response("{}", { status: 409 }),
        () =>
          new Response(
            JSON.stringify({ id: "evt-c", status: "cancelled" }),
            { status: 200 }
          ),
        () => new Response("{}", { status: 500 }),
      ]);
      const result = await executeBooking(bookingBody, {
        fetchImpl,
        accessToken: "tok",
        calendarId,
        eventId: "evt-c",
        sourceTag: "test",
      });
      assert(!result.ok, "E: restore failure is not success");
      assert(result.created !== true && result.restored !== true, "E flags");
      assert(!isVerifiedLiveBookingResult(result), "E: no notify");
    }

    // 409 + GET fails → fail closed
    {
      const fetchImpl = mockFetchSequence([
        freeBusyOk,
        () => new Response("{}", { status: 409 }),
        () => new Response("{}", { status: 404 }),
      ]);
      const result = await executeBooking(bookingBody, {
        fetchImpl,
        accessToken: "tok",
        calendarId,
        eventId: "evt-missing",
        sourceTag: "test",
      });
      assert(!result.ok, "GET fail closed");
    }

    // B2. slower double-submit: FreeBusy busy + own live event → verified_existing
    {
      const fetchImpl = mockFetchSequence([
        () =>
          new Response(
            JSON.stringify({
              calendars: {
                [calendarId]: {
                  busy: [{ start: data.startIso, end: data.endIso }],
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          ),
        () =>
          new Response(
            JSON.stringify({
              id: "evt-own",
              status: "confirmed",
              description: buildDescription(data, "test"),
              start: { dateTime: data.startIso },
              end: { dateTime: data.endIso },
            }),
            { status: 200 }
          ),
      ]);
      const result = await executeBooking(bookingBody, {
        fetchImpl,
        accessToken: "tok",
        calendarId,
        eventId: "evt-own",
        sourceTag: "test",
      });
      assert(
        result.ok && result.verified_existing === true,
        "B2: FreeBusy busy but own event verified"
      );
    }

    // Race: FreeBusy busy + foreign/mismatched event → slot_busy
    {
      const fetchImpl = mockFetchSequence([
        () =>
          new Response(
            JSON.stringify({
              calendars: {
                [calendarId]: {
                  busy: [{ start: data.startIso, end: data.endIso }],
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          ),
        () => new Response("{}", { status: 404 }),
      ]);
      const result = await executeBooking(bookingBody, {
        fetchImpl,
        accessToken: "tok",
        calendarId,
        eventId: "evt-other",
        sourceTag: "test",
      });
      assert(
        !result.ok && result.error === "slot_busy",
        "race: foreign busy stays slot_busy"
      );
    }

    console.log("OK calendar-book-core idempotency A–F selftest");
  })().catch((err) => {
    console.error("FAIL", err);
    process.exit(1);
  });
}
