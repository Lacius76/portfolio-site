/**
 * Deterministic navigation-intent detection for AI-Bot portfolio routing.
 * Shared logic: explicit show/open/go + known project → navigate.
 * Informational questions → no navigate.
 * No URLs — project_id inference only.
 */

/**
 * @param {string} message
 * @returns {boolean}
 */
function shouldForceShowProject(message) {
  if (!message || typeof message !== "string") return false;

  // Informational asks — never force navigation
  if (
    /\b(tell\s+me\s+about|what\s+did|what\s+was|describe|explain|how\s+did|how\s+does|how\s+was)\b/i.test(
      message
    )
  ) {
    return false;
  }

  const hasNavIntent =
    /\bshow(\s+me)?\b/i.test(message) ||
    /\btake\s+me\s+to\b/i.test(message) ||
    /\blet\s+me\s+see\b/i.test(message) ||
    /\bgo\s+to\b/i.test(message) ||
    /\bbring\s+up\b/i.test(message) ||
    /\bopen\b/i.test(message) ||
    /\bnavigate\b/i.test(message) ||
    /\bdisplay\b/i.test(message) ||
    /\bvisit\b/i.test(message) ||
    /\blaunch\b/i.test(message);

  if (!hasNavIntent) return false;

  return inferProjectId(message) !== null;
}

/**
 * Map an explicit nav message to an allowlisted project_id (or null if ambiguous).
 * @param {string} message
 * @returns {"siemens"|"ewa"|"bakery"|null}
 */
function inferProjectId(message) {
  if (!message || typeof message !== "string") return null;

  const siemens = /\b(hmi|scada|wincc|siemens|etm)\b/i.test(message);
  const ewa = /\b(ewa|fintech|wallet)\b/i.test(message);
  const bakery =
    /\b(bakery|babusgatos|babus|cake\s*creator|live\s*tracker)\b/i.test(
      message
    );

  const hits = [siemens && "siemens", ewa && "ewa", bakery && "bakery"].filter(
    Boolean
  );
  // Ambiguous multi-project ask → do not infer (clarification / text only)
  if (hits.length !== 1) return null;
  return hits[0];
}

module.exports = {
  shouldForceShowProject,
  inferProjectId,
};

// --- local assertions (node netlify/functions/_lib/bot-nav-intent.js) ---
if (require.main === module) {
  const msg = "Show me László's HMI work.";
  const forced = shouldForceShowProject(msg);
  const id = inferProjectId(msg);
  if (forced !== true) {
    console.error("FAIL forceShowProject === true for:", msg, "got", forced);
    process.exit(1);
  }
  if (id !== "siemens") {
    console.error("FAIL inferProjectId === siemens for:", msg, "got", id);
    process.exit(1);
  }
  const cases = [
    ["Tell me about László's HMI work", false, null],
    ["What did he do at Siemens?", false, null],
    ["Open the bakery project", true, "bakery"],
    ["Show the bakery project", true, "bakery"],
    ["Show me the Cake Creator", true, "bakery"],
    ["Take me to eWa", true, "ewa"],
    ["Navigate to the fintech project", true, "ewa"],
    ["Show me something cool", false, null],
  ];
  for (const [m, expForce, expId] of cases) {
    const f = shouldForceShowProject(m);
    const i = inferProjectId(m);
    if (f !== expForce || (expForce && i !== expId)) {
      console.error("FAIL", JSON.stringify(m), { f, expForce, i, expId });
      process.exit(1);
    }
  }
  console.log("OK bot-nav-intent selftest");
  console.log(
    JSON.stringify(
      {
        message: msg,
        shouldForceShowProject: forced,
        inferProjectId: id,
      },
      null,
      2
    )
  );
}
