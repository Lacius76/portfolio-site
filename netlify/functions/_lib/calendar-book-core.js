/**
 * Shared Google Calendar booking core (source of truth).
 * validate → FreeBusy re-check → events.insert
 * Used by calendar-book.js and bot-calendar-book.js.
 * Never logs tokens or PII.
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

/**
 * @param {object} body - raw booking body { start, end, timeZone?, name, email, message }
 * @param {{ sourceTag?: string, eventId?: string|null, idempotencyNamespace?: string }} [opts]
 * @returns {Promise<{ ok: true, eventId: string, created: boolean } | { ok: false, error: string, status: number }>}
 */
async function executeBooking(body, opts = {}) {
  const tz = process.env.BOOKING_TZ || "Europe/Budapest";
  const validated = validateBookingBody(body, tz);
  if (!validated.ok) {
    return { ok: false, error: validated.code || "validation", status: 400 };
  }

  const data = validated.data;
  const calendarId = requireEnv("GOOGLE_CALENDAR_ID");
  const accessToken = await getAccessToken();

  const freeBusyRes = await fetch(FREEBUSY_URL, {
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

  const eventBody = {
    id: eventId,
    summary: `Portfolio booking — ${data.name}`,
    description: buildDescription(data, opts.sourceTag || "foeldvary.com"),
    start: {
      dateTime: data.startLocal,
      timeZone: tz,
    },
    end: {
      dateTime: data.endLocal,
      timeZone: tz,
    },
  };

  const insertRes = await fetch(eventsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (insertRes.ok) {
    const created = await insertRes.json();
    const id = created && typeof created.id === "string" ? created.id : eventId;
    return { ok: true, eventId: id, created: true };
  }

  // Idempotent retry: event already exists with this id
  if (insertRes.status === 409) {
    const getUrl = `${eventsUrl}/${encodeURIComponent(eventId)}`;
    const getRes = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (getRes.ok) {
      const existing = await getRes.json();
      const id = existing && typeof existing.id === "string" ? existing.id : eventId;
      return { ok: true, eventId: id, created: false };
    }
    return { ok: false, error: "unavailable", status: 502 };
  }

  return { ok: false, error: "unavailable", status: 502 };
}

module.exports = {
  executeBooking,
  bookingEventId,
  buildDescription,
};
