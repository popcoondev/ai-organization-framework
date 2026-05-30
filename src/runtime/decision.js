import fs from "node:fs/promises";
import path from "node:path";
import { validateWithBundledSchema } from "./validation.js";

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

function requireActorWithRole(actors, role) {
  const actor = firstActorWithRole(actors, role);
  if (!actor) {
    throw new Error(`No actor with role '${role}' found in template.`);
  }
  return actor;
}

function decisionMakersForRoles(actors, roles) {
  const makers = roles
    .map((role) => requireActorWithRole(actors, role))
    .map((actor) => `${actor.actor_id} (${actor.roles.find((role) => roles.includes(role))})`);
  return makers;
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
    `- Re-open Conditions: ${record.reopen_conditions}`,
    "",
    "## Escalation Optional",
    `- Escalation Status: ${record.escalation_status ?? "none"}`,
    `- Escalation Summary: ${record.escalation_summary ?? "none"}`,
    `- Approval Outcome Status: ${record.approval_outcome_status ?? "none"}`,
    `- Guardian Veto Used Optional: ${record.guardian_veto_used ?? "none"}`,
    `- Escalation Resolution: ${record.escalation_resolution ?? "none"}`,
    `- Escalation Resolution Note: ${record.escalation_resolution_note ?? "none"}`
  ];

  return `${lines.join("\n")}\n`;
}

async function writeDecisionRecord(markdownPath, jsonPath, record) {
  await validateWithBundledSchema(record, "decision-record.schema.json", "decision record");
  await fs.writeFile(markdownPath, buildMarkdown(record), "utf8");
  await fs.writeFile(jsonPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
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

  const decisionMakers = decisionMakersForRoles(template.actors, ["Visionary"]);
  const pendingQuestions = session.clarification.pending_questions.map((item) => item.question);
  const clarificationSummary = session.clarification.clarification_summary;
  const unresolvedAmbiguity = session.clarification.remaining_gaps.join(" / ");
  const actions = session.clarification.should_wait_for_user
    ? [
        "present initial clarification questions to the user",
        "capture answers and update clarification state",
        "persist framing progress in the session"
      ]
    : [
        "record assumptions",
        "advance to framing",
        "persist framing progress in the session"
      ];

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
    clarifications_or_assumptions: pendingQuestions.length > 0
      ? `pending clarification questions: ${pendingQuestions.join(" / ")}`
      : "runtime will proceed with recorded assumptions",
    clarification_summary: clarificationSummary,
    unresolved_ambiguity: unresolvedAmbiguity,
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
    actions,
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
    reopen_conditions: "new conflicting input or unresolved high-stakes ambiguity",
    clarification_questions: pendingQuestions
  };

  await writeDecisionRecord(markdownPath, jsonPath, record);

  return {
    ...record,
    __markdown_path: markdownPath,
    __json_path: jsonPath
  };
}

export async function createFramingDecision({ projectRoot, template, session }) {
  if (!session.framing) {
    throw new Error("Cannot create framing decision without a framing object.");
  }

  const createdAt = nowIso();
  const decisionId = makeId("dec");
  const decisionsDir = path.join(projectRoot, ".aof", template.manifest.state.decisions);
  await ensureDir(decisionsDir);

  const markdownFileName = `${decisionId}.md`;
  const jsonFileName = `${decisionId}.json`;
  const markdownPath = path.join(decisionsDir, markdownFileName);
  const jsonPath = path.join(decisionsDir, jsonFileName);
  const canonicalMarkdownPath = path.posix.join(".aof", template.manifest.state.decisions.replaceAll("\\", "/"), markdownFileName);

  const decisionMakers = decisionMakersForRoles(template.actors, ["Builder", "Visionary"]);

  const record = {
    record_format_version: "1.0.0",
    decision_id: decisionId,
    created_at: createdAt,
    canonical_markdown_path: canonicalMarkdownPath,
    scope: template.workflow.default_governance_scope,
    stage: "planning",
    organization: template.organization.name,
    request: session.framing.request,
    need: session.framing.need,
    intent: session.framing.intent,
    context: session.framing.active_context,
    existing_artifacts_reviewed: [],
    background_or_prior_decisions: `clarification completed in session ${session.session_id}`,
    clarifications_or_assumptions: session.framing.clarifications_or_assumptions,
    clarification_summary: session.clarification.clarification_summary,
    unresolved_ambiguity: (session.clarification.unresolved_ambiguity ?? []).join(" / "),
    options_considered: [
      "Advance to planning with the current frame",
      "Ask another clarification round before planning",
      "Stop and request manual intake review"
    ],
    selected_option: "Advance to planning with the current frame",
    decision_summary: "Clarification has produced a usable frame and the session can advance to planning.",
    governance_model: template.governance.model,
    decision_makers: decisionMakers,
    governance_rule_applied: template.governance.decision_rules.default,
    veto_used: "No",
    why_this_option: "The request now has enough framed need, intent, and context to plan against.",
    why_other_options_were_not_selected: "Additional clarification is not required for the next planning step, and stopping would discard a usable frame.",
    policy_priorities_applied: template.policies.default_priority_order.join(" > "),
    policy_tradeoffs_accepted: "planning starts once framing is usable, even though future review may still reopen the work",
    actions: [
      "carry the framed need, intent, and context into planning",
      "prepare a Builder-led plan packet",
      "keep clarification history available for audit and reopen"
    ],
    expected_artifact: "planning packet and initial implementation or design plan",
    expected_outcome: "the session can enter Builder-led planning with a stable framed request",
    completion_criteria: "framed request is recorded and a planning-stage decision exists",
    success_criteria: "planning can proceed without reopening clarification immediately",
    completion_approval_scope: template.workflow.default_governance_scope,
    success_evaluation_scope: "planning-stage startup review",
    forecast_required: "no",
    forecast_summary: "not required before initial planning begins",
    uncertainty_notes: "planning may still reopen clarification if feasibility or risk gaps emerge",
    actor_performance_notes: "not evaluated yet",
    capacity_notes: "not evaluated yet",
    fit_notes: "Builder-led planning is now appropriate because the framing gate is complete",
    protocol_thread_id: session.session_id,
    routing_mode: session.routing_mode,
    max_retries: template.governance.escalation.max_retries,
    escalation_target: template.governance.escalation.target,
    context_snapshot_id: session.context_snapshot_id,
    change_trigger: "clarification answers completed the initial frame",
    review_trigger: "when planning yields a proposal or reopens clarification",
    review_date_or_condition: "at planning completion or on new blocking ambiguity",
    reopen_conditions: "new conflicting signal, weak planning feasibility, or policy conflict",
    clarification_questions: []
  };

  await writeDecisionRecord(markdownPath, jsonPath, record);

  return {
    ...record,
    __markdown_path: markdownPath,
    __json_path: jsonPath
  };
}

export async function updateDecisionRecordForEscalation({
  projectRoot,
  template,
  decisionId,
  execution,
  escalation
}) {
  const decisionsDir = path.join(projectRoot, ".aof", template.manifest.state.decisions);
  const markdownPath = path.join(decisionsDir, `${decisionId}.md`);
  const jsonPath = path.join(decisionsDir, `${decisionId}.json`);
  const text = await fs.readFile(jsonPath, "utf8");
  const record = JSON.parse(text);

  const nextRecord = {
    ...record,
    escalation_status: escalation.status,
    escalation_summary: escalation.summary,
    approval_outcome_status: execution.approval_outcome?.status ?? "rejected",
    guardian_veto_used: execution.approval_outcome?.guardian_veto_used ? "Yes" : "No",
    review_date_or_condition: "waiting for human escalation resolution",
    decision_summary: `${record.decision_summary} Approval escalated to ${escalation.target}.`,
    why_other_options_were_not_selected: `${record.why_other_options_were_not_selected} Approval escalation was required after execution failure.`
  };

  await writeDecisionRecord(markdownPath, jsonPath, nextRecord);
  return nextRecord;
}

export async function updateDecisionRecordForEscalationResolution({
  projectRoot,
  template,
  decisionId,
  escalation
}) {
  const decisionsDir = path.join(projectRoot, ".aof", template.manifest.state.decisions);
  const markdownPath = path.join(decisionsDir, `${decisionId}.md`);
  const jsonPath = path.join(decisionsDir, `${decisionId}.json`);
  const text = await fs.readFile(jsonPath, "utf8");
  const record = JSON.parse(text);

  const nextRecord = {
    ...record,
    escalation_status: escalation.status,
    escalation_resolution: escalation.resolution,
    escalation_resolution_note: escalation.resolution_note,
    decision_summary: `${record.decision_summary} Escalation resolved with '${escalation.resolution}'.`,
    review_date_or_condition: escalation.resolution === "reopen"
      ? "workflow re-entry required after escalation"
      : "escalation has been resolved"
  };

  await writeDecisionRecord(markdownPath, jsonPath, nextRecord);
  return nextRecord;
}
