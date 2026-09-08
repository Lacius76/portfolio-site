/**
 * Europe/Budapest wall-time helpers for booking functions.
 * No secrets. No logging of tokens.
 */

function parseDateParts(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

/**
 * Resolve GMT offset minutes for a Budapest civil day (midday probe).
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} tz
 * @returns {number}
 */
function budapestOffsetMinutes(dateStr, tz) {
  const { y, m, d } = parseDateParts(dateStr);
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

  const raw = parts.timeZoneName || "GMT+1";
  const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) return 60;
  const sign = match[1] === "-" ? -1 : 1;
  const hh = Number(match[2]);
  const mm = Number(match[3] || "0");
  return sign * (hh * 60 + mm);
}

/**
 * Wall time in tz → UTC ISO string.
 * @param {string} dateStr YYYY-MM-DD
 * @param {number} hour
 * @param {number} minute
 * @param {string} tz
 */
function budapestWallToIso(dateStr, hour, minute, tz) {
  const { y, m, d } = parseDateParts(dateStr);
  const offsetMin = budapestOffsetMinutes(dateStr, tz);
  const utcMs = Date.UTC(y, m - 1, d, hour, minute, 0) - offsetMin * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/**
 * Weekday Mon=0 … Sun=6 for a Budapest civil date.
 */
function weekdayMon0(dateStr, tz) {
  const noonIso = budapestWallToIso(dateStr, 12, 0, tz);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(new Date(noonIso));
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[wd] ?? -1;
}

module.exports = {
  budapestOffsetMinutes,
  budapestWallToIso,
  weekdayMon0,
};
