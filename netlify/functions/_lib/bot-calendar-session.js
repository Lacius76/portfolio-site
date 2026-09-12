/**
 * Signed calendar session for AI-Bot Phase B (offered + selected slots).
 * Server-controlled — client cannot invent verified slots without a valid HMAC.
 * No Google mutation here.
 */

const crypto = require("crypto");

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_VERSION = 1;

/**
 * Signing secret for calendar_session HMAC.
 * REQUIRED: BOT_CALENDAR_STATE_SECRET only — never fall back to OPENAI_API_KEY.
 * @returns {string} empty string if unset (callers must fail closed)
 */
function getSigningSecret() {
  const secret = process.env.BOT_CALENDAR_STATE_SECRET;
  if (typeof secret !== "string" || !secret.trim()) return "";
  return secret.trim();
}

function stableSlot(slot) {
  if (!slot || typeof slot !== "object") return null;
  const slot_id = typeof slot.slot_id === "string" ? slot.slot_id.trim() : "";
  const start = typeof slot.start === "string" ? slot.start.trim() : "";
  const end = typeof slot.end === "string" ? slot.end.trim() : "";
  const label = typeof slot.label === "string" ? slot.label.trim() : "";
  if (!slot_id || !start || !end) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(slot_id)) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(start)) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(end)) return null;
  return { slot_id, start, end, label: label || slot_id };
}

function canonicalPayload(session) {
  return JSON.stringify({
    v: session.v,
    exp: session.exp,
    offered: session.offered,
    selected: session.selected,
  });
}

function signSession({ offered, selected = null, now = Date.now() }) {
  const secret = getSigningSecret();
  if (!secret) return null;

  const cleanOffered = [];
  for (const s of Array.isArray(offered) ? offered : []) {
    const c = stableSlot(s);
    if (c) cleanOffered.push(c);
  }

  const payload = {
    v: SESSION_VERSION,
    exp: now + SESSION_TTL_MS,
    offered: cleanOffered,
    selected: selected ? stableSlot(selected) : null,
  };

  const sig = crypto
    .createHmac("sha256", secret)
    .update(canonicalPayload(payload))
    .digest("hex");

  return { ...payload, sig };
}

/**
 * @returns {{ ok: true, session: object } | { ok: false, reason: string }}
 */
function verifySession(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "missing" };
  }
  const secret = getSigningSecret();
  if (!secret) {
    return { ok: false, reason: "no_secret" };
  }

  const offered = [];
  for (const s of Array.isArray(raw.offered) ? raw.offered : []) {
    const c = stableSlot(s);
    if (c) offered.push(c);
  }

  const selected = raw.selected ? stableSlot(raw.selected) : null;
  const exp = typeof raw.exp === "number" ? raw.exp : 0;
  const v = raw.v;
  const sig = typeof raw.sig === "string" ? raw.sig : "";

  if (v !== SESSION_VERSION || !sig || offered.length === 0) {
    return { ok: false, reason: "invalid" };
  }
  if (exp < now) {
    return { ok: false, reason: "expired" };
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(
      canonicalPayload({
        v: SESSION_VERSION,
        exp,
        offered,
        selected,
      })
    )
    .digest("hex");

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_sig" };
  }

  // Selected must be one of offered if present
  if (selected) {
    const inOffered = offered.some((s) => s.slot_id === selected.slot_id);
    if (!inOffered) {
      return { ok: false, reason: "selected_not_offered" };
    }
  }

  return {
    ok: true,
    session: { v: SESSION_VERSION, exp, offered, selected, sig },
  };
}

function looksLikeSlotSelection(message) {
  if (!message || typeof message !== "string") return false;
  // Fresh availability asks should not be treated as selection
  if (
    /\b(available|availability|free\s+slot|is\b.+\bfree|next\s+week|tomorrow)\b/i.test(
      message
    ) &&
    !/\b(works|like|first|second|third|that one|this one)\b/i.test(message)
  ) {
    // e.g. "Is Friday free?" — availability, not selection
    if (!/\b\d{1,2}(:00)?\b/.test(message) && !/\b(first|second|third|that one)\b/i.test(message)) {
      return false;
    }
  }

  return (
    /\b(first|second|third|1st|2nd|3rd)\b/i.test(message) ||
    /\bthat one\b/i.test(message) ||
    /\bthis one\b/i.test(message) ||
    /\bworks for me\b/i.test(message) ||
    /\bi(?:'d| would) like\b/i.test(message) ||
    /\blet'?s use\b/i.test(message) ||
    /\bgo with\b/i.test(message) ||
    /\b\d{1,2}:00\b/.test(message) ||
    /^\s*\d{1,2}(:00)?\s*[.!]?\s*$/i.test(message)
  );
}

/**
 * Resolve user message against verified offered slots only.
 * @returns {{ status: "resolved", slot: object } | { status: "ambiguous", candidates: object[] } | { status: "not_offered" } | { status: "none" }}
 */
function resolveSlotSelection(message, offered) {
  const list = Array.isArray(offered) ? offered.map(stableSlot).filter(Boolean) : [];
  if (!list.length || !message) return { status: "none" };

  const lower = message.toLowerCase();

  // Ordinal
  const ordinalMap = {
    first: 0,
    "1st": 0,
    second: 1,
    "2nd": 1,
    third: 2,
    "3rd": 2,
  };
  for (const [word, idx] of Object.entries(ordinalMap)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(message)) {
      if (idx >= 0 && idx < list.length) {
        return { status: "resolved", slot: list[idx] };
      }
      return { status: "not_offered" };
    }
  }

  if (/\bthat one\b/i.test(message) || /\bthis one\b/i.test(message)) {
    if (list.length === 1) return { status: "resolved", slot: list[0] };
    return { status: "ambiguous", candidates: list };
  }

  // Hours like 15:00 or bare 15
  const hourMatches = [];
  const re = /\b([01]?\d|2[0-3])(?::00)?\b/g;
  let m;
  while ((m = re.exec(message)) !== null) {
    const h = Number(m[1]);
    if (h >= 8 && h <= 15) hourMatches.push(h);
  }
  const uniqueHours = [...new Set(hourMatches)];

  if (uniqueHours.length === 1) {
    const h = uniqueHours[0];
    const pad = String(h).padStart(2, "0");
    const hits = list.filter((s) => s.slot_id.endsWith(`T${pad}:00`));
    if (hits.length === 1) return { status: "resolved", slot: hits[0] };
    if (hits.length > 1) return { status: "ambiguous", candidates: hits };
    return { status: "not_offered" };
  }

  if (uniqueHours.length > 1) {
    return { status: "ambiguous", candidates: list };
  }

  // Exact slot_id mention
  for (const s of list) {
    if (lower.includes(s.slot_id.toLowerCase())) {
      return { status: "resolved", slot: s };
    }
  }

  if (looksLikeSlotSelection(message)) {
    return { status: "ambiguous", candidates: list };
  }

  return { status: "none" };
}

function selectionReply(slot) {
  const label = slot.label || `${slot.start}–${slot.end}`;
  return (
    `${label} is currently available. It has not been reserved. ` +
    `Would you like to arrange the meeting with László?`
  );
}

function ambiguousReply(candidates) {
  const lines = (candidates || [])
    .slice(0, 8)
    .map((s, i) => `${i + 1}) ${s.label || s.slot_id}`)
    .join(" ");
  return (
    `I need a clearer choice from the verified open slots: ${lines}. ` +
    `Please name one (for example “15:00” or “the first one”).`
  );
}

function notOfferedReply() {
  return (
    "That time was not in the verified open slots from the last calendar check. " +
    "Please pick one of the listed times, or ask me to check availability again."
  );
}

module.exports = {
  SESSION_TTL_MS,
  SESSION_VERSION,
  signSession,
  verifySession,
  stableSlot,
  looksLikeSlotSelection,
  resolveSlotSelection,
  selectionReply,
  ambiguousReply,
  notOfferedReply,
};

if (require.main === module) {
  const results = [];
  function check(name, ok, detail) {
    results.push({ name, ok: !!ok });
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`);
  }

  // Fail closed without BOT_CALENDAR_STATE_SECRET (no OPENAI_API_KEY fallback)
  const savedSecret = process.env.BOT_CALENDAR_STATE_SECRET;
  const savedOpenAI = process.env.OPENAI_API_KEY;
  delete process.env.BOT_CALENDAR_STATE_SECRET;
  process.env.OPENAI_API_KEY = "should-not-be-used-as-calendar-secret";
  check(
    "missing BOT_CALENDAR_STATE_SECRET → signSession null",
    signSession({
      offered: [
        {
          slot_id: "2026-09-18T15:00",
          start: "2026-09-18T15:00:00",
          end: "2026-09-18T16:00:00",
          label: "x",
        },
      ],
    }) === null
  );
  check(
    "missing BOT_CALENDAR_STATE_SECRET → verify fails (no OpenAI fallback)",
    verifySession({
      v: 1,
      exp: Date.now() + 999999,
      offered: [],
      selected: null,
      sig: "x",
    }).ok === false
  );
  delete process.env.OPENAI_API_KEY;
  if (savedOpenAI !== undefined) process.env.OPENAI_API_KEY = savedOpenAI;
  process.env.BOT_CALENDAR_STATE_SECRET =
    savedSecret && String(savedSecret).trim()
      ? savedSecret
      : "test-secret-phase-b";

  const offered = [
    {
      slot_id: "2026-09-18T12:00",
      start: "2026-09-18T12:00:00",
      end: "2026-09-18T13:00:00",
      label: "Fri 18 Sep, 12:00–13:00",
    },
    {
      slot_id: "2026-09-18T13:00",
      start: "2026-09-18T13:00:00",
      end: "2026-09-18T14:00:00",
      label: "Fri 18 Sep, 13:00–14:00",
    },
    {
      slot_id: "2026-09-18T15:00",
      start: "2026-09-18T15:00:00",
      end: "2026-09-18T16:00:00",
      label: "Fri 18 Sep, 15:00–16:00",
    },
  ];

  const signed = signSession({ offered });
  check("signSession with secret", !!signed && typeof signed.sig === "string");
  check("verifySession ok", verifySession(signed).ok === true);

  const tamperedOffered = {
    ...signed,
    offered: [
      ...offered,
      {
        slot_id: "2026-09-18T11:00",
        start: "2026-09-18T11:00:00",
        end: "2026-09-18T12:00:00",
        label: "fake",
      },
    ],
  };
  check("client-modified offered[] fails verify", verifySession(tamperedOffered).ok === false);

  const tamperedSelected = {
    ...signed,
    selected: {
      slot_id: "2026-09-18T11:00",
      start: "2026-09-18T11:00:00",
      end: "2026-09-18T12:00:00",
      label: "injected",
    },
  };
  check(
    "injected selected not in offered fails",
    verifySession(tamperedSelected).ok === false
  );

  const expired = signSession({
    offered,
    now: Date.now() - SESSION_TTL_MS - 1000,
  });
  check("expired session rejected", verifySession(expired).ok === false);

  const badStart = stableSlot({
    slot_id: "2026-09-18T15:00",
    start: "2026-09-18T15:30:00",
    end: "2026-09-18T16:00:00",
    label: "bad",
  });
  check("arbitrary non-grid start rejected by stableSlot", badStart === null);

  const r15 = resolveSlotSelection("15:00 works for me.", offered);
  check(
    "resolve 15:00 from offered only",
    r15.status === "resolved" && r15.slot.slot_id === "2026-09-18T15:00"
  );
  check(
    "not offered hour rejected",
    resolveSlotSelection("11:00 please", offered).status === "not_offered"
  );

  const src = require("fs").readFileSync(__filename, "utf8");
  check("session lib has no console.log of secret/PII paths", !/console\.log\(.*SECRET|console\.log\(.*email|console\.log\(.*password/i.test(src));
  check(
    "getSigningSecret does not use OPENAI_API_KEY",
    !/OPENAI_API_KEY/.test(
      src.slice(src.indexOf("function getSigningSecret"), src.indexOf("function stableSlot"))
    )
  );

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("FAILED", failed.map((f) => f.name));
    process.exit(1);
  }
  console.log("OK bot-calendar-session security selftest");
}
