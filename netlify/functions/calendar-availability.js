/**
 * GET /.netlify/functions/calendar-availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * READ-ONLY: Google Calendar FreeBusy → sanitized busy intervals only.
 * Fail closed on any error. Never returns event titles or tokens.
 */

const { getAccessToken, requireEnv } = require("./_lib/google-auth");
const { sanitizeBusyIntervals } = require("./_lib/busy-sanitize");

const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 62;

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

function parseDateParts(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function dayIndexUTC(dateStr) {
  const { y, m, d } = parseDateParts(dateStr);
  return Date.UTC(y, m - 1, d) / 86400000;
}

function rangeDays(from, to) {
  return dayIndexUTC(to) - dayIndexUTC(from);
}

/**
 * Build RFC3339 bounds for Budapest civil dates [from 00:00, to+1 00:00).
 * Uses a stable offset probe via Intl (CET/CEST).
 */
function budapestDayBounds(dateStr, endExclusive) {
  const tz = process.env.BOOKING_TZ || "Europe/Budapest";
  const { y, m, d } = parseDateParts(dateStr);

  // Midday UTC probe → read Budapest offset for that civil day
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(probe)
      .filter((p) => p.type === "timeZoneName" || p.type === "hour" || p.type === "minute")
      .map((p) => [p.type, p.value])
  );

  // timeZoneName like "GMT+2" or "GMT+02:00"
  const raw = parts.timeZoneName || "GMT+1";
  const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  let offsetMin = 60;
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    const hh = Number(match[2]);
    const mm = Number(match[3] || "0");
    offsetMin = sign * (hh * 60 + mm);
  }

  if (endExclusive) {
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const ny = next.getUTCFullYear();
    const nm = next.getUTCMonth() + 1;
    const nd = next.getUTCDate();
    return budapestInstant(ny, nm, nd, 0, 0, offsetMin);
  }

  return budapestInstant(y, m, d, 0, 0, offsetMin);
}

function budapestInstant(y, m, d, hour, minute, offsetMin) {
  // Local Budapest wall time → UTC
  const utcMs =
    Date.UTC(y, m - 1, d, hour, minute, 0) - offsetMin * 60 * 1000;
  return new Date(utcMs).toISOString();
}

function validateQuery(from, to) {
  if (!DATE_RE.test(from || "") || !DATE_RE.test(to || "")) {
    return "Query params from and to are required as YYYY-MM-DD";
  }
  if (from > to) {
    return "Param from must be <= to";
  }
  const days = rangeDays(from, to);
  if (days < 0 || days > MAX_RANGE_DAYS) {
    return `Date range must be between 0 and ${MAX_RANGE_DAYS} days`;
  }
  return null;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const params = event.queryStringParameters || {};
    const from = params.from;
    const to = params.to;
    const validationError = validateQuery(from, to);
    if (validationError) {
      return json(400, { error: validationError });
    }

    const calendarId = requireEnv("GOOGLE_CALENDAR_ID");
    const timeZone = process.env.BOOKING_TZ || "Europe/Budapest";

    const timeMin = budapestDayBounds(from, false);
    const timeMax = budapestDayBounds(to, true);

    const accessToken = await getAccessToken();

    const freeBusyRes = await fetch(FREEBUSY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone,
        items: [{ id: calendarId }],
      }),
    });

    if (!freeBusyRes.ok) {
      return json(502, { error: "Availability provider request failed" });
    }

    const freeBusyJson = await freeBusyRes.json();
    const busy = sanitizeBusyIntervals(freeBusyJson, calendarId);

    return json(200, { busy });
  } catch (err) {
    const code = err && err.code ? err.code : "UNKNOWN";
    if (code === "ENV_MISSING") {
      return json(500, { error: "Availability service is not configured" });
    }
    if (code === "FREEBUSY_CALENDAR_ERROR") {
      return json(502, { error: "Availability provider calendar error" });
    }
    if (code === "TOKEN_REFRESH_FAILED") {
      return json(502, { error: "Availability authentication failed" });
    }
    return json(500, { error: "Availability service unavailable" });
  }
};
