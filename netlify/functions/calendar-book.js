/**
 * POST /.netlify/functions/calendar-book
 *
 * Google Calendar is the source of truth:
 * validate → FreeBusy re-check → events.insert
 *
 * Never returns tokens or raw Google payloads.
 * Never accepts calendar ID from the client.
 */

const { executeBooking } = require("./_lib/calendar-book-core");

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
    const result = await executeBooking(body, {
      sourceTag: "foeldvary.com",
      idempotencyNamespace: "contact",
    });

    if (!result.ok) {
      return json(result.status || 500, { ok: false, error: result.error });
    }

    return json(200, { ok: true, eventId: result.eventId });
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
