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
    "Navigate the visitor to one of László's known portfolio case-study pages. Call only when the visitor clearly wants to view, open, show, or go to a project. Do not call when they only ask questions about a project. Never invent URLs — only use project_id.",
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
