/**
 * POST /.netlify/functions/bot-calendar-book
 *
 * Phase C: AI-Bot confirmed booking.
 * Slot times come ONLY from verified signed calendar_session.selected.
 * Reuses shared executeBooking (validate → FreeBusy → insert).
 * Never exposes tokens/secrets. No OpenAI.
 */

const { executeBooking } = require("./_lib/calendar-book-core");
const { verifySession, stableSlot } = require("./_lib/bot-calendar-session");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
  };
}

function parseJsonBody(event) {
  if (!event.body) return null;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Bind booking to signed selected slot — ignore client start/end for times.
 * Prefer the matching offered[] entry so selected times cannot drift.
 */
function buildBodyFromSession(session, body) {
  const selected = stableSlot(session.selected);
  if (!selected) return null;

  const fromOffered = (session.offered || [])
    .map(stableSlot)
    .filter(Boolean)
    .find((s) => s.slot_id === selected.slot_id);
  const slot = fromOffered || selected;

  return {
    start: slot.start,
    end: slot.end,
    timeZone: "Europe/Budapest",
    name: body && body.name,
    email: body && body.email,
    message: body && body.message,
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  try {
    const body = parseJsonBody(event);
    if (!body || typeof body !== "object") {
      return json(400, { ok: false, error: "validation" });
    }

    if (body.confirm !== true) {
      return json(400, { ok: false, error: "confirmation_required" });
    }

    const verified = verifySession(body.calendar_session);
    if (!verified.ok) {
      const err =
        verified.reason === "expired"
          ? "session_expired"
          : verified.reason === "no_secret"
            ? "unavailable"
            : "session_invalid";
      return json(403, { ok: false, error: err });
    }

    if (!verified.session.selected) {
      return json(400, { ok: false, error: "no_selected_slot" });
    }

    const bookingBody = buildBodyFromSession(verified.session, body);
    if (!bookingBody) {
      return json(400, { ok: false, error: "validation" });
    }

    // Reject if client tried to smuggle different times (ignored anyway, but explicit)
    if (
      typeof body.start === "string" &&
      body.start.trim() &&
      body.start.trim() !== bookingBody.start
    ) {
      return json(403, { ok: false, error: "slot_mismatch" });
    }
    if (
      typeof body.end === "string" &&
      body.end.trim() &&
      body.end.trim() !== bookingBody.end
    ) {
      return json(403, { ok: false, error: "slot_mismatch" });
    }

    const result = await executeBooking(bookingBody, {
      sourceTag: "foeldvary.com / AI-Bot 9000",
      idempotencyNamespace: "bot",
    });

    if (!result.ok) {
      return json(result.status || 500, { ok: false, error: result.error });
    }

    return json(200, {
      ok: true,
      eventId: result.eventId,
      slot: verified.session.selected,
      created: result.created === true,
    });
  } catch (err) {
    const code = err && err.code ? err.code : "UNKNOWN";
    if (code === "ENV_MISSING" || code === "TOKEN_REFRESH_FAILED") {
      return json(502, { ok: false, error: "unavailable" });
    }
    return json(500, { ok: false, error: "unavailable" });
  }
};

// --- local assertions (no live Google) ---
if (require.main === module) {
  process.env.BOT_CALENDAR_STATE_SECRET =
    process.env.BOT_CALENDAR_STATE_SECRET || "test-secret-phase-c";

  const { signSession } = require("./_lib/bot-calendar-session");
  const offered = [
    {
      slot_id: "2026-09-18T15:00",
      start: "2026-09-18T15:00:00",
      end: "2026-09-18T16:00:00",
      label: "Fri 18 Sep, 15:00–16:00",
    },
  ];
  const session = signSession({ offered, selected: offered[0] });
  const verified = verifySession(session);
  if (!verified.ok || !verified.session.selected) {
    console.error("FAIL session", verified);
    process.exit(1);
  }

  const built = buildBodyFromSession(verified.session, {
    name: "Ada",
    email: "ada@example.com",
    message: "Hello",
    start: "2026-09-18T11:00:00", // smuggled — ignored for times
    end: "2026-09-18T12:00:00",
  });
  if (!built || built.start !== "2026-09-18T15:00:00" || built.end !== "2026-09-18T16:00:00") {
    console.error("FAIL bind to signed slot", built);
    process.exit(1);
  }

  const expired = signSession({
    offered,
    selected: offered[0],
    now: Date.now() - 31 * 60 * 1000,
  });
  if (verifySession(expired).ok) {
    console.error("FAIL expired should reject");
    process.exit(1);
  }

  console.log("OK bot-calendar-book selftest");
}
