/**
 * GET /.netlify/functions/calendar-availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * READ-ONLY: Google Calendar FreeBusy → sanitized busy intervals only.
 * Fail closed on any error. Never returns event titles or tokens.
 * Public response contract unchanged: { busy: [...] }
 */

const { queryBusyRange, validateDateRange } = require("./_lib/calendar-query");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const params = event.queryStringParameters || {};
    const from = params.from;
    const to = params.to;
    const validationError = validateDateRange(from, to);
    if (validationError) {
      return json(400, {
        error:
          validationError === "from and to must be YYYY-MM-DD"
            ? "Query params from and to are required as YYYY-MM-DD"
            : validationError === "from must be <= to"
              ? "Param from must be <= to"
              : `Date range must be between 0 and 62 days`,
      });
    }

    const { busy } = await queryBusyRange({ from, to });
    return json(200, { busy });
  } catch (err) {
    const code = err && err.code ? err.code : "UNKNOWN";
    if (code === "ENV_MISSING") {
      return json(500, { error: "Availability service is not configured" });
    }
    if (code === "FREEBUSY_CALENDAR_ERROR" || code === "FREEBUSY_REQUEST_FAILED") {
      return json(502, {
        error:
          code === "FREEBUSY_CALENDAR_ERROR"
            ? "Availability provider calendar error"
            : "Availability provider request failed",
      });
    }
    if (code === "TOKEN_REFRESH_FAILED") {
      return json(502, { error: "Availability authentication failed" });
    }
    if (code === "VALIDATION") {
      return json(400, { error: err.message || "Invalid date range" });
    }
    return json(500, { error: "Availability service unavailable" });
  }
};
