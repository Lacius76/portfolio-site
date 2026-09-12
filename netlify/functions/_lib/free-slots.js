/**
 * Authoritative free-slot computation for Europe/Budapest booking grid.
 * Mirrors js/booking-calendar.js rules (server-side source for the bot).
 * Read-only — never invents slots outside busy ∩ rules.
 */

const { budapestWallToIso, weekdayMon0 } = require("./budapest-time");

const TZ_DEFAULT = "Europe/Budapest";
const SLOT_START_HOURS = Object.freeze([8, 9, 10, 11, 12, 13, 14, 15]);
const MORNING_HOURS = new Set([8, 9, 10, 11]);
const AFTERNOON_HOURS = new Set([12, 13, 14, 15]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_MAX_SLOTS = 12;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function addDaysToKey(dateKey, delta) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function compareKeys(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function slotOverlapsBusy(busyList, slotStartIso, slotEndIso) {
  const slotStart = Date.parse(slotStartIso);
  const slotEnd = Date.parse(slotEndIso);
  if (Number.isNaN(slotStart) || Number.isNaN(slotEnd)) return true;
  for (const item of busyList || []) {
    if (!item || typeof item !== "object") continue;
    const a = Date.parse(item.start);
    const b = Date.parse(item.end);
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    if (intervalsOverlap(a, b, slotStart, slotEnd)) return true;
  }
  return false;
}

/**
 * Civil "today" YYYY-MM-DD in tz.
 * @param {Date} [now]
 * @param {string} [tz]
 */
function budapestTodayKey(now = new Date(), tz = TZ_DEFAULT) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Current hour (0–23) in tz.
 * @param {Date} [now]
 * @param {string} [tz]
 */
function budapestNowHour(now = new Date(), tz = TZ_DEFAULT) {
  const hourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number(hourStr);
}

function weekdayShort(dateKey, tz) {
  const noonIso = budapestWallToIso(dateKey, 12, 0, tz);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
  }).format(new Date(noonIso));
}

function formatSlotLabel(dateKey, startHour, tz) {
  const noonIso = budapestWallToIso(dateKey, 12, 0, tz);
  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(noonIso));
  const start = `${pad2(startHour)}:00`;
  const end = `${pad2(startHour + 1)}:00`;
  return `${datePart}, ${start}–${end}`;
}

/**
 * @param {"any"|"morning"|"afternoon"|string|undefined} dayPart
 * @returns {Set<number>|null} null = any
 */
function hoursForDayPart(dayPart) {
  if (!dayPart || dayPart === "any") return null;
  if (dayPart === "morning") return MORNING_HOURS;
  if (dayPart === "afternoon") return AFTERNOON_HOURS;
  return null;
}

/**
 * Compute free 1-hour slots in [fromDate, toDate] inclusive.
 *
 * Rules (authoritative):
 * - Europe/Budapest
 * - Mon–Fri only
 * - Starts 08:00–15:00, end = start + 1h
 * - Reject past (start <= now)
 * - Reject overlap with Google busy intervals
 *
 * @param {{
 *   busy: { start: string, end: string }[],
 *   fromDate: string,
 *   toDate: string,
 *   dayPart?: "any"|"morning"|"afternoon",
 *   now?: Date,
 *   timeZone?: string,
 *   maxSlots?: number,
 * }} opts
 * @returns {{ ok: true, timeZone: string, slots: object[] } | { ok: false, error: string }}
 */
function computeFreeSlots(opts) {
  const busy = Array.isArray(opts && opts.busy) ? opts.busy : [];
  const fromDate = opts && opts.fromDate;
  const toDate = opts && opts.toDate;
  const tz = (opts && opts.timeZone) || TZ_DEFAULT;
  const now = opts && opts.now instanceof Date ? opts.now : new Date();
  const maxSlots =
    typeof (opts && opts.maxSlots) === "number" && opts.maxSlots > 0
      ? Math.min(opts.maxSlots, 24)
      : DEFAULT_MAX_SLOTS;

  if (!DATE_RE.test(fromDate || "") || !DATE_RE.test(toDate || "")) {
    return { ok: false, error: "invalid_dates" };
  }
  if (fromDate > toDate) {
    return { ok: false, error: "invalid_range" };
  }

  const dayPartHours = hoursForDayPart(opts && opts.dayPart);
  const today = budapestTodayKey(now, tz);
  const nowHour = budapestNowHour(now, tz);
  const nowMs = now.getTime();

  /** @type {object[]} */
  const slots = [];
  let key = fromDate;

  while (compareKeys(key, toDate) <= 0) {
    const dow = weekdayMon0(key, tz);
    if (dow >= 0 && dow <= 4) {
      for (const hour of SLOT_START_HOURS) {
        if (dayPartHours && !dayPartHours.has(hour)) continue;

        // Past days / today's started hours (align with UI + booking-validate)
        if (compareKeys(key, today) < 0) continue;
        if (key === today && hour <= nowHour) continue;

        const startLocal = `${key}T${pad2(hour)}:00:00`;
        const endLocal = `${key}T${pad2(hour + 1)}:00:00`;
        const startIso = budapestWallToIso(key, hour, 0, tz);
        const endIso = budapestWallToIso(key, hour + 1, 0, tz);
        const startMs = Date.parse(startIso);
        if (Number.isNaN(startMs) || startMs <= nowMs) continue;

        if (slotOverlapsBusy(busy, startIso, endIso)) continue;

        slots.push({
          slot_id: `${key}T${pad2(hour)}:00`,
          start: startLocal,
          end: endLocal,
          label: formatSlotLabel(key, hour, tz),
        });

        if (slots.length >= maxSlots) {
          return { ok: true, timeZone: tz, slots };
        }
      }
    }
    key = addDaysToKey(key, 1);
  }

  return { ok: true, timeZone: tz, slots };
}

module.exports = {
  SLOT_START_HOURS,
  MORNING_HOURS,
  AFTERNOON_HOURS,
  DEFAULT_MAX_SLOTS,
  TZ_DEFAULT,
  computeFreeSlots,
  budapestTodayKey,
  budapestNowHour,
  addDaysToKey,
  slotOverlapsBusy,
  formatSlotLabel,
};

// --- local assertions ---
if (require.main === module) {
  const tz = "Europe/Budapest";
  // Fixed "now": Thursday 2026-09-17 10:30 Budapest ≈ 08:30 UTC (CEST = UTC+2)
  const now = new Date("2026-09-17T08:30:00.000Z");

  // Busy: Thu 11:00–12:00 and Fri 14:00–15:00 Budapest
  const busy = [
    {
      start: "2026-09-17T09:00:00.000Z", // 11:00 CEST
      end: "2026-09-17T10:00:00.000Z",
    },
    {
      start: "2026-09-18T12:00:00.000Z", // 14:00 CEST
      end: "2026-09-18T13:00:00.000Z",
    },
  ];

  const friAfternoon = computeFreeSlots({
    busy,
    fromDate: "2026-09-18",
    toDate: "2026-09-18",
    dayPart: "afternoon",
    now,
    timeZone: tz,
  });
  if (!friAfternoon.ok) {
    console.error("FAIL fri afternoon", friAfternoon);
    process.exit(1);
  }
  const friIds = friAfternoon.slots.map((s) => s.slot_id);
  if (friIds.includes("2026-09-18T14:00")) {
    console.error("FAIL busy afternoon slot should be removed", friIds);
    process.exit(1);
  }
  if (!friIds.includes("2026-09-18T12:00") || !friIds.includes("2026-09-18T15:00")) {
    console.error("FAIL expected free afternoon slots", friIds);
    process.exit(1);
  }

  const weekend = computeFreeSlots({
    busy: [],
    fromDate: "2026-09-19",
    toDate: "2026-09-20",
    now,
    timeZone: tz,
  });
  if (!weekend.ok || weekend.slots.length !== 0) {
    console.error("FAIL weekend should be empty", weekend);
    process.exit(1);
  }

  const todayPast = computeFreeSlots({
    busy,
    fromDate: "2026-09-17",
    toDate: "2026-09-17",
    dayPart: "morning",
    now,
    timeZone: tz,
  });
  // nowHour ~10 → 08–10 past; 11:00 busy → morning free empty
  const morningIds = todayPast.slots.map((s) => s.slot_id);
  if (morningIds.length !== 0) {
    console.error("FAIL expected no free morning slots", morningIds);
    process.exit(1);
  }

  const pastDay = computeFreeSlots({
    busy: [],
    fromDate: "2026-09-10",
    toDate: "2026-09-10",
    now,
    timeZone: tz,
  });
  if (!pastDay.ok || pastDay.slots.length !== 0) {
    console.error("FAIL past day should be empty", pastDay);
    process.exit(1);
  }

  console.log("OK free-slots selftest");
  console.log(
    JSON.stringify(
      {
        friAfternoonSlots: friIds,
        weekendCount: weekend.slots.length,
        todayMorningCount: morningIds.length,
      },
      null,
      2
    )
  );
}
