/**
 * POST /.netlify/functions/bot-chat
 *
 * OpenAI Responses API proxy for AI-Bot 9000.
 * OPENAI_API_KEY stays server-side.
 *
 * Explicit portfolio navigation is DETERMINISTIC (no OpenAI).
 * Phase A calendar: check_availability tool → shared FreeBusy + free-slots (read-only).
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
 * Phase A: only check_availability is executed. show_project ignored here (nav is deterministic).
 */
async function applyFunctionCalls(data, input, now = new Date()) {
  const calls = extractFunctionCalls(data);
  if (!calls.length) {
    return { needsFollowUp: false };
  }

  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (item && item.type === "function_call") {
      input.push(item);
    }
  }

  for (const call of calls) {
    if (call.name === "check_availability") {
      const result = await runCheckAvailability(call.arguments, now);
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
      continue;
    }

    // Phase A: no other mutating tools. Reject unknown / unused.
    input.push({
      type: "function_call_output",
      call_id: call.call_id,
      output: JSON.stringify({ ok: false, error: "unsupported_tool" }),
    });
  }

  return { needsFollowUp: true };
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
  if (!message) {
    return json(400, { error: "empty_message" });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return json(400, { error: "message_too_long" });
  }

  // Explicit nav: canned reply + allowlisted action. Never call OpenAI / Calendar.
  const nav = resolveNavigateAction(message);
  if (nav) {
    return json(200, {
      reply: cannedNavReply(nav.label),
      action: { type: "navigate", path: nav.path },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(503, { error: "openai_not_configured" });
  }

  const skin = normalizeSkin(body.skin);
  const history = sanitizeHistory(body.history);
  const forceCalendar = shouldForceCheckAvailability(message);
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
      // Forced availability path but model returned text only — never invent slots.
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

    const reply = extractReplyText(data);
    if (!reply) {
      return json(502, { error: "empty_reply" });
    }

    return json(200, { reply });
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

  console.log("OK bot-chat calendar Phase A selftest");
  console.log(
    JSON.stringify(
      {
        forceCalendarExample: "Is László free Friday afternoon?",
        noCalendarExample: "Tell me about László's Siemens work.",
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
