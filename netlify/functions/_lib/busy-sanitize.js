/**
 * Sanitize Google FreeBusy payload → public busy intervals only.
 */

function isIsoDateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/**
 * @param {object} freeBusyJson - raw FreeBusy API response
 * @param {string} calendarId
 * @returns {{ start: string, end: string }[]}
 */
function sanitizeBusyIntervals(freeBusyJson, calendarId) {
  if (!freeBusyJson || typeof freeBusyJson !== "object") return [];

  const calendars = freeBusyJson.calendars;
  if (!calendars || typeof calendars !== "object") return [];

  const entry = calendars[calendarId];
  if (!entry || typeof entry !== "object") return [];

  // If Google reports calendar errors, fail closed at the function layer
  if (Array.isArray(entry.errors) && entry.errors.length > 0) {
    const err = new Error("Google Calendar FreeBusy returned calendar errors");
    err.code = "FREEBUSY_CALENDAR_ERROR";
    throw err;
  }

  const busy = Array.isArray(entry.busy) ? entry.busy : [];
  const out = [];

  for (const item of busy) {
    if (!item || typeof item !== "object") continue;
    const start = item.start;
    const end = item.end;
    if (!isIsoDateTime(start) || !isIsoDateTime(end)) continue;
    if (Date.parse(end) <= Date.parse(start)) continue;
    out.push({ start, end });
  }

  return out;
}

module.exports = {
  sanitizeBusyIntervals,
};
