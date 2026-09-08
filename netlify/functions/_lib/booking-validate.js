/**
 * Server-side booking request validation.
 * Never trusts frontend slot values beyond raw strings to re-check.
 */

const { budapestWallToIso, weekdayMon0 } = require("./budapest-time");

const LOCAL_DT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_START_HOURS = new Set([8, 9, 10, 11, 12, 13, 14, 15]);

const LIMITS = {
  name: 100,
  email: 254,
  message: 2000,
};

function stripControls(value) {
  return String(value).replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function sanitizePlain(value, maxLen) {
  const cleaned = stripControls(value).replace(/\s+/g, " ");
  if (cleaned.length > maxLen) return cleaned.slice(0, maxLen);
  return cleaned;
}

function sanitizeMessage(value, maxLen) {
  const cleaned = stripControls(value);
  if (cleaned.length > maxLen) return cleaned.slice(0, maxLen);
  return cleaned;
}

/**
 * @param {unknown} body
 * @param {string} tz - BOOKING_TZ
 * @returns {{ ok: true, data: object } | { ok: false, code: string }}
 */
function validateBookingBody(body, tz) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, code: "validation" };
  }

  const startRaw = typeof body.start === "string" ? body.start.trim() : "";
  const endRaw = typeof body.end === "string" ? body.end.trim() : "";
  const clientTz = typeof body.timeZone === "string" ? body.timeZone.trim() : "";

  if (clientTz && clientTz !== tz) {
    return { ok: false, code: "validation" };
  }

  const startMatch = LOCAL_DT_RE.exec(startRaw);
  const endMatch = LOCAL_DT_RE.exec(endRaw);
  if (!startMatch || !endMatch) {
    return { ok: false, code: "validation" };
  }

  const sy = Number(startMatch[1]);
  const sm = Number(startMatch[2]);
  const sd = Number(startMatch[3]);
  const sh = Number(startMatch[4]);
  const smin = Number(startMatch[5]);
  const ssec = Number(startMatch[6]);

  const ey = Number(endMatch[1]);
  const em = Number(endMatch[2]);
  const ed = Number(endMatch[3]);
  const eh = Number(endMatch[4]);
  const emin = Number(endMatch[5]);
  const esec = Number(endMatch[6]);

  if (smin !== 0 || ssec !== 0 || emin !== 0 || esec !== 0) {
    return { ok: false, code: "validation" };
  }
  if (!ALLOWED_START_HOURS.has(sh)) {
    return { ok: false, code: "validation" };
  }

  // Same calendar day, end = start + 1 hour (15:00 → 16:00)
  if (sy !== ey || sm !== em || sd !== ed) {
    return { ok: false, code: "validation" };
  }
  if (eh !== sh + 1) {
    return { ok: false, code: "validation" };
  }

  // Valid civil date (reject 2026-02-31 etc.)
  const probe = new Date(Date.UTC(sy, sm - 1, sd));
  if (
    probe.getUTCFullYear() !== sy ||
    probe.getUTCMonth() + 1 !== sm ||
    probe.getUTCDate() !== sd
  ) {
    return { ok: false, code: "validation" };
  }

  const dateKey = `${String(sy).padStart(4, "0")}-${String(sm).padStart(2, "0")}-${String(sd).padStart(2, "0")}`;
  const dow = weekdayMon0(dateKey, tz);
  if (dow < 0 || dow > 4) {
    return { ok: false, code: "validation" };
  }

  const startIso = budapestWallToIso(dateKey, sh, 0, tz);
  const endIso = budapestWallToIso(dateKey, eh, 0, tz);
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return { ok: false, code: "validation" };
  }
  if (startMs <= Date.now()) {
    return { ok: false, code: "validation" };
  }

  const name = sanitizePlain(body.name == null ? "" : body.name, LIMITS.name);
  const email = sanitizePlain(body.email == null ? "" : body.email, LIMITS.email).toLowerCase();
  const message = sanitizeMessage(body.message == null ? "" : body.message, LIMITS.message);

  if (!name || name.length < 1) {
    return { ok: false, code: "validation" };
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, code: "validation" };
  }

  return {
    ok: true,
    data: {
      dateKey,
      startHour: sh,
      endHour: eh,
      startLocal: `${dateKey}T${String(sh).padStart(2, "0")}:00:00`,
      endLocal: `${dateKey}T${String(eh).padStart(2, "0")}:00:00`,
      startIso,
      endIso,
      timeZone: tz,
      name,
      email,
      message,
    },
  };
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function slotOverlapsBusy(busyList, slotStartIso, slotEndIso) {
  const slotStart = Date.parse(slotStartIso);
  const slotEnd = Date.parse(slotEndIso);
  if (Number.isNaN(slotStart) || Number.isNaN(slotEnd)) return true;
  for (const item of busyList) {
    const a = Date.parse(item.start);
    const b = Date.parse(item.end);
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    if (intervalsOverlap(a, b, slotStart, slotEnd)) return true;
  }
  return false;
}

module.exports = {
  validateBookingBody,
  slotOverlapsBusy,
  LIMITS,
};
