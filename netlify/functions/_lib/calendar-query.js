/**
 * Shared Google Calendar FreeBusy query (read-only).
 * Reuses google-auth + busy-sanitize. Never returns tokens or event titles.
 */

const { getAccessToken, requireEnv } = require("./google-auth");
const { sanitizeBusyIntervals } = require("./busy-sanitize");
const { budapestOffsetMinutes } = require("./budapest-time");

const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 62;

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
 * @param {string} dateStr YYYY-MM-DD
 * @param {boolean} endExclusive
 * @param {string} tz
 */
function budapestDayBounds(dateStr, endExclusive, tz) {
  const pad = (n) => String(n).padStart(2, "0");

  if (endExclusive) {
    const { y, m, d } = parseDateParts(dateStr);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const ny = next.getUTCFullYear();
    const nm = next.getUTCMonth() + 1;
    const nd = next.getUTCDate();
    const nextKey = `${ny}-${pad(nm)}-${pad(nd)}`;
    const offsetMin = budapestOffsetMinutes(nextKey, tz);
    const utcMs = Date.UTC(ny, nm - 1, nd, 0, 0, 0) - offsetMin * 60 * 1000;
    return new Date(utcMs).toISOString();
  }

  const { y, m, d } = parseDateParts(dateStr);
  const offsetMin = budapestOffsetMinutes(dateStr, tz);
  const utcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMin * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {string|null} error message
 */
function validateDateRange(from, to, maxDays = MAX_RANGE_DAYS) {
  if (!DATE_RE.test(from || "") || !DATE_RE.test(to || "")) {
    return "from and to must be YYYY-MM-DD";
  }
  if (from > to) {
    return "from must be <= to";
  }
  const days = rangeDays(from, to);
  if (days < 0 || days > maxDays) {
    return `date range must be between 0 and ${maxDays} days`;
  }
  return null;
}

/**
 * Query Google FreeBusy for BOOKING_TZ / GOOGLE_CALENDAR_ID.
 * @param {{ from: string, to: string }} opts civil dates inclusive
 * @returns {Promise<{ busy: { start: string, end: string }[], timeZone: string }>}
 */
async function queryBusyRange({ from, to }) {
  const validationError = validateDateRange(from, to);
  if (validationError) {
    const err = new Error(validationError);
    err.code = "VALIDATION";
    throw err;
  }

  const calendarId = requireEnv("GOOGLE_CALENDAR_ID");
  const timeZone = process.env.BOOKING_TZ || "Europe/Budapest";

  const timeMin = budapestDayBounds(from, false, timeZone);
  const timeMax = budapestDayBounds(to, true, timeZone);
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
    const err = new Error("Availability provider request failed");
    err.code = "FREEBUSY_REQUEST_FAILED";
    throw err;
  }

  const freeBusyJson = await freeBusyRes.json();
  const busy = sanitizeBusyIntervals(freeBusyJson, calendarId);

  return { busy, timeZone };
}

module.exports = {
  DATE_RE,
  MAX_RANGE_DAYS,
  validateDateRange,
  budapestDayBounds,
  queryBusyRange,
  rangeDays,
};
