/**
 * POST /.netlify/functions/bot-chat
 *
 * OpenAI Responses API proxy for AI-Bot 9000.
 * OPENAI_API_KEY stays server-side.
 * Custom function tool: show_project (allowlisted paths only).
 * No hosted OpenAI tools. No calendar tools yet. No web search.
 */

const { buildInstructions } = require("./_lib/bot-prompts");
const {
  SHOW_PROJECT_TOOL,
  resolveProject,
  allowedNavigatePaths,
} = require("./_lib/bot-projects");

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5.6-luna";
const MAX_OUTPUT_TOKENS = 200;
const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_TURNS = 4;

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
    calls.push({
      call_id: item.call_id,
      name: item.name,
      arguments: typeof item.arguments === "string" ? item.arguments : "",
    });
  }
  return calls;
}

function parseShowProjectArgs(rawArgs) {
  try {
    const parsed = JSON.parse(rawArgs || "{}");
    if (!parsed || typeof parsed !== "object") return null;
    return typeof parsed.project_id === "string" ? parsed.project_id : null;
  } catch (_) {
    return null;
  }
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

/**
 * Handle show_project (and reject unknown tools). Returns navigate action if resolved.
 * Mutates `input` with function_call items + outputs for a follow-up Responses turn.
 */
function applyFunctionCalls(data, input) {
  const calls = extractFunctionCalls(data);
  if (!calls.length) {
    return { action: null, needsFollowUp: false, fallbackLabel: null };
  }

  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (item && item.type === "function_call") {
      input.push(item);
    }
  }

  /** @type {{ type: string, path: string } | null} */
  let action = null;
  let fallbackLabel = null;

  for (const call of calls) {
    if (call.name !== "show_project") {
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify({ ok: false, error: "unsupported_tool" }),
      });
      continue;
    }

    const projectId = parseShowProjectArgs(call.arguments);
    const resolved = resolveProject(projectId);
    if (!resolved) {
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify({ ok: false, error: "unknown_project_id" }),
      });
      continue;
    }

    action = { type: "navigate", path: resolved.path };
    fallbackLabel = resolved.label;
    input.push({
      type: "function_call_output",
      call_id: call.call_id,
      output: JSON.stringify({
        ok: true,
        project_id: resolved.project_id,
        label: resolved.label,
      }),
    });
  }

  return { action, needsFollowUp: true, fallbackLabel };
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(503, { error: "openai_not_configured" });
  }

  const skin = normalizeSkin(body.skin);
  const history = sanitizeHistory(body.history);
  const instructions = buildInstructions(skin);

  /** @type {Array<object>} */
  const input = [];
  for (const turn of history) {
    input.push({ role: turn.role, content: turn.content });
  }
  input.push({ role: "user", content: message });

  const basePayload = {
    model: MODEL,
    instructions,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    // Only our allowlisted function tool — no hosted tools, no calendar.
    tools: [SHOW_PROJECT_TOOL],
  };

  try {
    let { res, data } = await callResponsesApi(apiKey, {
      ...basePayload,
      input,
    });

    if (!res.ok) {
      const code = res.status === 429 ? 429 : 502;
      return json(code, {
        error: res.status === 429 ? "rate_limited" : "openai_error",
      });
    }

    const toolResult = applyFunctionCalls(data, input);
    let action = toolResult.action;

    if (toolResult.needsFollowUp) {
      const follow = await callResponsesApi(apiKey, {
        ...basePayload,
        input,
      });
      if (follow.res.ok && follow.data) {
        data = follow.data;
      }
      // If follow-up fails, keep action from the resolved allowlist and fall back to a short reply.
    }

    let reply = extractReplyText(data);
    if (!reply && action && toolResult.fallbackLabel) {
      reply = `Opening ${toolResult.fallbackLabel}.`;
    }
    if (!reply) {
      return json(502, { error: "empty_reply" });
    }

    // Re-validate path immediately before responding (never trust free-form URLs).
    if (action && action.type === "navigate") {
      if (!allowedNavigatePaths().includes(action.path)) {
        action = null;
      }
    }

    if (action) {
      return json(200, { reply, action });
    }
    return json(200, { reply });
  } catch (_) {
    return json(502, { error: "openai_unreachable" });
  }
};
