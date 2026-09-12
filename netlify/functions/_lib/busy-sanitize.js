/**
 * Sanitize Google FreeBusy payload → public busy intervals only.
 * Fail closed if the target calendar is missing or reports errors —
 * never treat a broken payload as "fully free" (empty busy).
 */

function isIsoDateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function freeBusyCalendarError(message) {
  const err = new Error(message);
  err.code = "FREEBUSY_CALENDAR_ERROR";
  return err;
}

/**
 * @param {object} freeBusyJson - raw FreeBusy API response
 * @param {string} calendarId
 * @returns {{ start: string, end: string }[]}
 */
function sanitizeBusyIntervals(freeBusyJson, calendarId) {
  if (!freeBusyJson || typeof freeBusyJson !== "object") {
    throw freeBusyCalendarError("Google Calendar FreeBusy returned an invalid payload");
  }

  const calendars = freeBusyJson.calendars;
  if (!calendars || typeof calendars !== "object") {
    throw freeBusyCalendarError("Google Calendar FreeBusy missing calendars map");
  }

  const entry = calendars[calendarId];
  if (!entry || typeof entry !== "object") {
    throw freeBusyCalendarError("Google Calendar FreeBusy missing requested calendar");
  }

  if (Array.isArray(entry.errors) && entry.errors.length > 0) {
    throw freeBusyCalendarError("Google Calendar FreeBusy returned calendar errors");
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

if (require.main === module) {
  const id = "primary";

  // Legitimate fully-free day
  const emptyBusy = sanitizeBusyIntervals(
    { calendars: { primary: { busy: [] } } },
    id
  );
  if (!Array.isArray(emptyBusy) || emptyBusy.length !== 0) {
    console.error("FAIL legitimate empty busy", emptyBusy);
    process.exit(1);
  }

  // Missing calendar must throw (fail closed — not look fully free)
  let threw = false;
  try {
    sanitizeBusyIntervals({ calendars: {} }, id);
  } catch (e) {
    threw = e && e.code === "FREEBUSY_CALENDAR_ERROR";
  }
  if (!threw) {
    console.error("FAIL missing calendar should throw");
    process.exit(1);
  }

  threw = false;
  try {
    sanitizeBusyIntervals(null, id);
  } catch (e) {
    threw = e && e.code === "FREEBUSY_CALENDAR_ERROR";
  }
  if (!threw) {
    console.error("FAIL null payload should throw");
    process.exit(1);
  }

  threw = false;
  try {
    sanitizeBusyIntervals(
      { calendars: { primary: { errors: [{ reason: "notFound" }] } } },
      id
    );
  } catch (e) {
    threw = e && e.code === "FREEBUSY_CALENDAR_ERROR";
  }
  if (!threw) {
    console.error("FAIL calendar errors should throw");
    process.exit(1);
  }

  const ok = sanitizeBusyIntervals(
    {
      calendars: {
        primary: {
          busy: [{ start: "2026-09-18T12:00:00Z", end: "2026-09-18T13:00:00Z" }],
        },
      },
    },
    id
  );
  if (ok.length !== 1) {
    console.error("FAIL busy parse", ok);
    process.exit(1);
  }

  console.log("OK busy-sanitize selftest");
}
