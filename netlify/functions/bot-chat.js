/**
 * POST /.netlify/functions/bot-chat
 *
 * OpenAI Responses API proxy for AI-Bot 9000.
 * OPENAI_API_KEY stays server-side. No hosted OpenAI tools. No calendar tools yet.
 */

const { buildInstructions } = require("./_lib/bot-prompts");

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5.6-luna";
const MAX_OUTPUT_TOKENS = 120;
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

  /** @type {Array<{role: string, content: string}>} */
  const input = [];
  for (const turn of history) {
    input.push({ role: turn.role, content: turn.content });
  }
  input.push({ role: "user", content: message });

  try {
    const res = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false,
        // Explicitly no tools — calendar / hosted tools come later (calendar only).
        tools: [],
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const code = res.status === 429 ? 429 : res.status >= 500 ? 502 : 502;
      return json(code, {
        error: res.status === 429 ? "rate_limited" : "openai_error",
      });
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
