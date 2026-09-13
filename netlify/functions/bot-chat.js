/**
 * POST /.netlify/functions/bot-chat
 *
 * OpenAI Responses API proxy for AI-Bot 9000.
 * OPENAI_API_KEY stays server-side.
 *
 * Explicit portfolio navigation is DETERMINISTIC (no OpenAI).
 * Phase A calendar: check_availability → FreeBusy + free-slots (read-only).
 * Phase B: signed offered-slot session → select slot → YES/NO + modal details.
 * No booking / events.insert. No hosted OpenAI tools. No web search.
 */

const { buildInstructions } = require("./_lib/bot-prompts");
const {
  SHOW_PROJECT_TOOL,
  resolveProject,
  allowedNavigatePaths,
} = require("./_lib/bot-projects");
const {
  shouldForceShowProject,
  inferProjectId,
} = require("./_lib/bot-nav-intent");
const { shouldForceCheckAvailability } = require("./_lib/bot-calendar-intent");
const { CHECK_AVAILABILITY_TOOL } = require("./_lib/bot-calendar-tool");
const {
  queryBusyRange,
  validateDateRange,
  DATE_RE,
} = require("./_lib/calendar-query");
const {
  computeFreeSlots,
  budapestTodayKey,
  addDaysToKey,
  TZ_DEFAULT,
} = require("./_lib/free-slots");
const { weekdayMon0 } = require("./_lib/budapest-time");
const {
  signSession,
  verifySession,
  resolveSlotSelection,
  selectionReply,
  ambiguousReply,
  notOfferedReply,
} = require("./_lib/bot-calendar-session");

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5.6-luna";
const MAX_OUTPUT_TOKENS = 200;
const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_TURNS = 4;
const BOT_AVAILABILITY_MAX_RANGE_DAYS = 14;
const BOT_AVAILABILITY_MAX_SLOTS = 12;

const FORCE_CHECK_AVAILABILITY = {
  type: "function",
  name: "check_availability",
};

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
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

function normalizeSkin(skin) {
  if (skin === "classic" || skin === "first") return skin;
  return "hal";
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const out = [];
  for (const item of history.slice(-MAX_HISTORY_TURNS * 2)) {
    if (!item || typeof item !== "object") continue;
    const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
    const content = typeof item.content === "string" ? item.content.trim() : "";
    if (!role || !content) continue;
    out.push({
      role,
      content: content.slice(0, MAX_MESSAGE_CHARS),
    });
  }
  return out;
}

/** Extract plain text from a Responses API payload. */
function extractReplyText(data) {
  if (!data || typeof data !== "object") return "";
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts = [];
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (!item || item.type !== "message") continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const block of content) {
      if (block && block.type === "output_text" && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
  }
  return parts.join("\n").trim();
}

/** @returns {Array<{ call_id: string, name: string, arguments: string }>} */
function extractFunctionCalls(data) {
  const output = data && Array.isArray(data.output) ? data.output : [];
  const calls = [];
  for (const item of output) {
    if (!item || item.type !== "function_call") continue;
    if (typeof item.call_id !== "string" || typeof item.name !== "string") continue;
    let args = "";
    if (typeof item.arguments === "string") {
      args = item.arguments;
    } else if (item.arguments && typeof item.arguments === "object") {
      try {
        args = JSON.stringify(item.arguments);
      } catch (_) {
        args = "";
      }
    }
    calls.push({
      call_id: item.call_id,
      name: item.name,
      arguments: args,
    });
  }
  return calls;
}

/**
 * Resolve navigate action from message intent + PROJECT_ALLOWLIST only.
 * @param {string} message
 * @returns {{ type: "navigate", path: string, label: string } | null}
 */
function resolveNavigateAction(message) {
  if (!shouldForceShowProject(message)) return null;
  const projectId = inferProjectId(message);
  const resolved = resolveProject(projectId);
  if (!resolved) return null;
  if (!allowedNavigatePaths().includes(resolved.path)) return null;
  if (
    resolved.path.includes("://") ||
    resolved.path.startsWith("//") ||
    resolved.path.includes("..") ||
    resolved.path.includes("/")
  ) {
    return null;
  }
  return {
    type: "navigate",
    path: resolved.path,
    label: resolved.label,
  };
}

function cannedNavReply(label) {
  return `Opening László's ${label} case study...`;
}

function buildTodayContext(now = new Date()) {
  const tz = process.env.BOOKING_TZ || TZ_DEFAULT;
  const today = budapestTodayKey(now, tz);
  const dow = weekdayMon0(today, tz);
  const name = WEEKDAY_NAMES[dow] || "unknown";
  return `TODAY (Europe/Budapest): ${today} (${name}). All availability dates must be civil dates in this timezone.`;
}

/**
 * Validate / clamp model-supplied availability args. Never trusts calendar ID or TZ from model.
 * @returns {{ ok: true, fromDate: string, toDate: string, dayPart: string } | { ok: false, error: string }}
 */
function normalizeAvailabilityArgs(rawArgs, now = new Date()) {
  let parsed;
  try {
    parsed =
      typeof rawArgs === "string"
        ? JSON.parse(rawArgs || "{}")
        : rawArgs && typeof rawArgs === "object"
          ? rawArgs
          : null;
  } catch (_) {
    return { ok: false, error: "invalid_arguments" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "invalid_arguments" };
  }

  let fromDate = typeof parsed.from_date === "string" ? parsed.from_date.trim() : "";
  let toDate = typeof parsed.to_date === "string" ? parsed.to_date.trim() : "";
  let dayPart = typeof parsed.day_part === "string" ? parsed.day_part.trim() : "any";
  if (!["any", "morning", "afternoon"].includes(dayPart)) {
    dayPart = "any";
  }

  if (!DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) {
    return { ok: false, error: "invalid_dates" };
  }

  const tz = process.env.BOOKING_TZ || TZ_DEFAULT;
  const today = budapestTodayKey(now, tz);

  // Clamp past start to today (past free slots are empty anyway)
  if (fromDate < today) fromDate = today;
  if (toDate < fromDate) toDate = fromDate;

  // Cap range
  const maxTo = addDaysToKey(fromDate, BOT_AVAILABILITY_MAX_RANGE_DAYS);
  if (toDate > maxTo) toDate = maxTo;

  const rangeErr = validateDateRange(fromDate, toDate, BOT_AVAILABILITY_MAX_RANGE_DAYS);
  if (rangeErr) {
    return { ok: false, error: "invalid_range" };
  }

  return { ok: true, fromDate, toDate, dayPart };
}

/**
 * Execute check_availability against real FreeBusy + free-slot rules.
 */
async function runCheckAvailability(rawArgs, now = new Date()) {
  const normalized = normalizeAvailabilityArgs(rawArgs, now);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  try {
    const { busy, timeZone } = await queryBusyRange({
      from: normalized.fromDate,
      to: normalized.toDate,
    });
    const result = computeFreeSlots({
      busy,
      fromDate: normalized.fromDate,
      toDate: normalized.toDate,
      dayPart: normalized.dayPart,
      now,
      timeZone,
      maxSlots: BOT_AVAILABILITY_MAX_SLOTS,
    });
    if (!result.ok) {
      return { ok: false, error: result.error || "unavailable" };
    }
    return {
      ok: true,
      timeZone: result.timeZone,
      from_date: normalized.fromDate,
      to_date: normalized.toDate,
      day_part: normalized.dayPart,
      slots: result.slots,
    };
  } catch (_) {
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Apply function calls; mutate input with call + outputs for follow-up turn.
 * Phase A/B: only check_availability is executed (read-only).
 * @returns {{ needsFollowUp: boolean, availabilityResult: object|null }}
 */
async function applyFunctionCalls(data, input, now = new Date()) {
  const calls = extractFunctionCalls(data);
  if (!calls.length) {
    return { needsFollowUp: false, availabilityResult: null };
  }

  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (item && item.type === "function_call") {
      input.push(item);
    }
  }

  /** @type {object|null} */
  let availabilityResult = null;

  for (const call of calls) {
    if (call.name === "check_availability") {
      const result = await runCheckAvailability(call.arguments, now);
      availabilityResult = result;
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
      continue;
    }

    // No mutating tools. Reject unknown / unused.
    input.push({
      type: "function_call_output",
      call_id: call.call_id,
      output: JSON.stringify({ ok: false, error: "unsupported_tool" }),
    });
  }

  return { needsFollowUp: true, availabilityResult };
}

async function callResponsesApi(apiKey, payload) {
  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  return { res, data };
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
    return json(405, { error: "method_not_allowed" });
  }

  const body = parseJsonBody(event);
  if (!body || typeof body !== "object") {
    return json(400, { error: "invalid_json" });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const selectSlotId =
    typeof body.select_slot_id === "string" ? body.select_slot_id.trim() : "";
  const refreshRaw = body.refresh_availability;
  const wantsRefresh =
    refreshRaw === true || (refreshRaw && typeof refreshRaw === "object");

  if (!message && !selectSlotId && !wantsRefresh) {
    return json(400, { error: "empty_message" });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return json(400, { error: "message_too_long" });
  }

  // Explicit nav: canned reply + allowlisted action. Never call OpenAI / Calendar.
  if (message) {
    const nav = resolveNavigateAction(message);
    if (nav) {
      return json(200, {
        reply: cannedNavReply(nav.label),
        action: { type: "navigate", path: nav.path },
      });
    }
  }

  const forceCalendar = message ? shouldForceCheckAvailability(message) : false;
  const verified = verifySession(body.calendar_session);

  // Clickable chip selection — no OpenAI; slot_id must be in signed offered[].
  if (selectSlotId) {
    if (!verified.ok) {
      return json(403, {
        reply:
          "Your availability session expired or is invalid. Please ask me to check László’s calendar again.",
        error: verified.reason === "expired" ? "session_expired" : "session_invalid",
      });
    }
    const match = verified.session.offered.find((s) => s.slot_id === selectSlotId);
    if (!match) {
      return json(200, {
        reply: notOfferedReply(),
        calendar_session: verified.session,
      });
    }
    const nextSession = signSession({
      offered: verified.session.offered,
      selected: match,
    });
    return json(200, {
      reply: selectionReply(match),
      action: {
        type: "booking_intent_prompt",
        selected_slot: match,
      },
      calendar_session: nextSession,
    });
  }

  // Fresh FreeBusy refresh (race-condition recovery) — no OpenAI, no stale booking.
  if (wantsRefresh) {
    const opts = refreshRaw === true ? {} : refreshRaw;
    let fromDate =
      typeof opts.from_date === "string" ? opts.from_date.trim() : "";
    let toDate = typeof opts.to_date === "string" ? opts.to_date.trim() : "";
    const dayPart =
      typeof opts.day_part === "string" ? opts.day_part.trim() : "any";

    if (!DATE_RE.test(fromDate)) {
      // Prefer day of previous selected/offered if present
      const hint =
        (verified.ok &&
          verified.session.selected &&
          verified.session.selected.start &&
          verified.session.selected.start.slice(0, 10)) ||
        (verified.ok &&
          verified.session.offered[0] &&
          verified.session.offered[0].start &&
          verified.session.offered[0].start.slice(0, 10)) ||
        budapestTodayKey();
      fromDate = hint;
    }
    if (!DATE_RE.test(toDate)) {
      toDate = fromDate;
    }

    const avail = await runCheckAvailability(
      JSON.stringify({
        from_date: fromDate,
        to_date: toDate,
        day_part: ["any", "morning", "afternoon"].includes(dayPart)
          ? dayPart
          : "any",
      })
    );

    if (!avail.ok) {
      return json(200, {
        reply:
          "I couldn't refresh László's real calendar just now. Please try again in a moment.",
        error: avail.error || "unavailable",
      });
    }

    const signed = signSession({
      offered: avail.slots,
      selected: null,
    });
    const count = avail.slots.length;
    const reply =
      count === 0
        ? `I checked again for ${fromDate}${fromDate !== toDate ? `–${toDate}` : ""} (Europe/Budapest). There are no open 1-hour slots in that window right now.`
        : `I checked again. These ${count} slot(s) are currently available (Europe/Budapest) — not reserved. Tap one to continue:`;

    const payload = {
      reply,
      action: {
        type: "offer_slots",
        slots: signed && Array.isArray(signed.offered) ? signed.offered : [],
      },
    };
    // Fresh session only when Google returned signed free slots; otherwise clear stale booking state.
    if (signed && signed.offered.length > 0) {
      payload.calendar_session = signed;
    } else {
      payload.calendar_session = null;
    }
    return json(200, payload);
  }

  // Phase B: resolve slot selection against signed offered slots (no Google mutation).
  if (!forceCalendar && verified.ok && message) {
    const selection = resolveSlotSelection(message, verified.session.offered);
    if (selection.status === "resolved") {
      const nextSession = signSession({
        offered: verified.session.offered,
        selected: selection.slot,
      });
      return json(200, {
        reply: selectionReply(selection.slot),
        action: {
          type: "booking_intent_prompt",
          selected_slot: selection.slot,
        },
        calendar_session: nextSession,
      });
    }
    if (selection.status === "ambiguous") {
      return json(200, {
        reply: ambiguousReply(selection.candidates),
        calendar_session: verified.session,
      });
    }
    if (selection.status === "not_offered") {
      return json(200, {
        reply: notOfferedReply(),
        calendar_session: verified.session,
      });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(503, { error: "openai_not_configured" });
  }

  const skin = normalizeSkin(body.skin);
  const history = sanitizeHistory(body.history);
  const instructions = `${buildInstructions(skin)}\n\n${buildTodayContext()}`;

  /** @type {Array<object>} */
  const input = [];
  for (const turn of history) {
    input.push({ role: turn.role, content: turn.content });
  }
  input.push({ role: "user", content: message });

  const tools = [SHOW_PROJECT_TOOL, CHECK_AVAILABILITY_TOOL];
  const toolChoice = forceCalendar ? FORCE_CHECK_AVAILABILITY : "none";

  const basePayload = {
    model: MODEL,
    instructions,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    tools,
  };

  try {
    let { res, data } = await callResponsesApi(apiKey, {
      ...basePayload,
      input,
      tool_choice: toolChoice,
    });

    if (!res.ok) {
      const code = res.status === 429 ? 429 : 502;
      return json(code, {
        error: res.status === 429 ? "rate_limited" : "openai_error",
      });
    }

    const toolResult = await applyFunctionCalls(data, input);
    if (forceCalendar && !toolResult.needsFollowUp) {
      return json(200, {
        reply:
          "I couldn't check László's real calendar just now. Please try again in a moment, or use the booking calendar on the contact page.",
      });
    }
    if (toolResult.needsFollowUp) {
      const follow = await callResponsesApi(apiKey, {
        ...basePayload,
        tool_choice: "none",
        input,
      });
      if (follow.res.ok && follow.data) {
        data = follow.data;
      }
    }

    let reply = extractReplyText(data);
    if (!reply) {
      return json(502, { error: "empty_reply" });
    }

    // Soften any reserved/booked claims after availability (Phase A wording).
    if (
      toolResult.availabilityResult &&
      toolResult.availabilityResult.ok &&
      /reserved|booked|confirmed|the slot is yours/i.test(reply)
    ) {
      reply = reply.replace(/reserved|booked|confirmed|the slot is yours/gi, "currently available");
    }

    /** @type {object|undefined} */
    let calendar_session;
    if (
      toolResult.availabilityResult &&
      toolResult.availabilityResult.ok &&
      Array.isArray(toolResult.availabilityResult.slots)
    ) {
      const signed = signSession({
        offered: toolResult.availabilityResult.slots,
        selected: null,
      });
      if (signed) calendar_session = signed;
    } else if (verified.ok) {
      calendar_session = verified.session;
    }

    const payload = { reply };
    if (calendar_session) {
      payload.calendar_session = calendar_session;
      if (
        toolResult.availabilityResult &&
        toolResult.availabilityResult.ok &&
        Array.isArray(calendar_session.offered) &&
        calendar_session.offered.length > 0
      ) {
        payload.action = {
          type: "offer_slots",
          slots: calendar_session.offered,
        };
      }
    }
    return json(200, payload);
  } catch (_) {
    return json(502, { error: "openai_unreachable" });
  }
};

// --- local assertions (no live Google / OpenAI) ---
if (require.main === module) {
  const { shouldForceCheckAvailability: forceCal } = require("./_lib/bot-calendar-intent");

  if (forceCal("Is László free Friday afternoon?") !== true) {
    console.error("FAIL force calendar Friday");
    process.exit(1);
  }
  if (forceCal("Tell me about László's Siemens work.") !== false) {
    console.error("FAIL siemens should not force calendar");
    process.exit(1);
  }

  const nav = resolveNavigateAction("Show me László's HMI work.");
  if (!nav || nav.path !== "case-study-siemens.html") {
    console.error("FAIL nav still required", nav);
    process.exit(1);
  }

  const norm = normalizeAvailabilityArgs(
    JSON.stringify({
      from_date: "2020-01-01",
      to_date: "2030-12-31",
      day_part: "afternoon",
    }),
    new Date("2026-09-17T08:30:00.000Z")
  );
  if (!norm.ok || norm.fromDate !== "2026-09-17" || norm.dayPart !== "afternoon") {
    console.error("FAIL normalize clamp", norm);
    process.exit(1);
  }
  // Range capped to 14 days from clamped from
  if (norm.toDate !== "2026-10-01") {
    console.error("FAIL normalize range cap", norm);
    process.exit(1);
  }

  // Simulated FreeBusy failure path: runCheckAvailability without env → unavailable
  // (skip live call; unit free-slots already covers slot math)

  process.env.BOT_CALENDAR_STATE_SECRET =
    process.env.BOT_CALENDAR_STATE_SECRET || "test-secret-phase-b";
  const offered = [
    {
      slot_id: "2026-09-18T12:00",
      start: "2026-09-18T12:00:00",
      end: "2026-09-18T13:00:00",
      label: "Fri 18 Sep, 12:00–13:00",
    },
    {
      slot_id: "2026-09-18T15:00",
      start: "2026-09-18T15:00:00",
      end: "2026-09-18T16:00:00",
      label: "Fri 18 Sep, 15:00–16:00",
    },
  ];
  const signed = signSession({ offered });
  const v = verifySession(signed);
  if (!v.ok) {
    console.error("FAIL session sign/verify", v);
    process.exit(1);
  }
  const picked = resolveSlotSelection("15:00 works for me.", offered);
  if (picked.status !== "resolved" || picked.slot.slot_id !== "2026-09-18T15:00") {
    console.error("FAIL phase B resolve", picked);
    process.exit(1);
  }

  // Chip path: slot_id must resolve only against signed offered (no invent).
  const chipMatch = v.session.offered.find((s) => s.slot_id === "2026-09-18T15:00");
  if (!chipMatch) {
    console.error("FAIL chip offered lookup");
    process.exit(1);
  }
  const forged = v.session.offered.find((s) => s.slot_id === "2026-09-18T03:00");
  if (forged) {
    console.error("FAIL forged slot should not be in offered");
    process.exit(1);
  }
  const afterSelect = signSession({
    offered: v.session.offered,
    selected: chipMatch,
  });
  const v2 = verifySession(afterSelect);
  if (!v2.ok || !v2.session.selected || v2.session.selected.slot_id !== "2026-09-18T15:00") {
    console.error("FAIL chip select session", v2);
    process.exit(1);
  }
  // Refresh clears selection
  const afterRefresh = signSession({
    offered: v.session.offered,
    selected: null,
  });
  const v3 = verifySession(afterRefresh);
  if (!v3.ok || v3.session.selected !== null) {
    console.error("FAIL refresh clear selected", v3);
    process.exit(1);
  }

  console.log("OK bot-chat calendar Phase A+B selftest");
  console.log(
    JSON.stringify(
      {
        forceCalendarExample: "Is László free Friday afternoon?",
        noCalendarExample: "Tell me about László's Siemens work.",
        phaseBSelection: {
          message: "15:00 works for me.",
          action: {
            type: "booking_intent_prompt",
            selected_slot: picked.slot,
          },
          reply: selectionReply(picked.slot),
        },
        exampleToolResult: {
          ok: true,
          timeZone: "Europe/Budapest",
          slots: [
            {
              slot_id: "2026-09-18T15:00",
              start: "2026-09-18T15:00:00",
              end: "2026-09-18T16:00:00",
              label: "Fri 18 Sep, 15:00–16:00",
            },
          ],
        },
      },
      null,
      2
    )
  );
}
