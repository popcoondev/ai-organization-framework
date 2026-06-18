import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { alternativeAnalysisRecordCommand } from "../src/commands/alternative-analysis-record.js";
import { initProjectCommand } from "../src/commands/init-project.js";
import { needValidationAdvanceCommand } from "../src/commands/need-validation-advance.js";
import { needValidationRecordCommand } from "../src/commands/need-validation-record.js";
import { problemStatementRecordCommand } from "../src/commands/problem-statement-record.js";
import { projectCharterRecordCommand } from "../src/commands/project-charter-record.js";
import { valueHypothesisRecordCommand } from "../src/commands/value-hypothesis-record.js";

export const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const packageVersion = JSON.parse(await fs.readFile(path.join(repoRoot, "package.json"), "utf8")).version;
export const exampleProjectRoot = path.join(repoRoot, "examples", "aidlc-template");
export const genericExampleProjectRoot = path.join(repoRoot, "examples", "generic-template");

export async function createTempProject(t) {
  return createTempProjectFrom(t, exampleProjectRoot);
}

export async function createTempProjectFrom(t, fixtureRoot) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-test-"));
  const projectRoot = path.join(tempRoot, "project");
  const skippedStateDirs = [
    path.join(".aof", "sessions"),
    path.join(".aof", "decisions"),
    path.join(".aof", "context", "active"),
    path.join(".aof", "context", "summaries"),
    path.join(".aof", "context", "snapshots"),
    path.join(".aof", "context", "archive"),
    path.join(".aof", "signals"),
    path.join(".aof", "artifacts")
  ];
  await fs.cp(fixtureRoot, projectRoot, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(fixtureRoot, source);
      if (!relative || relative === "") {
        return true;
      }
      return !skippedStateDirs.some((skippedDir) => relative === skippedDir || relative.startsWith(`${skippedDir}${path.sep}`));
    }
  });
  await resetStateDirectories(projectRoot);
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });
  return projectRoot;
}

export async function createTempProjectWithDecisions(t) {
  const projectRoot = await createTempProject(t);
  const targetDecisionsRoot = path.join(projectRoot, ".aof", "decisions");
  await fs.mkdir(targetDecisionsRoot, { recursive: true });
  const decisionId = "DEC-MPSN0VNC-C4CTDW";
  const decisionJson = {
    record_format_version: "1.0.0",
    decision_id: decisionId,
    created_at: "2026-05-30T17:41:33.624Z",
    canonical_markdown_path: `.aof/decisions/${decisionId}.md`,
    scope: "requirements-approval",
    stage: "clarification",
    organization: "Product Team",
    request: "初回離脱率を下げたい",
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
    governance_model: "council-of-three",
    decision_makers: ["visionary-worker-01 (Visionary)"],
    governance_rule_applied: "majority-with-guardian-veto",
    veto_used: "No",
    why_this_option: "The request is not yet framed enough for safe downstream work.",
    why_other_options_were_not_selected: "Skipping clarification would increase interpretation risk; stopping would be premature.",
    policy_priorities_applied: "value > quality > safety > speed > cost",
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
    completion_approval_scope: "requirements-approval",
    success_evaluation_scope: "runtime clarification review",
    forecast_required: false,
    forecast_summary: "not required at initial clarification kickoff",
    uncertainty_notes: "scope and constraints may change after user answers",
    actor_performance_notes: "not evaluated yet",
    capacity_notes: "not evaluated yet",
    fit_notes: "Visionary-oriented clarification is the default prototype choice",
    protocol_thread_id: "SESS-MPSN0VNC-IJ25JO",
    routing_mode: "deep-path",
    max_retries: 2,
    escalation_target: "human-maintainer",
    context_snapshot_id: null,
    change_trigger: "initial trigger received",
    review_trigger: "after clarification answers or assumption pass",
    review_date_or_condition: "when clarification budget is exhausted or framing becomes ready",
    reopen_conditions: "new conflicting input or unresolved high-stakes ambiguity"
  };
  await fs.writeFile(
    path.join(targetDecisionsRoot, `${decisionId}.json`),
    `${JSON.stringify(decisionJson, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(targetDecisionsRoot, `${decisionId}.md`),
    `# Decision Record: ${decisionId}\n\nBegin clarification before planning or execution.\n`,
    "utf8"
  );
  return projectRoot;
}

export async function createInitializedProject(t) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-init-test-"));
  const projectRoot = path.join(tempRoot, "target-project");
  await fs.mkdir(projectRoot, { recursive: true });
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  await initProjectCommand({
    project: projectRoot,
    topology: "managed-project",
    projectType: "web-app",
    domainSummary: "Internal operations dashboard",
    installMode: "runtime-on"
  });

  return projectRoot;
}

export async function createInitializedProjectWithDocsDecision(t) {
  const projectRoot = await createInitializedProject(t);
  const decisionsRoot = path.join(projectRoot, ".aof", "decisions");
  const docsRoot = path.join(projectRoot, "docs");
  const decisionId = "ADR-001";
  const decisionJson = {
    record_format_version: "1.0",
    decision_id: decisionId,
    created_at: "2026-06-14T00:00:00.000Z",
    canonical_markdown_path: "docs/ADR-001.md",
    scope: "release-governance",
    stage: "accepted",
    organization: "AOF Test Organization",
    request: "Promote v2.3 release artifacts",
    need: "Ensure self-hosting decision register respects canonical markdown outside .aof/decisions when no template is present.",
    intent: "Keep self-hosting release evidence operator-visible without forcing template-local markdown paths.",
    context: "Managed-project bootstrap does not include a template manifest, so decision-register must use declared canonical paths.",
    existing_artifacts_reviewed: [],
    options_considered: [
      "Force markdown into .aof/decisions",
      "Respect declared canonical markdown path"
    ],
    selected_option: "Respect declared canonical markdown path",
    decision_summary: "Use the declared canonical markdown path when no template manifest exists.",
    governance_model: "single-review",
    decision_makers: ["guardian"],
    governance_rule_applied: "single approver",
    veto_used: "none",
    why_this_option: "Self-hosting and bootstrap projects may keep canonical markdown under docs/ while storing JSON state under .aof/decisions.",
    why_other_options_were_not_selected: "Forcing .aof-local markdown would drift from the declared canonical documentation surface.",
    policy_priorities_applied: "artifact traceability",
    actions: ["render decision register"],
    expected_artifact: "aligned decision register entry",
    expected_outcome: "self-hosting-style canonical markdown is treated as aligned",
    completion_criteria: "decision-register reports aligned pair state",
    success_criteria: "decision markdown path is respected"
  };
  await fs.mkdir(decisionsRoot, { recursive: true });
  await fs.mkdir(docsRoot, { recursive: true });
  await fs.writeFile(path.join(decisionsRoot, `${decisionId}.json`), `${JSON.stringify(decisionJson, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(docsRoot, `${decisionId}.md`), `# ${decisionId}\n\nDeclared canonical markdown path.\n`, "utf8");
  return projectRoot;
}

export async function ensureReleaseRefFixtures(projectRoot) {
  const docsRoot = path.join(projectRoot, "docs");
  await fs.mkdir(docsRoot, { recursive: true });
  for (const fileName of [
    "v3.4-release-definition.md",
    "v3.4-release-checklist.md",
    "v3.4.0-release-notes.md",
    "vnext-roadmap.md",
    "vnext-release-plan.md"
  ]) {
    await fs.writeFile(path.join(docsRoot, fileName), `# ${fileName}\n`, "utf8");
  }
}

export async function ensureReleaseContractFixture(projectRoot) {
  const organizationPath = path.join(projectRoot, ".aof", "organization.json");
  const organization = JSON.parse(await fs.readFile(organizationPath, "utf8"));
  const hasContract = (organization.contracts ?? []).some((contract) => contract.contract_id === "contract-governance-to-release");
  if (!hasContract) {
    organization.contracts.push({
      contract_id: "contract-governance-to-release",
      name: "Governance To Release Contract",
      owner_team_ref: organization.teams[0].team_id,
      contract_type: "release-definition",
      artifact_ref: "docs/v3.0-release-definition.md"
    });
    await fs.writeFile(organizationPath, `${JSON.stringify(organization, null, 2)}\n`, "utf8");
  }
}

export async function createApprovedNeedValidationArtifacts(projectRoot) {
  const problem = await problemStatementRecordCommand({
    project: projectRoot,
    affectedParty: "newly invited workspace admins",
    actualProblem: "activation fails during permission setup",
    whyItMatters: "high-intent admins fail before reaching value",
    whyNow: "activation drop-off is blocking the onboarding target",
    evidenceRefs: ["docs/research/funnel-notes.md"]
  });
  const value = await valueHypothesisRecordCommand({
    project: projectRoot,
    expectedValueCreation: "higher activation completion",
    beneficiary: "newly invited workspace admins",
    supportingEvidence: ["analytics and interviews indicate confusion"],
    successCriteria: ["activation completion improves"]
  });
  const alternatives = await alternativeAnalysisRecordCommand({
    project: projectRoot,
    subjectNeed: "Reduce activation failure for invited admins",
    alternativeSolutions: ["clarify permission setup in-product"],
    stopOptions: ["do not create a project if the issue is not reproducible"]
  });
  const charter = await projectCharterRecordCommand({
    project: projectRoot,
    validatedNeedRef: ".aof/artifacts/need-validation/records/NVR-001.json",
    validatedObjective: "Ship the smallest validated intervention",
    scope: ["permission-step framing"],
    constraints: ["do not redesign the full onboarding flow"],
    expectedOutcomes: ["higher activation completion"]
  });
  const validation = await needValidationRecordCommand({
    project: projectRoot,
    rawNeed: "Improve onboarding",
    validationStatus: "validated",
    validatedNeed: "Reduce activation failure caused by permission-step confusion",
    decisionSummary: "The validated need is narrow enough for planning.",
    authorityAction: "approve-project-charter",
    projectCreationRecommendation: "create-project",
    validationQuestionsAnswered: [
      { question: "Who is affected?", answer: "newly invited workspace admins", evidence_state: "sufficient" }
    ],
    hiddenAssumptions: [],
    evidenceGaps: [],
    problemStatementRef: path.relative(projectRoot, problem.artifactPath).replaceAll("\\", "/"),
    valueHypothesisRef: path.relative(projectRoot, value.artifactPath).replaceAll("\\", "/"),
    alternativeAnalysisRef: path.relative(projectRoot, alternatives.artifactPath).replaceAll("\\", "/"),
    projectCharterRef: path.relative(projectRoot, charter.artifactPath).replaceAll("\\", "/")
  });

  return { problem, value, alternatives, charter, validation };
}

export async function advanceSessionToPlanning(projectRoot, sessionPath) {
  const artifacts = await createApprovedNeedValidationArtifacts(projectRoot);
  return needValidationAdvanceCommand({
    session: sessionPath,
    needValidationRecord: artifacts.validation.artifactPath
  });
}

export async function resetStateDirectories(projectRoot) {
  const aofRoot = path.join(projectRoot, ".aof");
  const stateDirs = [
    "sessions",
    "decisions",
    path.join("context", "active"),
    path.join("context", "summaries"),
    path.join("context", "snapshots"),
    path.join("context", "archive"),
    "signals",
    "artifacts"
  ];

  for (const relativeDir of stateDirs) {
    const dirPath = path.join(aofRoot, relativeDir);
    await fs.rm(dirPath, { recursive: true, force: true });
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function writeSignalFixture(projectRoot, signal = {}) {
  const signalPath = path.join(projectRoot, ".aof", "signals", "SIG-001.json");
  const payload = {
    signal_id: "SIG-001",
    signal_summary: "認証制約の変更で広い見直しが必要になった",
    required_review_level: "context-and-intent-review",
    ...signal
  };
  await fs.writeFile(signalPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return signalPath;
}

export async function countGeneratedFiles(dirPath, extension) {
  const entries = await fs.readdir(dirPath);
  return entries.filter((entry) => entry.endsWith(extension)).length;
}

export async function writeSignal(projectRoot, fileName, payload) {
  const signalPath = path.join(projectRoot, ".aof", "signals", fileName);
  await fs.writeFile(signalPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return signalPath;
}

export async function writeVisibilityFixture(rootDir) {
  const statusPath = path.join(rootDir, "status-card.json");
  const timelinePath = path.join(rootDir, "timeline-feed.json");
  const flowPath = path.join(rootDir, "flow-snapshot.json");
  const missionPath = path.join(rootDir, "mission-control.json");

  await fs.writeFile(statusPath, `${JSON.stringify({ view_type: "status_card", as_of: "2026-06-01T10:00:00Z", usage_level: "partial runtime", current_phase: "candidate_selected", current_goal: "choose today's featured observation", owner: "Facilitator", open_signals: [], next_checkpoint: "verify publish artifact before 10:00 JST", latest_artifact_ref: "obs-2026-06-01-cave-01", runtime_evidence_state: "present" }, null, 2)}\n`, "utf8");
  await fs.writeFile(timelinePath, `${JSON.stringify({ view_type: "timeline_feed", entries: [{ at: "2026-06-01T09:00:00Z", actor: "Facilitator", event_type: "candidate_selected", summary: "selected today's featured observation", rationale: "strongest novelty and low repetition", next: "verify publish artifact before 10:00 JST", refs: ["candidate-set-2026-06-01", "obs-2026-06-01-cave-01"] }] }, null, 2)}\n`, "utf8");
  await fs.writeFile(flowPath, `${JSON.stringify({ view_type: "flow_snapshot", nodes: [{ id: "generated", label: "candidate_generated", state: "done" }, { id: "selected", label: "candidate_selected", state: "current", substeps: [{ id: "fit-check", label: "Fit Check", state: "done" }, { id: "final-review", label: "Final Review", state: "current" }, { id: "ready-publish", label: "Ready To Publish", state: "pending" }], branches: [{ to: "published", label: "approve and publish" }], loopbacks: [{ to: "generated", label: "re-open candidate generation" }] }, { id: "published", label: "candidate_published", state: "pending" }], edges: [{ from: "generated", to: "selected", reason: "selection completed" }, { from: "selected", to: "published", reason: "publish checkpoint pending" }], current_node: "selected", open_branches: [] }, null, 2)}\n`, "utf8");
  await fs.writeFile(missionPath, `${JSON.stringify({ view_type: "mission_control", generated_at: "2026-06-01T10:00:00Z", mission_overview: { mission: "Ship today's featured observation", release_version: "v1.0.0", release_definition_ref: "docs/v1.0-release-definition.md", operating_goal: "choose today's featured observation", next_value_slice: "publish one reviewed observation", current_runtime_stage: "planning-ready", chain_anchor_ref: "obs-2026-06-01-cave-01" }, artifact_graph: { nodes: [{ id: "need-validation", label: "Need Validation Record", kind: "need-validation", state: "done", artifact_ref: ".aof/artifacts/need-validation/records/NVR-001.json" }, { id: "project-charter", label: "Project Charter", kind: "planning", state: "current", artifact_ref: ".aof/artifacts/need-validation/project-charters/PCH-001.json" }], edges: [{ from: "need-validation", to: "project-charter", relation: "validated need authorizes planning" }], current_node_id: "project-charter" }, runtime_position: { current_phase: "planning-ready", current_step_label: "Project Charter", current_step_state: "current" }, blockers: [{ summary: "verify publish artifact before 10:00 JST", severity: "attention", artifact_ref: "obs-2026-06-01-cave-01" }], next_action: { recommended_action: "verify publish artifact before 10:00 JST", rationale: "candidate is selected but publication is still gated", artifact_ref: "obs-2026-06-01-cave-01" } }, null, 2)}\n`, "utf8");

  return { statusPath, timelinePath, flowPath, missionPath };
}

export function shouldRetryCliResult(result) {
  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
  return /SyntaxError:/.test(combined) || result.error?.code === "ETIMEDOUT";
}

export function spawnCliWithRetry(args, options = {}) {
  let lastResult = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = spawnSync(process.execPath, args, {
      encoding: "utf8",
      timeout: 15000,
      ...options
    });
    lastResult = result;
    if (result.status === 0 || !shouldRetryCliResult(result)) {
      return result;
    }
  }
  return lastResult;
}
