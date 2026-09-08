/**
 * POST /.netlify/functions/calendar-book
 *
 * Google Calendar is the source of truth:
 * validate → FreeBusy re-check → events.insert
 *
 * Never returns tokens or raw Google payloads.
 * Never accepts calendar ID from the client.
 */

const { getAccessToken, requireEnv } = require("./_lib/google-auth");
const { sanitizeBusyIntervals } = require("./_lib/busy-sanitize");
const { validateBookingBody, slotOverlapsBusy } = require("./_lib/booking-validate");

const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
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

function buildDescription(data) {
  const lines = [
    `Visitor name: ${data.name}`,
    `Visitor email: ${data.email}`,
  ];
  if (data.message) {
    lines.push("", "Message:", data.message);
  }
  lines.push("", "Source: foeldvary.com");
  return lines.join("\n");
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
    const tz = process.env.BOOKING_TZ || "Europe/Budapest";
    const body = parseJsonBody(event);
    const validated = validateBookingBody(body, tz);
    if (!validated.ok) {
      return json(400, { ok: false, error: validated.code || "validation" });
    }

    const data = validated.data;
    const calendarId = requireEnv("GOOGLE_CALENDAR_ID");
    const accessToken = await getAccessToken();

    // FreeBusy re-check for this slot only
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
      return json(502, { ok: false, error: "unavailable" });
    }

    const freeBusyJson = await freeBusyRes.json();
    let busy;
    try {
      busy = sanitizeBusyIntervals(freeBusyJson, calendarId);
    } catch (err) {
      if (err && err.code === "FREEBUSY_CALENDAR_ERROR") {
        return json(502, { ok: false, error: "unavailable" });
      }
      throw err;
    }

    if (slotOverlapsBusy(busy, data.startIso, data.endIso)) {
      return json(409, { ok: false, error: "slot_busy" });
    }

    const eventsUrl =
      "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(calendarId) +
      "/events";

    const insertRes = await fetch(eventsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `Portfolio booking — ${data.name}`,
        description: buildDescription(data),
        start: {
          dateTime: data.startLocal,
          timeZone: tz,
        },
        end: {
          dateTime: data.endLocal,
          timeZone: tz,
        },
      }),
    });

    if (!insertRes.ok) {
      return json(502, { ok: false, error: "unavailable" });
    }

    const created = await insertRes.json();
    const eventId = created && typeof created.id === "string" ? created.id : null;
    if (!eventId) {
      return json(502, { ok: false, error: "unavailable" });
    }

    // Booking confirmed — Calendar is source of truth
    return json(200, { ok: true, eventId });
  } catch (err) {
    const code = err && err.code ? err.code : "UNKNOWN";
    if (code === "ENV_MISSING") {
      return json(500, { ok: false, error: "unavailable" });
    }
    if (code === "TOKEN_REFRESH_FAILED") {
      return json(502, { ok: false, error: "unavailable" });
    }
    return json(500, { ok: false, error: "unavailable" });
  }
};
