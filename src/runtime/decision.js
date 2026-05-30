import fs from "node:fs/promises";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`.toUpperCase();
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function firstActorWithRole(actors, role) {
  return actors.find((actor) => Array.isArray(actor.roles) && actor.roles.includes(role));
}

function buildMarkdown(record) {
  const lines = [
    `# Decision Record: ${record.decision_id}`,
    "",
    "## Scope",
    `- Record Format Version: ${record.record_format_version}`,
    `- Created At: ${record.created_at}`,
    `- Canonical Markdown Path: ${record.canonical_markdown_path}`,
    `- Scope: ${record.scope}`,
    `- Stage: ${record.stage}`,
    `- Organization: ${record.organization}`,
    "",
    "## Input",
    `- Request: ${record.request}`,
    `- Need: ${record.need}`,
    `- Intent: ${record.intent}`,
    `- Context: ${record.context}`,
    `- Existing Artifacts Reviewed: ${record.existing_artifacts_reviewed.join(", ") || "none"}`,
    `- Background or Prior Decisions: ${record.background_or_prior_decisions}`,
    `- Clarifications or Assumptions: ${record.clarifications_or_assumptions}`,
    `- Clarification Summary Optional: ${record.clarification_summary ?? "not captured yet"}`,
    `- Unresolved Ambiguity Optional: ${record.unresolved_ambiguity ?? "request remains unframed"}`,
    "",
    "## Options Considered",
    ...record.options_considered.map((option, index) => `- Option ${String.fromCharCode(65 + index)}: ${option}`),
    "",
    "## Decision",
    `- Selected Option: ${record.selected_option}`,
    `- Decision Summary: ${record.decision_summary}`,
    "",
    "## Governance",
    `- Governance Model: ${record.governance_model}`,
    `- Decision Makers: ${record.decision_makers.join(", ")}`,
    `- Governance Rule Applied: ${record.governance_rule_applied}`,
    `- Veto Used: ${record.veto_used}`,
    "",
    "## Rationale",
    `- Why this option: ${record.why_this_option}`,
    `- Why other options were not selected: ${record.why_other_options_were_not_selected}`,
    `- Policy priorities applied: ${record.policy_priorities_applied}`,
    `- Policy tradeoffs accepted: ${record.policy_tradeoffs_accepted}`,
    "",
    "## Execution",
    ...record.actions.map((action) => `- Actions: ${action}`),
    `- Expected Artifact: ${record.expected_artifact}`,
    `- Expected Outcome: ${record.expected_outcome}`,
    `- Completion Criteria: ${record.completion_criteria}`,
    `- Success Criteria: ${record.success_criteria}`,
    `- Completion Approval Scope: ${record.completion_approval_scope}`,
    `- Success Evaluation Scope: ${record.success_evaluation_scope}`,
    "",
    "## Forecast Optional",
    `- Forecast Required: ${record.forecast_required}`,
    `- Forecast Summary: ${record.forecast_summary}`,
    `- Uncertainty Notes: ${record.uncertainty_notes}`,
    "",
    "## Actor Notes Optional",
    `- Actor Performance Notes: ${record.actor_performance_notes}`,
    `- Capacity Notes: ${record.capacity_notes}`,
    `- Fit Notes: ${record.fit_notes}`,
    `- Protocol Thread ID: ${record.protocol_thread_id}`,
    "",
    "## Routing Optional",
    `- Routing Mode: ${record.routing_mode}`,
    `- Max Retries: ${record.max_retries}`,
    `- Escalation Target: ${record.escalation_target}`,
    `- Context Snapshot ID: ${record.context_snapshot_id}`,
    "",
    "## Review",
    `- Change Trigger: ${record.change_trigger}`,
    `- Review Trigger: ${record.review_trigger}`,
    `- Review Date or Condition: ${record.review_date_or_condition}`,
    `- Re-open Conditions: ${record.reopen_conditions}`
  ];

  return `${lines.join("\n")}\n`;
}

export async function createInitialDecision({ projectRoot, template, session, request }) {
  const createdAt = nowIso();
  const decisionId = makeId("dec");
  const decisionsDir = path.join(projectRoot, ".aof", template.manifest.state.decisions);
  await ensureDir(decisionsDir);

  const markdownFileName = `${decisionId}.md`;
  const jsonFileName = `${decisionId}.json`;
  const markdownPath = path.join(decisionsDir, markdownFileName);
  const jsonPath = path.join(decisionsDir, jsonFileName);
  const canonicalMarkdownPath = path.posix.join(".aof", template.manifest.state.decisions.replaceAll("\\", "/"), markdownFileName);

  const visionary = firstActorWithRole(template.actors, "Visionary");
  const decisionMakers = visionary
    ? [`${visionary.actor_id} (Visionary)`]
    : ["runtime-initializer (Visionary)"];

  const record = {
    record_format_version: "1.0.0",
    decision_id: decisionId,
    created_at: createdAt,
    canonical_markdown_path: canonicalMarkdownPath,
    scope: template.workflow.default_governance_scope,
    stage: "clarification",
    organization: template.organization.name,
    request,
    need: "to be framed during clarification",
    intent: "to be framed during clarification",
    context: "initial request received; constraints not yet fully framed",
    existing_artifacts_reviewed: [],
    background_or_prior_decisions: "not captured yet",
    clarifications_or_assumptions: "clarification required before framing proceeds",
    clarification_summary: "runtime created an initial clarification decision and will gather missing framing inputs",
    unresolved_ambiguity: "need, intent, constraints, and success criteria are not yet fully specified",
    options_considered: [
      "Proceed to structured clarification",
      "Assume framing without clarification",
      "Stop and request manual intake"
    ],
    selected_option: "Proceed to structured clarification",
    decision_summary: "Begin clarification before planning or execution.",
    governance_model: template.governance.model,
    decision_makers: decisionMakers,
    governance_rule_applied: template.governance.decision_rules.default,
    veto_used: "No",
    why_this_option: "The request is not yet framed enough for safe downstream work.",
    why_other_options_were_not_selected: "Skipping clarification would increase interpretation risk; stopping would be premature.",
    policy_priorities_applied: template.policies.default_priority_order.join(" > "),
    policy_tradeoffs_accepted: "speed is deferred to preserve framing quality and safety",
    actions: [
      "assess clarification gaps",
      "generate clarification questions or assumptions",
      "persist clarification state in the session"
    ],
    expected_artifact: "clarification log and framed need/intent/context",
    expected_outcome: "request becomes safe to route into the workflow",
    completion_criteria: "clarification outputs are captured and the session can move to framed",
    success_criteria: "need, intent, context, and governance scope are usable for the next stage",
    completion_approval_scope: template.workflow.default_governance_scope,
    success_evaluation_scope: "runtime clarification review",
    forecast_required: "no",
    forecast_summary: "not required at initial clarification kickoff",
    uncertainty_notes: "scope and constraints may change after user answers",
    actor_performance_notes: "not evaluated yet",
    capacity_notes: "not evaluated yet",
    fit_notes: "Visionary-oriented clarification is the default prototype choice",
    protocol_thread_id: session.session_id,
    routing_mode: session.routing_mode,
    max_retries: template.governance.escalation.max_retries,
    escalation_target: template.governance.escalation.target,
    context_snapshot_id: session.context_snapshot_id,
    change_trigger: "initial trigger received",
    review_trigger: "after clarification answers or assumption pass",
    review_date_or_condition: "when clarification budget is exhausted or framing becomes ready",
    reopen_conditions: "new conflicting input or unresolved high-stakes ambiguity"
  };

  await fs.writeFile(markdownPath, buildMarkdown(record), "utf8");
  await fs.writeFile(jsonPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  return {
    ...record,
    __markdown_path: markdownPath,
    __json_path: jsonPath
  };
}
