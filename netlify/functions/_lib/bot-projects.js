/**
 * AI-Bot 9000 — controlled portfolio project targets (server-side allowlist).
 * No arbitrary URLs. No calendar / web search here.
 */

const PROJECT_ALLOWLIST = {
  siemens: {
    path: "case-study-siemens.html",
    label: "Siemens / ETM HMI",
  },
  ewa: {
    path: "case-study-ewa.html",
    label: "eWa Fintech Super App",
  },
  bakery: {
    path: "case-study-babusgatos.html",
    label: "Bakery Live Tracker / Babusgatos",
  },
};

const PROJECT_IDS = Object.freeze(["siemens", "ewa", "bakery"]);

const SHOW_PROJECT_TOOL = {
  type: "function",
  name: "show_project",
  description:
    "Open one of László's real portfolio case-study pages in the visitor's browser. " +
    "You MUST call this tool when the visitor explicitly asks to show, open, view, see, or go to / be taken to a project " +
    '(e.g. "Show me László\'s HMI work", "Open the bakery project", "Take me to eWa", "Let me see the fintech case study"). ' +
    "Do NOT call it for ordinary questions like \"Tell me about Siemens\" or \"What did he do in HMI?\". " +
    "Never invent URLs — only pass project_id. Calling this tool is how pages are opened; do not claim you cannot display those case studies.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      project_id: {
        type: "string",
        enum: ["siemens", "ewa", "bakery"],
        description:
          "siemens = HMI / SCADA / WinCC / Siemens / ETM; ewa = fintech / wallet / eWa; bakery = bakery / Babusgatos / Cake Creator",
      },
    },
    required: ["project_id"],
  },
};

/**
 * @param {unknown} projectId
 * @returns {{ path: string, label: string, project_id: string } | null}
 */
function resolveProject(projectId) {
  if (typeof projectId !== "string") return null;
  const entry = PROJECT_ALLOWLIST[projectId];
  if (!entry || typeof entry.path !== "string") return null;
  return {
    project_id: projectId,
    path: entry.path,
    label: entry.label,
  };
}

/**
 * Frontend / server shared path set (relative filenames only).
 * @returns {string[]}
 */
function allowedNavigatePaths() {
  return PROJECT_IDS.map((id) => PROJECT_ALLOWLIST[id].path);
}

module.exports = {
  PROJECT_ALLOWLIST,
  PROJECT_IDS,
  SHOW_PROJECT_TOOL,
  resolveProject,
  allowedNavigatePaths,
};
