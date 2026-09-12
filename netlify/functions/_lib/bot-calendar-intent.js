/**
 * Deterministic calendar-availability intent for AI-Bot Phase A (read-only).
 */

/**
 * Force check_availability for clear availability questions.
 * Vague "soon"/"whenever" → false (ask clarifying question; do not invent dates).
 * @param {string} message
 * @returns {boolean}
 */
function shouldForceCheckAvailability(message) {
  if (!message || typeof message !== "string") return false;

  // Too vague to invent a date range
  if (
    /^\s*(soon|whenever|sometime|any\s+time|anytime)\s*[.?!]?\s*$/i.test(message) ||
    /\b(available\s+soon|free\s+soon|whenever\s+you(?:'re| are)\s+free)\b/i.test(message)
  ) {
    return false;
  }

  const hasCalendarIntent =
    /\bis\b.+\bfree\b/i.test(message) ||
    /\bfree\s+(on|this|next|friday|monday|tuesday|wednesday|thursday|tomorrow|today)\b/i.test(
      message
    ) ||
    /\bwhen\s+is\b.+\bavailable\b/i.test(message) ||
    /\bavailable\b/i.test(message) ||
    /\bavailability\b/i.test(message) ||
    /\bfree\s+slots?\b/i.test(message) ||
    /\bany\s+free\b/i.test(message) ||
    /\bis\s+there\s+a\s+free\b/i.test(message) ||
    /\bdo\s+you\s+have\s+anything\s+available\b/i.test(message) ||
    /\b(check|see)\b.+\b(calendar|availability|schedule)\b/i.test(message);

  if (!hasCalendarIntent) return false;

  // Portfolio / case-study asks without schedule language
  if (
    /\b(siemens|hmi|scada|ewa|fintech|bakery|babusgatos|case\s*study)\b/i.test(message) &&
    !/\b(available|availability|free\s+slot|calendar|schedule|friday|tomorrow|next\s+week)\b/i.test(
      message
    )
  ) {
    return false;
  }

  // Explicit project navigation without availability wording
  if (
    /\b(show\s+me|take\s+me\s+to|open\s+the)\b/i.test(message) &&
    !/\b(available|availability|free\s+slot|calendar|schedule)\b/i.test(message)
  ) {
    return false;
  }

  return true;
}

module.exports = {
  shouldForceCheckAvailability,
};

if (require.main === module) {
  const cases = [
    ["Is László free Friday afternoon?", true],
    ["When is László available next week?", true],
    ["Do you have anything available tomorrow?", true],
    ["Is there a free slot Friday?", true],
    ["Tell me about László's Siemens work.", false],
    ["Show me László's HMI work.", false],
    ["What did he do at Siemens?", false],
    ["whenever", false],
    ["Are you free soon?", false],
  ];
  for (const [m, exp] of cases) {
    const got = shouldForceCheckAvailability(m);
    if (got !== exp) {
      console.error("FAIL", JSON.stringify(m), { got, exp });
      process.exit(1);
    }
  }
  console.log("OK bot-calendar-intent selftest");
}
