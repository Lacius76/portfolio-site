/**
 * Controlled Responses API tool: check_availability (Phase A read-only).
 */

const CHECK_AVAILABILITY_TOOL = {
  type: "function",
  name: "check_availability",
  description:
    "Check László's real Google Calendar availability (Europe/Budapest). " +
    "Call this for questions about free time, availability, open slots, or whether he is free on a day/part of day. " +
    "Pass civil dates only (YYYY-MM-DD). Interpret tomorrow / Friday / next week into concrete from_date and to_date. " +
    "morning = slots starting 08:00–11:00; afternoon = 12:00–15:00; otherwise day_part any. " +
    "Do NOT invent slots — only report what this tool returns. " +
    "This tool is READ-ONLY: it cannot book, create, or modify calendar events.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      from_date: {
        type: "string",
        description: "Inclusive start date YYYY-MM-DD in Europe/Budapest civil time",
      },
      to_date: {
        type: "string",
        description: "Inclusive end date YYYY-MM-DD in Europe/Budapest civil time",
      },
      day_part: {
        type: "string",
        enum: ["any", "morning", "afternoon"],
        description:
          "any = all work slots; morning = 08:00–11:00 starts; afternoon = 12:00–15:00 starts",
      },
    },
    required: ["from_date", "to_date", "day_part"],
  },
};

module.exports = {
  CHECK_AVAILABILITY_TOOL,
};
