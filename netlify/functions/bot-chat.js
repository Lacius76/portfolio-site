/**
 * POST /.netlify/functions/bot-chat
 *
 * OpenAI Responses API proxy for AI-Bot 9000.
 * OPENAI_API_KEY stays server-side.
 *
 * v1 portfolio navigation is DETERMINISTIC (server intent → allowlist → action).
 * It does NOT depend on the model calling show_project.
 * show_project remains defined for future use but is not required for nav.
 *
 * No hosted OpenAI tools. No calendar tools yet. No web search.
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

/**
 * Resolve navigate action from message intent + PROJECT_ALLOWLIST only.
 * Never invents URLs. Returns null for informational / ambiguous asks.
 * @param {string} message
 * @returns {{ type: "navigate", path: string, label: string } | null}
 */
function resolveNavigateAction(message) {
  if (!shouldForceShowProject(message)) return null;
  const projectId = inferProjectId(message);
  const resolved = resolveProject(projectId);
  if (!resolved) return null;
  if (!allowedNavigatePaths().includes(resolved.path)) return null;
  // Relative filename only (same-origin allowlist)
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(503, { error: "openai_not_configured" });
  }

  // 1–3. Deterministic navigation BEFORE OpenAI (does not depend on tool calls).
  const nav = resolveNavigateAction(message);
  /** @type {{ type: string, path: string } | null} */
  const action = nav ? { type: "navigate", path: nav.path } : null;

  const skin = normalizeSkin(body.skin);
  const history = sanitizeHistory(body.history);
  let instructions = buildInstructions(skin);
  if (nav) {
    instructions +=
      `\n\nNAVIGATION NOTICE (server-handled): The visitor will be taken to "${nav.label}". ` +
      `Reply in 1–2 short sentences confirming you are opening that case study. ` +
      `Do not say you cannot display or open it. Do not invent URLs.`;
  }

  /** @type {Array<object>} */
  const input = [];
  for (const turn of history) {
    input.push({ role: turn.role, content: turn.content });
  }
  input.push({ role: "user", content: message });

  try {
    // 4. OpenAI only generates conversational reply (tools kept available for later;
    //    tool_choice none so v1 nav never depends on the model calling show_project).
    const { res, data } = await callResponsesApi(apiKey, {
      model: MODEL,
      instructions,
      input,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
      tools: [SHOW_PROJECT_TOOL],
      tool_choice: "none",
    });

    if (!res.ok) {
      const code = res.status === 429 ? 429 : 502;
      return json(code, {
        error: res.status === 429 ? "rate_limited" : "openai_error",
      });
    }

    let reply = extractReplyText(data);
    if (
      action &&
      (!reply ||
        /don['’]?t have|cannot display|can'?t display|no .{0,40}case-study|not available to display|no public case-study/i.test(
          reply
        ))
    ) {
      reply = `Opening ${nav.label}.`;
    }
    if (!reply) {
      return json(502, { error: "empty_reply" });
    }

    // 5. Final response — action is independent of OpenAI tool results.
    if (action) {
      return json(200, { reply, action });
    }
    return json(200, { reply });
  } catch (_) {
    return json(502, { error: "openai_unreachable" });
  }
};

// --- local mocked handler-path assertion ---
if (require.main === module) {
  const msg = "Show me László's HMI work.";
  if (shouldForceShowProject(msg) !== true) {
    console.error("FAIL shouldForceShowProject");
    process.exit(1);
  }
  if (inferProjectId(msg) !== "siemens") {
    console.error("FAIL inferProjectId");
    process.exit(1);
  }
  const nav = resolveNavigateAction(msg);
  const mocked = {
    reply: "Opening Siemens / ETM HMI.",
    action: nav ? { type: "navigate", path: nav.path } : null,
  };
  if (
    !mocked.action ||
    mocked.action.type !== "navigate" ||
    mocked.action.path !== "case-study-siemens.html"
  ) {
    console.error("FAIL mocked response", mocked);
    process.exit(1);
  }
  // Informational must not navigate
  if (resolveNavigateAction("Tell me about László's HMI work.") !== null) {
    console.error("FAIL informational should have no action");
    process.exit(1);
  }
  console.log("OK bot-chat nav path selftest");
  console.log(JSON.stringify({ message: msg, mocked }, null, 2));
}
