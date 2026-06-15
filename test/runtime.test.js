import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { answerCommand } from "../src/commands/answer.js";
import { alignmentPulseCommand } from "../src/commands/alignment-pulse.js";
import { allocationPlanRecordCommand } from "../src/commands/allocation-plan-record.js";
import { anomalyLogRecordCommand } from "../src/commands/anomaly-log-record.js";
import { assumptionMapRecordCommand } from "../src/commands/assumption-map-record.js";
import { breakthroughLibraryRegisterCommand } from "../src/commands/breakthrough-library-register.js";
import { breakthroughPatternRecordCommand } from "../src/commands/breakthrough-pattern-record.js";
import { cadenceFollowThroughCommand } from "../src/commands/cadence-follow-through.js";
import { cadenceTriggerGuideCommand } from "../src/commands/cadence-trigger-guide.js";
import { confirmationWindowRecordCommand } from "../src/commands/confirmation-window-record.js";
import { councilReviewPacketCommand } from "../src/commands/council-review-packet.js";
import { councilExecCommand } from "../src/commands/council-exec.js";
import { decisionVerifyCommand } from "../src/commands/decision-verify.js";
import { decisionRegisterCommand } from "../src/commands/decision-register.js";
import { discoveryJudgmentPacketCommand } from "../src/commands/discovery-judgment-packet.js";
import { discoveryHandoffRecordCommand } from "../src/commands/discovery-handoff-record.js";
import { discoveryQuestionSetRecordCommand } from "../src/commands/discovery-question-set-record.js";
import { escalationResolveCommand } from "../src/commands/escalation-resolve.js";
import { executionLineageCommand } from "../src/commands/execution-lineage.js";
import { goalProjectCommand } from "../src/commands/goal-project.js";
import { initProjectCommand } from "../src/commands/init-project.js";
import { learningLoopSnapshotCommand } from "../src/commands/learning-loop-snapshot.js";
import { liveVerifyCommand } from "../src/commands/live-verify.js";
import { metricsSnapshotCommand } from "../src/commands/metrics-snapshot.js";
import { contractRegisterCommand } from "../src/commands/contract-register.js";
import { dependencyGraphCommand } from "../src/commands/dependency-graph.js";
import { organizationAuditCommand } from "../src/commands/organization-audit.js";
import { organizationStatusCommand } from "../src/commands/organization-status.js";
import { organizationVerifyCommand } from "../src/commands/organization-verify.js";
import { organizationAnalyticsSnapshotCommand } from "../src/commands/organization-analytics-snapshot.js";
import { outcomeReportCommand } from "../src/commands/outcome-report.js";
import { policyEvaluationReportCommand } from "../src/commands/policy-evaluation-report.js";
import { resourceClaimRecordCommand } from "../src/commands/resource-claim-record.js";
import { roleJoinRecordCommand } from "../src/commands/role-join-record.js";
import { upgradeProjectCommand } from "../src/commands/upgrade-project.js";
import { roadmapStatusCommand } from "../src/commands/roadmap-status.js";
import { runtimeDisciplineBenchmarkCommand } from "../src/commands/runtime-discipline-benchmark.js";
import { runtimeLoopProofCommand } from "../src/commands/runtime-loop-proof.js";
import { buildCouncilExecutionPlan } from "../src/runtime/council.js";
import { buildModelInputPacket } from "../src/runtime/packet.js";
import { retireCandidateReviewCommand } from "../src/commands/retire-candidate-review.js";
import { roleResultRecordCommand } from "../src/commands/role-result-record.js";
import { runCommand } from "../src/commands/run.js";
import { selfAuditRecordCommand } from "../src/commands/self-audit-record.js";
import { taskOpenCommand } from "../src/commands/task-open.js";
import { taskUpdateCommand } from "../src/commands/task-update.js";
import { teamOutputRecordCommand } from "../src/commands/team-output-record.js";
import { verifyHistoryCommand } from "../src/commands/verify-history.js";
import { verifyDashboardCommand } from "../src/commands/verify-dashboard.js";
import { verifyDashboardIndexCommand } from "../src/commands/verify-dashboard-index.js";
import { verifyDashboardLogCommand } from "../src/commands/verify-dashboard-log.js";
import { verifyArchiveCommand } from "../src/commands/verify-archive.js";
import { verifyArchiveDashboardCommand } from "../src/commands/verify-archive-dashboard.js";
import { verifyArchiveLogCommand } from "../src/commands/verify-archive-log.js";
import { verifyLineageCommand } from "../src/commands/verify-lineage.js";
import { verifyLogCommand } from "../src/commands/verify-log.js";
import { buildVisibilityPageHtml, loadVisibilityViews } from "../src/commands/visibility-serve.js";
import { visibilityExportCommand } from "../src/commands/visibility-export.js";
import {
  updateDecisionRecordForEscalation,
  updateDecisionRecordForEscalationResolution
} from "../src/runtime/decision.js";
import { deriveInitialClarification } from "../src/runtime/clarification.js";
import { loadSession } from "../src/runtime/session.js";
import { signalCommand } from "../src/commands/signal.js";
import { loadTemplate } from "../src/runtime/template-loader.js";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const packageVersion = JSON.parse(await fs.readFile(path.join(repoRoot, "package.json"), "utf8")).version;
const exampleProjectRoot = path.join(repoRoot, "examples", "aidlc-template");
const genericExampleProjectRoot = path.join(repoRoot, "examples", "generic-template");

async function createTempProject(t) {
  return createTempProjectFrom(t, exampleProjectRoot);
}

async function createTempProjectFrom(t, fixtureRoot) {
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

async function createTempProjectWithDecisions(t) {
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

async function createInitializedProject(t) {
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

async function createInitializedProjectWithDocsDecision(t) {
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
  await fs.writeFile(
    path.join(decisionsRoot, `${decisionId}.json`),
    `${JSON.stringify(decisionJson, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(docsRoot, `${decisionId}.md`),
    `# ${decisionId}\n\nDeclared canonical markdown path.\n`,
    "utf8"
  );
  return projectRoot;
}

async function resetStateDirectories(projectRoot) {
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

async function writeSignalFixture(projectRoot, signal = {}) {
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

async function countGeneratedFiles(dirPath, extension) {
  const entries = await fs.readdir(dirPath);
  return entries.filter((entry) => entry.endsWith(extension)).length;
}

async function writeSignal(projectRoot, fileName, payload) {
  const signalPath = path.join(projectRoot, ".aof", "signals", fileName);
  await fs.writeFile(signalPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return signalPath;
}

async function writeVisibilityFixture(rootDir) {
  const statusPath = path.join(rootDir, "status-card.json");
  const timelinePath = path.join(rootDir, "timeline-feed.json");
  const flowPath = path.join(rootDir, "flow-snapshot.json");

  await fs.writeFile(
    statusPath,
    `${JSON.stringify({
      view_type: "status_card",
      as_of: "2026-06-01T10:00:00Z",
      usage_level: "partial runtime",
      current_phase: "candidate_selected",
      current_goal: "choose today's featured observation",
      owner: "Facilitator",
      open_signals: [],
      next_checkpoint: "verify publish artifact before 10:00 JST",
      latest_artifact_ref: "obs-2026-06-01-cave-01",
      runtime_evidence_state: "present"
    }, null, 2)}\n`,
    "utf8"
  );

  await fs.writeFile(
    timelinePath,
    `${JSON.stringify({
      view_type: "timeline_feed",
      entries: [
        {
          at: "2026-06-01T09:00:00Z",
          actor: "Facilitator",
          event_type: "candidate_selected",
          summary: "selected today's featured observation",
          rationale: "strongest novelty and low repetition",
          next: "verify publish artifact before 10:00 JST",
          refs: ["candidate-set-2026-06-01", "obs-2026-06-01-cave-01"]
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );

  await fs.writeFile(
    flowPath,
    `${JSON.stringify({
      view_type: "flow_snapshot",
      nodes: [
        { id: "generated", label: "candidate_generated", state: "done" },
        {
          id: "selected",
          label: "candidate_selected",
          state: "current",
          substeps: [
            { id: "fit-check", label: "Fit Check", state: "done" },
            { id: "final-review", label: "Final Review", state: "current" },
            { id: "ready-publish", label: "Ready To Publish", state: "pending" }
          ],
          branches: [
            { to: "published", label: "approve and publish" }
          ],
          loopbacks: [
            { to: "generated", label: "re-open candidate generation" }
          ]
        },
        { id: "published", label: "candidate_published", state: "pending" }
      ],
      edges: [
        { from: "generated", to: "selected", reason: "selection completed" },
        { from: "selected", to: "published", reason: "publish checkpoint pending" }
      ],
      current_node: "selected",
      open_branches: []
    }, null, 2)}\n`,
    "utf8"
  );

  return {
    statusPath,
    timelinePath,
    flowPath
  };
}

function shouldRetryCliResult(result) {
  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
  return /SyntaxError:/.test(combined) || result.error?.code === "ETIMEDOUT";
}

function spawnCliWithRetry(args, options = {}) {
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

test("loadTemplate succeeds with the example template", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);

  assert.equal(template.organization.organization_id, "product-team");
  assert.equal(template.organization.language, "ja");
  assert.equal(template.workflowId, "aidlc");
  assert.equal(template.workflow.default_routing_mode, "deep-path");
  assert.match(template.templateAssets.decisionRecordMarkdownTemplate, /\{\{decision_record_content\}\}/);
  assert.equal(template.actors.length, 3);
  assert.deepEqual(
    template.actors.map((actor) => actor.roles[0]),
    ["Visionary", "Builder", "Guardian"]
  );
});

test("loadTemplate rejects a decision template that lacks the runtime content placeholder", async (t) => {
  const projectRoot = await createTempProject(t);
  const templatePath = path.join(projectRoot, ".aof", "templates", "decision-record.md");
  await fs.writeFile(templatePath, "# Decision Record: {{decision_id}}\n", "utf8");

  await assert.rejects(
    loadTemplate(projectRoot),
    /decision record markdown template must include \{\{decision_record_content\}\}/
  );
});

test("committed example session file matches the current session schema", async () => {
  const exampleSessionPath = path.join(
    exampleProjectRoot,
    ".aof",
    "sessions",
    "SESS-LX9KS8-AB12CD.json"
  );
  const session = await loadSession(exampleSessionPath);

  assert.equal(session.session_id, "SESS-LX9KS8-AB12CD");
  assert.equal(session.trigger.trigger_id, "TRG-LX9KS8-CD34EF");
  assert.equal(session.context_snapshot_id, null);
  assert.equal(session.organization.language, "ja");
  assert.equal(session.created_at.endsWith("Z"), true);
});

test("committed measured example session includes stage telemetry and outcome writeback", async () => {
  const measuredSessionPath = path.join(
    exampleProjectRoot,
    ".aof",
    "sessions",
    "SESS-LX9KS8-V11OUT.json"
  );
  const session = await loadSession(measuredSessionPath);

  assert.equal(session.session_id, "SESS-LX9KS8-V11OUT");
  assert.equal(session.stage_transitions.length >= 2, true);
  assert.equal(session.stage_transitions.at(-1)?.reason, "clarification-complete");
  assert.equal(session.routing_mode_history.length, 1);
  assert.equal(session.reopen_count, 0);
  assert.equal(session.outcome_reports.length, 1);
  assert.equal(session.outcome_reports[0].result, "success");
  assert.equal(session.outcome_reports[0].note, "登録導線の KPI が改善した");
  assert.equal(session.outcome_reports[0].signal_ref, "SIG-001");
});

test("taskOpenCommand writes a canonical open task artifact", async (t) => {
  const projectRoot = await createTempProject(t);

  const result = await taskOpenCommand({
    project: projectRoot,
    title: "Add runtime write path",
    description: "Bootstrap canonical task memory from runtime",
    origin: "orchestrator",
    orchestratorSessionId: "SESS-ORCH-001",
    assignedSessionIds: ["SESS-BUILD-001"],
    relatedDecisionRecordId: "DEC-001",
    operatingGoalRef: "self-hosting-gap",
    triageNotes: "Highest impact open gap"
  });

  assert.equal(result.ok, true);
  assert.equal(result.taskId, "TASK-001");

  const taskPath = path.join(projectRoot, ".aof", "tasks", "open", "TASK-001.json");
  const payload = JSON.parse(await fs.readFile(taskPath, "utf8"));
  assert.equal(payload.title, "Add runtime write path");
  assert.equal(payload.origin, "orchestrator");
  assert.deepEqual(payload.assigned_session_ids, ["SESS-BUILD-001"]);
  assert.equal(payload.operating_goal_ref, "self-hosting-gap");
});

test("taskOpenCommand allocates unique task ids under parallel creation", async (t) => {
  const projectRoot = await createTempProject(t);

  const results = await Promise.all([
    taskOpenCommand({ project: projectRoot, title: "Parallel task A" }),
    taskOpenCommand({ project: projectRoot, title: "Parallel task B" }),
    taskOpenCommand({ project: projectRoot, title: "Parallel task C" })
  ]);

  const taskIds = results.map((result) => result.taskId);
  assert.equal(new Set(taskIds).size, 3);

  for (const taskId of taskIds) {
    await fs.access(path.join(projectRoot, ".aof", "tasks", "open", `${taskId}.json`));
  }
});

test("goalProjectCommand writes a canonical goal projection artifact", async (t) => {
  const projectRoot = await createTempProject(t);

  const result = await goalProjectCommand({
    project: projectRoot,
    goalType: "next-value-slice",
    content: "Persist recent confirmation window",
    agreedWithHuman: true,
    sourceSessionId: "SESS-ORCH-001",
    sourceDecisionRecordId: "DEC-002",
    declaredComplete: false
  });

  assert.equal(result.ok, true);

  const goalPath = path.join(projectRoot, ".aof", "goals", "next-value-slice.json");
  const payload = JSON.parse(await fs.readFile(goalPath, "utf8"));
  assert.equal(payload.goal_type, "next-value-slice");
  assert.equal(payload.content, "Persist recent confirmation window");
  assert.equal(payload.agreed_with_human, true);
  assert.equal(payload.source_session_id, "SESS-ORCH-001");
});

test("initProjectCommand bootstraps a managed-project .aof skeleton and recognition packet", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-init-"));
  const projectRoot = path.join(tempRoot, "target-project");
  await fs.mkdir(projectRoot, { recursive: true });
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const result = await initProjectCommand({
    project: projectRoot,
    topology: "managed-project",
    projectType: "web-app",
    domainSummary: "Internal operations dashboard",
    installMode: "runtime-on"
  });

  assert.equal(result.ok, true);
  assert.equal(result.topology, "managed-project");
  assert.equal(result.writeTarget, "aof/state");

  const bootstrap = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "project-bootstrap.json"), "utf8"));
  const orientation = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "context", "active", "project-orientation.json"), "utf8"));
  const organization = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "organization.json"), "utf8"));
  const skills = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "skills.json"), "utf8"));
  const capabilityRegistry = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "capability-registry.json"), "utf8"));
  const resourceInventory = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "resource-inventory.json"), "utf8"));
  const policySet = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "policies.json"), "utf8"));
  const northStar = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "goals", "north-star.json"), "utf8"));
  const operatingGoal = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "goals", "operating-goal.json"), "utf8"));
  const nextValueSlice = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "goals", "next-value-slice.json"), "utf8"));
  const confirmationWindow = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json"), "utf8"));

  assert.equal(bootstrap.bootstrap_type, "aof-project-bootstrap");
  assert.equal(bootstrap.bootstrap_format_version, 1);
  assert.equal(bootstrap.topology, "managed-project");
  assert.equal(bootstrap.write_target, "aof/state");
  assert.equal(bootstrap.skills_ref, ".aof/skills.json");
  assert.equal(bootstrap.capability_registry_ref, ".aof/capability-registry.json");
  assert.equal(bootstrap.resource_inventory_ref, ".aof/resource-inventory.json");
  assert.equal(bootstrap.policy_ref, ".aof/policies.json");
  assert.equal(orientation.orientation_type, "project-orientation");
  assert.equal(organization.skills_ref, ".aof/skills.json");
  assert.equal(organization.capability_registry_ref, ".aof/capability-registry.json");
  assert.equal(organization.resource_inventory_ref, ".aof/resource-inventory.json");
  assert.equal(organization.policy_ref, ".aof/policies.json");
  assert.equal(skills.skills_type, "aof-skills");
  assert.equal(capabilityRegistry.capability_registry_type, "aof-capability-registry");
  assert.equal(resourceInventory.resource_inventory_type, "aof-resource-inventory");
  assert.equal(policySet.policy_set_type, "aof-policy-set");
  assert.equal(orientation.project_type, "web-app");
  assert.equal(orientation.domain_summary, "Internal operations dashboard");
  assert.equal(northStar.goal_type, "north-star");
  assert.equal(operatingGoal.goal_type, "operating-goal");
  assert.equal(nextValueSlice.goal_type, "next-value-slice");
  assert.equal(confirmationWindow.window_type, "recent-confirmation-window");
});

test("upgradeProjectCommand migrates an existing bootstrap manifest to the current installer shape", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-upgrade-"));
  const projectRoot = path.join(tempRoot, "target-project");
  const aofRoot = path.join(projectRoot, ".aof");
  await fs.mkdir(path.join(aofRoot, "context", "active"), { recursive: true });
  await fs.mkdir(path.join(aofRoot, "goals"), { recursive: true });
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  await fs.writeFile(
    path.join(aofRoot, "project-bootstrap.json"),
    `${JSON.stringify({
      bootstrap_type: "aof-project-bootstrap",
      aof_version: "1.0.0",
      topology: "managed-project",
      install_mode: "runtime-on",
      write_target: "aof/state",
      orientation_ref: ".aof/context/active/project-orientation.json",
      goals_ref: ".aof/goals",
      tasks_ref: ".aof/tasks",
      prompts_ref: ".aof/prompts",
      updated_at: "2026-01-01T00:00:00.000Z"
    }, null, 2)}\n`,
    "utf8"
  );

  const result = await upgradeProjectCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.topology, "managed-project");
  assert.equal(result.writeTarget, "aof/state");

  const bootstrap = JSON.parse(await fs.readFile(path.join(aofRoot, "project-bootstrap.json"), "utf8"));
  const orientation = JSON.parse(await fs.readFile(path.join(aofRoot, "context", "active", "project-orientation.json"), "utf8"));
  const organization = JSON.parse(await fs.readFile(path.join(aofRoot, "organization.json"), "utf8"));
  const skills = JSON.parse(await fs.readFile(path.join(aofRoot, "skills.json"), "utf8"));
  const capabilityRegistry = JSON.parse(await fs.readFile(path.join(aofRoot, "capability-registry.json"), "utf8"));
  const resourceInventory = JSON.parse(await fs.readFile(path.join(aofRoot, "resource-inventory.json"), "utf8"));
  const policySet = JSON.parse(await fs.readFile(path.join(aofRoot, "policies.json"), "utf8"));
  const operatingGoal = JSON.parse(await fs.readFile(path.join(aofRoot, "goals", "operating-goal.json"), "utf8"));
  const confirmationWindow = JSON.parse(await fs.readFile(path.join(aofRoot, "context", "active", "recent-confirmation-window.json"), "utf8"));

  assert.equal(bootstrap.bootstrap_type, "aof-project-bootstrap");
  assert.equal(bootstrap.bootstrap_format_version, 1);
  assert.equal(bootstrap.aof_version, packageVersion);
  assert.equal(bootstrap.skills_ref, ".aof/skills.json");
  assert.equal(bootstrap.capability_registry_ref, ".aof/capability-registry.json");
  assert.equal(bootstrap.resource_inventory_ref, ".aof/resource-inventory.json");
  assert.equal(bootstrap.policy_ref, ".aof/policies.json");
  assert.equal(orientation.orientation_type, "project-orientation");
  assert.equal(organization.skills_ref, ".aof/skills.json");
  assert.equal(skills.skills_type, "aof-skills");
  assert.equal(capabilityRegistry.capability_registry_type, "aof-capability-registry");
  assert.equal(resourceInventory.resource_inventory_type, "aof-resource-inventory");
  assert.equal(policySet.policy_set_type, "aof-policy-set");
  assert.equal(operatingGoal.goal_type, "operating-goal");
  assert.equal(confirmationWindow.window_type, "recent-confirmation-window");
});

test("organizationVerifyCommand validates the capability-layer bootstrap surface", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-org-verify-"));
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

  const result = await organizationVerifyCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.failed_checks, 0);
  assert.ok(result.summary.passed_checks > 0);
  assert.equal(result.checks.some((entry) => entry.name === "skills schema" && entry.status === "pass"), true);
});

test("organizationVerifyCommand reports cross-reference drift in capability-layer artifacts", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-org-verify-drift-"));
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

  const skillsPath = path.join(projectRoot, ".aof", "skills.json");
  const skills = JSON.parse(await fs.readFile(skillsPath, "utf8"));
  skills.skills.push({
    skill_id: "skill-broken-link",
    name: "Broken Link",
    owner_ref: "integration-team",
    version: "0.1.0",
    purpose: "Exercise cross-reference validation.",
    applicable_role_refs: [],
    required_capability_refs: ["cap-does-not-exist"],
    required_resource_refs: [],
    expected_outputs: ["validation error"]
  });
  await fs.writeFile(skillsPath, `${JSON.stringify(skills, null, 2)}\n`, "utf8");

  const result = await organizationVerifyCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.includes("cap-does-not-exist")));
  assert.equal(result.checks.some((entry) => entry.name === "skill capability_ref skill-broken-link" && entry.status === "fail"), true);
});

test("taskOpenCommand requires an orchestrator session id for orchestrator-origin tasks", async (t) => {
  const projectRoot = await createInitializedProject(t);

  await assert.rejects(
    taskOpenCommand({
      project: projectRoot,
      title: "Coordinate runtime slice",
      origin: "orchestrator"
    }),
    /requires --orchestrator-session-id/
  );
});

test("organizationVerifyCommand reports active orchestrator tasks that omit orchestrator_session_id", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const taskResult = await taskOpenCommand({
    project: projectRoot,
    title: "Legacy orchestrator task placeholder"
  });

  const taskPath = taskResult.taskPath;
  const taskPayload = JSON.parse(await fs.readFile(taskPath, "utf8"));
  taskPayload.origin = "orchestrator";
  taskPayload.orchestrator_session_id = null;
  await fs.writeFile(taskPath, `${JSON.stringify(taskPayload, null, 2)}\n`, "utf8");

  const result = await organizationVerifyCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.checks.some((entry) => entry.name === `active orchestrator task session ${taskPayload.task_id}` && entry.status === "fail"),
    true
  );
  assert.ok(result.errors.some((entry) => entry.includes("active orchestrator-owned tasks must declare orchestrator_session_id")));
});

test("organizationVerifyCommand reports execution artifacts that omit orchestrator provenance", async (t) => {
  const projectRoot = await createInitializedProject(t);

  await roleResultRecordCommand({
    project: projectRoot,
    role: "Builder",
    stage: "execution",
    sessionId: "SESS-CHILD-BUILDER-001",
    status: "completed",
    recommendation: "Proceed",
    rationale: "Testing missing provenance handling."
  });

  const result = await organizationVerifyCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.checks.some((entry) => entry.name.startsWith("execution artifact source_task_id role result ") && entry.status === "fail"),
    true
  );
  assert.equal(
    result.checks.some((entry) => entry.name.startsWith("execution artifact source_parent_session_id role result ") && entry.status === "fail"),
    true
  );
});

test("decisionVerifyCommand validates committed decision artifacts", async () => {
  const result = await decisionVerifyCommand({
    project: exampleProjectRoot
  });

  assert.equal(result.ok, true);
  assert.ok(result.decisionCount > 0);
  assert.equal(result.summary.failed_checks, 0);
  assert.equal(result.checks.some((entry) => entry.name.startsWith("decision bundled schema ") && entry.status === "pass"), true);
});

test("decisionVerifyCommand reports missing markdown pair artifacts", async (t) => {
  const projectRoot = await createTempProjectWithDecisions(t);
  const missingMarkdownPath = path.join(projectRoot, ".aof", "decisions", "DEC-MPSN0VNC-C4CTDW.md");
  await fs.rm(missingMarkdownPath, { force: true });

  const result = await decisionVerifyCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.includes("DEC-MPSN0VNC-C4CTDW.md is missing")));
  assert.equal(
    result.checks.some((entry) => entry.name === "decision markdown exists DEC-MPSN0VNC-C4CTDW" && entry.status === "fail"),
    true
  );
});

test("metricsSnapshotCommand writes a metrics artifact from current project state", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-metrics-"));
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

  await taskOpenCommand({
    project: projectRoot,
    title: "Create metrics slice"
  });

  await allocationPlanRecordCommand({
    project: projectRoot,
    subjectRef: "TASK-010",
    targetRoleRefs: ["builder"],
    candidateResourceRefs: ["resource-repo-main"],
    recommendedAllocations: [{
      role_ref: "builder",
      primary_resource_ref: "resource-repo-main",
      supporting_resource_refs: [],
      rationale: "repo access is required",
      capability_refs: ["cap-contract-alignment"],
      constraint_refs: ["policy-main-branch-access"],
      workload_state: "available",
      approval_required: true
    }],
    policyRefs: ["policy-main-branch-access"]
  });

  await policyEvaluationReportCommand({
    project: projectRoot,
    subjectRef: "TASK-010",
    evaluationScope: "allocation recommendation review",
    policyRefs: ["policy-main-branch-access"],
    overallOutcome: "requires-review",
    results: [{
      policy_id: "policy-main-branch-access",
      effect: "require-review",
      outcome: "requires-review",
      reason: "main-branch writes stay review-gated",
      blocking: false
    }]
  });

  await resourceClaimRecordCommand({
    project: projectRoot,
    subjectRef: "TASK-010",
    resourceRef: "resource-repo-main",
    claimantRoleRef: "builder",
    claimScope: "temporary repository write access for metrics verification",
    claimStatus: "requested",
    approvalPolicyRefs: ["policy-main-branch-access"],
    justification: "allocation plan recommends repo access but policy requires review before use"
  });

  const result = await metricsSnapshotCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.snapshot_type, "aof-metrics-snapshot");
  assert.equal(result.payload.observed_metrics.some((metric) => metric.metric_key === "task-open-count"), true);
  assert.equal(result.payload.observed_metrics.some((metric) => metric.metric_key === "allocation-plan-count" && metric.value === 1), true);
  assert.equal(result.payload.observed_metrics.some((metric) => metric.metric_key === "policy-evaluation-count" && metric.value === 1), true);
  assert.equal(result.payload.observed_metrics.some((metric) => metric.metric_key === "resource-claim-count" && metric.value === 1), true);
  assert.equal(result.payload.observed_metrics.some((metric) => metric.metric_key === "approval-required-allocation-count" && metric.value === 1), true);
  assert.equal(result.payload.observed_metrics.some((metric) => metric.metric_key === "allocation-review-load" && metric.value === 2), true);
  assert.equal(result.payload.observed_metrics.some((metric) => metric.metric_key === "open-resource-claim-count" && metric.value === 1), true);
});

test("allocationPlanRecordCommand writes a valid allocation plan artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await allocationPlanRecordCommand({
    project: projectRoot,
    subjectRef: "TASK-010",
    targetRoleRefs: ["builder"],
    candidateResourceRefs: ["resource-repo-main", "resource-npm-test"],
    recommendedAllocations: [{
      role_ref: "builder",
      primary_resource_ref: "resource-repo-main",
      supporting_resource_refs: ["resource-npm-test"],
      rationale: "repo access and verification support are both needed",
      capability_refs: ["cap-contract-alignment"],
      constraint_refs: ["policy-main-branch-access"],
      workload_state: "available",
      approval_required: true
    }],
    policyRefs: ["policy-main-branch-access"],
    riskNotes: ["main-branch writes remain review-gated"],
    sourceTaskId: "TASK-022"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.plan_type, "allocation-plan");
  assert.equal(payload.recommended_allocations[0].approval_required, true);
});

test("policyEvaluationReportCommand writes a valid policy evaluation report artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await policyEvaluationReportCommand({
    project: projectRoot,
    subjectRef: "TASK-010",
    evaluationScope: "allocation recommendation review",
    policyRefs: ["policy-main-branch-access"],
    overallOutcome: "requires-review",
    results: [{
      policy_id: "policy-main-branch-access",
      effect: "require-review",
      outcome: "requires-review",
      reason: "repository writes stay review-gated",
      blocking: false
    }],
    recommendedActions: ["Route allocation through review before execution."],
    sourceTaskId: "TASK-022"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.report_type, "policy-evaluation-report");
  assert.equal(payload.results[0].policy_id, "policy-main-branch-access");
});

test("resourceClaimRecordCommand writes a valid resource claim artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await resourceClaimRecordCommand({
    project: projectRoot,
    subjectRef: "TASK-010",
    resourceRef: "resource-repo-main",
    claimantRoleRef: "builder",
    claimScope: "temporary repository write access for v2.5 implementation slice",
    claimStatus: "requested",
    approvalPolicyRefs: ["policy-main-branch-access"],
    justification: "allocation plan recommends repo access but policy requires review before use",
    allocationPlanRef: ".aof/artifacts/allocation/plans/APL-001.json",
    policyEvaluationRef: ".aof/artifacts/allocation/policy-evaluations/PER-001.json",
    sourceTaskId: "TASK-023"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.claim_type, "resource-claim");
  assert.equal(payload.claim_status, "requested");
  assert.equal(payload.approval_policy_refs[0], "policy-main-branch-access");
});

test("discoveryQuestionSetRecordCommand writes a valid discovery question set artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await discoveryQuestionSetRecordCommand({
    project: projectRoot,
    discoveryObjective: "Find the highest-value onboarding friction to investigate",
    keyQuestions: [
      "Which user segment fails before activation?",
      "Which assumption should be broken first?"
    ],
    targetAssumptions: ["activation is blocked by permissions confusion"],
    targetAnomalies: ["high-intent users abandon after invite acceptance"],
    targetUserOrMarketSlice: "newly invited workspace admins",
    stopContinuePivotSignals: ["pivot if interview evidence contradicts funnel analytics"],
    sourceTaskId: "TASK-019"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.artifact_type, "discovery-question-set");
  assert.equal(payload.target_user_or_market_slice, "newly invited workspace admins");
});

test("breakthroughPatternRecordCommand writes a valid breakthrough pattern artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await breakthroughPatternRecordCommand({
    project: projectRoot,
    sourceDomain: "aviation safety",
    triggeringTension: "rare failures were hidden by aggregate success reporting",
    brokenAssumption: "success-path metrics are enough",
    enablingToolOrMethod: "incident review discipline",
    transferHypothesis: "retain anomaly evidence during discovery",
    expectedRelevance: "improve early problem framing",
    evidenceRefs: ["docs/research/incident-notes.md"],
    sourceTaskId: "TASK-019"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.record_type, "breakthrough-pattern-record");
  assert.deepEqual(payload.evidence_refs, ["docs/research/incident-notes.md"]);
});

test("breakthroughLibraryRegisterCommand lists stored breakthrough patterns as a reusable library surface", async (t) => {
  const projectRoot = await createInitializedProject(t);

  await breakthroughPatternRecordCommand({
    project: projectRoot,
    sourceDomain: "aviation safety",
    triggeringTension: "rare failures were hidden by aggregate success reporting",
    brokenAssumption: "success-path metrics are enough",
    enablingToolOrMethod: "incident review discipline",
    transferHypothesis: "retain anomaly evidence during discovery",
    expectedRelevance: "improve early problem framing",
    evidenceRefs: ["docs/research/incident-notes.md"],
    sourceTaskId: "TASK-021"
  });

  await breakthroughPatternRecordCommand({
    project: projectRoot,
    sourceDomain: "aviation safety",
    triggeringTension: "small incidents predicted larger failures",
    brokenAssumption: "near-misses can be ignored",
    enablingToolOrMethod: "incident logging",
    transferHypothesis: "treat anomalies as first-class discovery evidence",
    expectedRelevance: "improve anomaly retention",
    sourceTaskId: "TASK-021"
  });

  const result = await breakthroughLibraryRegisterCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.pattern_count, 2);
  assert.equal(result.domain_summary[0].source_domain, "aviation safety");
  assert.equal(result.domain_summary[0].pattern_count, 2);
});

test("assumptionMapRecordCommand writes a valid assumption map artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await assumptionMapRecordCommand({
    project: projectRoot,
    subject: "activation funnel discovery",
    assumptions: [{
      assumption: "workspace admins understand permission setup",
      assumption_type: "user",
      confidence: 0.4,
      evidence_state: "weak",
      break_test_question: "What percentage can explain the setup path without help?"
    }],
    sourceTaskId: "TASK-020"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.artifact_type, "assumption-map");
  assert.equal(payload.assumptions[0].assumption_type, "user");
});

test("anomalyLogRecordCommand writes a valid anomaly log artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await anomalyLogRecordCommand({
    project: projectRoot,
    subject: "activation funnel discovery",
    anomalies: [{
      observed_anomaly: "high-intent admins abandon after invite acceptance",
      why_it_matters: "intent is present but setup still fails",
      challenged_assumption: "drop-off is caused by low motivation",
      follow_up_recommendation: "interview recent abandons",
      evidence_refs: ["docs/research/funnel-notes.md"]
    }],
    sourceTaskId: "TASK-020"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.artifact_type, "anomaly-log");
  assert.equal(payload.anomalies[0].challenged_assumption, "drop-off is caused by low motivation");
});

test("discoveryJudgmentPacketCommand writes a valid discovery judgment artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await discoveryJudgmentPacketCommand({
    project: projectRoot,
    councilId: "discovery-council",
    judgmentStatus: "synthesize-handoff",
    decisionSummary: "The discovery question is narrow enough to hand off.",
    rationale: "The evidence now converges on permission setup confusion.",
    desirabilityAssessment: "The problem is painful for a clear user segment.",
    feasibilityAssessment: "A small onboarding intervention is plausible.",
    riskAssessment: "Evidence is still limited but sufficient for delivery-side validation.",
    evidenceQualityState: "sufficient",
    recommendedNextStep: "Create a delivery handoff packet.",
    questionSetRefs: [".aof/artifacts/discovery/question-sets/DQS-001.json"],
    artifactRefs: [".aof/artifacts/discovery/assumption-maps/ASM-001.json"],
    followUpQuestions: ["Which validation metric should gate rollout?"],
    promotionReady: true,
    handoffRequired: true,
    sourceTaskId: "TASK-019"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.packet_type, "discovery-judgment-packet");
  assert.equal(payload.judgment_status, "synthesize-handoff");
  assert.equal(payload.promotion_ready, true);
});

test("discoveryHandoffRecordCommand writes a valid discovery-to-delivery handoff artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await discoveryHandoffRecordCommand({
    project: projectRoot,
    selectedNeed: "Reduce activation failure for invited admins",
    intendedUserOrSegment: "newly invited workspace admins",
    contextSummary: "analytics and interviews indicate confusion during permission setup",
    hypothesis: "clearer permission framing will improve activation completion",
    evidenceRefs: ["docs/research/funnel-notes.md"],
    rejectedAlternatives: ["focus on invite email copy first"],
    explicitRisks: ["sample size is still small"],
    deliveryValidationRequirements: ["validate permission-step comprehension before UI rollout"],
    need: "Reduce activation failure for invited admins",
    intent: "Ship the smallest validated onboarding change",
    context: "Discovery narrowed the problem to permission setup confusion",
    sourceTaskId: "TASK-020"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.packet_type, "discovery-to-delivery-handoff");
  assert.deepEqual(payload.rejected_alternatives, ["focus on invite email copy first"]);
});

test("roleResultRecordCommand writes a valid execution role result artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await roleResultRecordCommand({
    project: projectRoot,
    role: "Builder",
    stage: "planning",
    sessionId: "SESS-BUILD-001",
    status: "completed",
    recommendation: "Merge into the team packet.",
    rationale: "Implementation direction is coherent.",
    signals: ["guardian review pending"],
    artifactRefs: ["docs/v2.4-execution-contract-definition.md"],
    decisionRequired: true,
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001",
    confidence: 0.8
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.result_type, "role-result");
  assert.equal(payload.session_id, "SESS-BUILD-001");
  assert.deepEqual(payload.signals, ["guardian review pending"]);
  assert.equal(payload.decision_required, true);
});

test("teamOutputRecordCommand derives missing roles and writes a valid team output artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const roleResult = await roleResultRecordCommand({
    project: projectRoot,
    role: "Builder",
    stage: "planning",
    sessionId: "SESS-BUILD-001",
    status: "completed",
    recommendation: "Ready for aggregation.",
    rationale: "Builder packet is complete."
  });

  const result = await teamOutputRecordCommand({
    project: projectRoot,
    teamId: "runtime-team",
    stage: "planning",
    expectedRoles: ["Builder", "Guardian"],
    receivedRoles: ["Builder"],
    aggregateState: "waiting-for-missing-roles",
    blockingSignals: ["guardian pending"],
    recommendedNextStep: "Wait for Guardian role result.",
    joinedRoleResultRefs: [path.relative(projectRoot, roleResult.artifactPath)],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.deepEqual(payload.expected_roles, ["Builder", "Guardian"]);
  assert.deepEqual(payload.received_roles, ["Builder"]);
  assert.deepEqual(payload.missing_roles, ["Guardian"]);
  assert.equal(payload.aggregate_state, "waiting-for-missing-roles");
});

test("roleJoinRecordCommand derives missing roles and writes a valid orchestrator join artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await roleJoinRecordCommand({
    project: projectRoot,
    stage: "planning",
    expectedRoles: ["Builder", "Guardian", "Visionary"],
    receivedRoles: ["Builder", "Guardian"],
    aggregateState: "waiting-for-missing-roles",
    blockingSignals: ["visionary pending"],
    recommendedNextStep: "Wait for Visionary role result.",
    receivedSessionIds: ["SESS-BUILD-001", "SESS-GUARD-001"],
    sourceTaskId: "TASK-011",
    sourceParentSessionId: "SESS-PARENT-001",
    summary: "Two of three child role outputs have arrived."
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.join_type, "role-join");
  assert.deepEqual(payload.expected_roles, ["Builder", "Guardian", "Visionary"]);
  assert.deepEqual(payload.received_roles, ["Builder", "Guardian"]);
  assert.deepEqual(payload.missing_roles, ["Visionary"]);
  assert.equal(payload.aggregate_state, "waiting-for-missing-roles");
});

test("councilReviewPacketCommand writes a valid council review packet", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await councilReviewPacketCommand({
    project: projectRoot,
    councilId: "architecture-council",
    stage: "review",
    reviewStatus: "changes-requested",
    decisionSummary: "Guardian evidence is still missing.",
    rationale: "Council approval requires both execution and risk views.",
    recommendation: "Collect Guardian output and resubmit.",
    targetAudience: "An operator deciding whether this slice is ready for external review.",
    expectedUserReaction: "The operator should block release because the evidence is incomplete.",
    blockingReasons: [
      "Guardian evidence is missing.",
      "The current packet cannot justify external confidence."
    ],
    artifactChangeRecommendations: [
      "Add the missing Guardian output summary.",
      "Show the missing evidence directly in the packet."
    ],
    organizationChangeRecommendations: [
      "Require a human-facing quality check before council approval."
    ],
    diagnosisCategory: "role-gap",
    diagnosisConfidence: 0.8,
    diagnosisEvidenceRefs: [
      ".aof/artifacts/execution/team-outputs/TOUT-001.json"
    ],
    humanOverrideSignal: "Owner judged the current packet not yet credible.",
    teamOutputRefs: [".aof/artifacts/execution/team-outputs/TOUT-001.json"],
    roleResultRefs: [".aof/artifacts/execution/role-results/RRES-001.json"],
    evidenceRefs: ["docs/v2.4-execution-contract-definition.md"],
    followUpTaskIds: ["TASK-012"],
    escalationRequired: false,
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.packet_type, "council-review-packet");
  assert.equal(payload.review_status, "changes-requested");
  assert.equal(payload.target_audience, "An operator deciding whether this slice is ready for external review.");
  assert.equal(payload.expected_user_reaction, "The operator should block release because the evidence is incomplete.");
  assert.deepEqual(payload.blocking_reasons, [
    "Guardian evidence is missing.",
    "The current packet cannot justify external confidence."
  ]);
  assert.deepEqual(payload.organization_change_recommendations, [
    "Require a human-facing quality check before council approval."
  ]);
  assert.equal(payload.diagnosis_category, "role-gap");
  assert.equal(payload.diagnosis_confidence, 0.8);
  assert.deepEqual(payload.diagnosis_evidence_refs, [
    ".aof/artifacts/execution/team-outputs/TOUT-001.json"
  ]);
  assert.equal(payload.human_override_signal, "Owner judged the current packet not yet credible.");
  assert.deepEqual(payload.follow_up_task_ids, ["TASK-012"]);
});

test("executionLineageCommand aggregates execution artifacts by source task", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const roleResult = await roleResultRecordCommand({
    project: projectRoot,
    role: "Builder",
    stage: "planning",
    sessionId: "SESS-BUILD-001",
    status: "completed",
    recommendation: "Merge into the team packet.",
    rationale: "Builder execution is complete.",
    signals: ["guardian review pending"],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });
  const teamOutput = await teamOutputRecordCommand({
    project: projectRoot,
    teamId: "runtime-team",
    stage: "planning",
    expectedRoles: ["Builder", "Guardian"],
    receivedRoles: ["Builder"],
    aggregateState: "waiting-for-missing-roles",
    blockingSignals: ["guardian pending"],
    recommendedNextStep: "Wait for Guardian role result.",
    joinedRoleResultRefs: [path.relative(projectRoot, roleResult.artifactPath)],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });
  await roleJoinRecordCommand({
    project: projectRoot,
    stage: "planning",
    expectedRoles: ["Builder", "Guardian"],
    receivedRoles: ["Builder"],
    aggregateState: "waiting-for-missing-roles",
    blockingSignals: ["guardian pending"],
    recommendedNextStep: "Wait for Guardian role result.",
    receivedSessionIds: ["SESS-BUILD-001"],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });
  await councilReviewPacketCommand({
    project: projectRoot,
    councilId: "architecture-council",
    stage: "review",
    reviewStatus: "deferred",
    decisionSummary: "Waiting for complete team packet.",
    rationale: "Guardian output has not arrived.",
    recommendation: "Wait for Guardian role result.",
    teamOutputRefs: [path.relative(projectRoot, teamOutput.artifactPath)],
    roleResultRefs: [path.relative(projectRoot, roleResult.artifactPath)],
    followUpTaskIds: ["TASK-012"],
    sourceTaskId: "TASK-012",
    sourceParentSessionId: "SESS-PARENT-001"
  });

  const result = await executionLineageCommand({
    project: projectRoot,
    sourceTaskId: "TASK-012"
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.role_result_count, 1);
  assert.equal(result.payload.role_join_count, 1);
  assert.equal(result.payload.team_output_count, 1);
  assert.equal(result.payload.council_review_count, 1);
  assert.equal(result.payload.recommended_next_step, "Wait for Guardian role result.");
  assert.equal(result.payload.stages_observed.includes("planning"), true);
});

test("runtimeLoopProofCommand generates an auditable backend-neutral loop proof bundle", async (t) => {
  const projectRoot = await createTempProject(t);

  const result = await runtimeLoopProofCommand({
    project: projectRoot,
    provider: "mock",
    sourceTaskId: "TASK-011"
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.proof_type, "runtime-loop-proof");
  assert.equal(result.payload.proof_status, "passed");
  assert.equal(result.payload.phases.framing, "completed");
  assert.equal(result.payload.phases.review, "approved");
  assert.equal(result.payload.phases.outcome, "success");
  assert.equal(result.payload.role_result_refs.length, 2);
  assert.equal(typeof result.payload.role_join_ref, "string");
  assert.equal(typeof result.payload.execution_lineage_ref, "string");
  assert.equal(typeof result.payload.learning_loop_ref, "string");

  const proofArtifact = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(proofArtifact.proof_type, "runtime-loop-proof");

  const learningLoop = JSON.parse(await fs.readFile(path.join(projectRoot, result.payload.learning_loop_ref), "utf8"));
  assert.equal(learningLoop.learning_state.has_outcome_evidence, true);
  assert.equal(learningLoop.improvement_proposal.proposal_basis, "framework-self-audit");

  const lineage = JSON.parse(await fs.readFile(path.join(projectRoot, result.payload.execution_lineage_ref), "utf8"));
  assert.equal(lineage.role_result_count, 2);
  assert.equal(lineage.role_join_count, 1);
  assert.equal(lineage.team_output_count, 1);
  assert.equal(lineage.council_review_count, 1);
});

test("runtimeDisciplineBenchmarkCommand writes reusable RD-003 and RD-004 benchmark summaries", async (t) => {
  const projectRoot = await createTempProject(t);

  await runtimeLoopProofCommand({
    project: projectRoot,
    provider: "mock",
    sourceTaskId: "TASK-011"
  });
  await organizationAuditCommand({
    project: projectRoot
  });

  const result = await runtimeDisciplineBenchmarkCommand({
    project: projectRoot,
    sourceTaskId: "TASK-011"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  const markdown = await fs.readFile(result.markdownPath, "utf8");
  assert.equal(payload.artifact_type, "runtime-discipline-benchmark-run");
  assert.equal(payload.source_task_id, "TASK-011");
  assert.equal(payload.rd001.status, "pass");
  assert.equal(payload.rd001.task_count, 0);
  assert.equal(payload.rd001.execution_packet_count, 0);
  assert.equal(payload.rd002.status, "pass");
  assert.equal(payload.rd002.missing_artifact_count, 3);
  assert.equal(payload.rd002.role_result_count, 1);
  assert.equal(payload.rd002.role_join_count, 0);
  assert.equal(payload.rd003.status, "pass");
  assert.equal(payload.rd004.status, "pass");
  assert.equal(typeof payload.rd004.generated_audit_note_ref, "string");
  assert.equal(typeof payload.rd004.generated_audit_packet_ref, "string");
  assert.equal(payload.rd004.primary_artifact_count > 0, true);
  assert.equal(payload.rd004.extended_artifact_count >= payload.rd004.primary_artifact_count, true);
  assert.equal(payload.rd004.audit_cost_score > 0, true);
  assert.equal(payload.rd004.cost_thresholds.primary_artifact_limit, 4);
  assert.equal(payload.rd004.cost_thresholds.extended_artifact_limit, 13);
  assert.equal(payload.rd004.cost_thresholds.score_limit, 17);
  const auditPacket = JSON.parse(await fs.readFile(path.join(projectRoot, payload.rd004.generated_audit_packet_ref), "utf8"));
  assert.equal(auditPacket.packet_type, "rd004-human-audit-summary");
  assert.equal(auditPacket.review_checklist.length, 5);
  assert.equal(auditPacket.review_checklist.every((entry) => entry.status === "pass"), true);
  assert.equal(auditPacket.fail_triggers.length, 4);
  assert.equal(auditPacket.audit_cost_score, payload.rd004.audit_cost_score);
  assert.equal(Number.isInteger(payload.audit.organization_checks.passed), true);
  assert.equal(Number.isInteger(payload.audit.decision_checks.passed), true);
  assert.match(markdown, /RD-001/);
  assert.match(markdown, /RD-002/);
  assert.match(markdown, /RD-004/);
  assert.match(markdown, /Generated audit note/);
  assert.match(markdown, /Generated audit packet/);
  assert.match(markdown, /Remaining Gap/);
});

test("organizationAnalyticsSnapshotCommand writes an inspectable organization analytics artifact", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-analytics-"));
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

  await taskOpenCommand({
    project: projectRoot,
    title: "Create analytics slice"
  });

  const result = await organizationAnalyticsSnapshotCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.snapshot_type, "aof-organization-analytics");
  assert.equal(typeof result.payload.contract_health.coverage_ratio, "number");
  assert.ok(Array.isArray(result.payload.observations));
});

test("organizationStatusCommand returns an operator-facing organization summary", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await organizationStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.topology, "managed-project");
  assert.equal(typeof result.goals.next_value_slice, "string");
  assert.equal(result.organization_summary.council_count > 0, true);
});

test("contractRegisterCommand lists declared contracts with artifact presence", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await contractRegisterCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.contracts), true);
  assert.equal(result.contract_count, result.contracts.length);
  assert.equal(result.contracts.every((entry) => typeof entry.artifact_present === "boolean"), true);
});

test("dependencyGraphCommand returns declared dependency edges and adjacency", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await dependencyGraphCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.dependencies), true);
  assert.equal(result.dependency_count, result.dependencies.length);
  assert.equal(typeof result.adjacency, "object");
});

test("decisionRegisterCommand lists decision artifacts and pair alignment", async (t) => {
  const projectRoot = await createTempProjectWithDecisions(t);

  const result = await decisionRegisterCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.decision_count > 0, true);
  assert.equal(result.decisions.some((entry) => entry.pair_alignment_state === "aligned"), true);
});

test("decisionRegisterCommand respects declared canonical markdown when no template manifest exists", async (t) => {
  const projectRoot = await createInitializedProjectWithDocsDecision(t);

  const result = await decisionRegisterCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.decision_count, 1);
  assert.equal(result.decisions[0].canonical_markdown_path, "docs/ADR-001.md");
  assert.equal(result.decisions[0].pair_alignment_state, "aligned");
});

test("roadmapStatusCommand groups tasks by roadmap track", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Define v2.3 operator-facing organization surfaces",
    triageNotes: "organization-status and roadmap-status"
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.release_tracks["v2.3"]), true);
  assert.equal(result.release_tracks["v2.3"].length > 0, true);
});

test("roadmapStatusCommand maps discovery-layer research work into the v3.0 track", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Design Discovery Layer and Discovery-to-Delivery handoff contract",
    description: "Evaluate Discovery Layer through discovery question-set, breakthrough-pattern, assumption map, anomaly log, and handoff artifacts."
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.release_tracks["v3.0"]), true);
  assert.equal(
    result.release_tracks["v3.0"].some((task) => task.title === "Design Discovery Layer and Discovery-to-Delivery handoff contract"),
    true
  );
});

test("roadmapStatusCommand keeps v3.0 runtime-loop tasks in the v3.0 track even when allocation terms appear in the description", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Prove v3.0 backend-neutral organization runtime loop",
    description: "Demonstrate one auditable end-to-end organization loop from framing through allocation, execution, review, outcome, and next-step recommendation across a backend-neutral orchestration contract."
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(
    result.release_tracks["v3.0"].some((task) => task.title === "Prove v3.0 backend-neutral organization runtime loop"),
    true
  );
  assert.equal(
    result.release_tracks["v2.5"].some((task) => task.title === "Prove v3.0 backend-neutral organization runtime loop"),
    false
  );
});

test("roadmapStatusCommand maps visibility projection work into the v2.6 track", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Project active .aof operating state into visibility outputs automatically",
    description: "Export status_card, timeline_feed, and flow_snapshot JSON from live runtime state."
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.release_tracks["v2.6"]), true);
  assert.equal(
    result.release_tracks["v2.6"].some((task) => task.title === "Project active .aof operating state into visibility outputs automatically"),
    true
  );
});

test("roadmapStatusCommand does not classify historical visibility mentions as v2.6 release work", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Ship v2.0 bootstrap installer and canonical docs set",
    description: "AOF needs a managed-project bootstrap path that installs the canonical .aof file set and AI-readable operating packet.",
    triageNotes: "Renumbered after a historical visibility-output task collision."
  });

  const result = await roadmapStatusCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(
    result.release_tracks["v2.6"].some((task) => task.title === "Ship v2.0 bootstrap installer and canonical docs set"),
    false
  );
  assert.equal(
    result.release_tracks.unmapped.some((task) => task.title === "Ship v2.0 bootstrap installer and canonical docs set"),
    true
  );
});

test("visibilityExportCommand writes runtime-backed visibility views consumable by the viewer", async (t) => {
  const projectRoot = await createInitializedProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Project active .aof operating state into visibility outputs automatically",
    description: "Export status_card, timeline_feed, and flow_snapshot JSON from live runtime state."
  });

  await taskOpenCommand({
    project: projectRoot,
    title: "Define v2.6 runtime-backed visibility projection layer",
    description: "Add a first-class runtime command that exports status_card, timeline_feed, and flow_snapshot JSON from live .aof artifacts."
  });

  const result = await visibilityExportCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  const views = await loadVisibilityViews({
    statusInput: result.statusPath,
    timelineInput: result.timelinePath,
    flowInput: result.flowPath
  });

  assert.equal(views.status_card.view_type, "status_card");
  assert.equal(views.status_card.usage_level, "runtime-backed");
  assert.equal(views.timeline_feed.view_type, "timeline_feed");
  assert.equal(views.timeline_feed.entries.length > 0, true);
  assert.equal(views.flow_snapshot.view_type, "flow_snapshot");
  assert.equal(views.flow_snapshot.current_node, "visibility_projection");
  assert.equal(
    views.flow_snapshot.ordered_nodes.some((node) => node.id === "runtime_loop_proof"),
    true
  );
});

test("organizationAuditCommand reports duplicate task lifecycle state as a failure", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Detect duplicate task lifecycle state"
  });

  const duplicatePath = path.join(projectRoot, ".aof", "tasks", "done", "TASK-001.json");
  const openPath = path.join(projectRoot, ".aof", "tasks", "open", "TASK-001.json");
  await fs.copyFile(openPath, duplicatePath);

  const result = await organizationAuditCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.equal(result.payload.task_integrity.ok, false);
  assert.equal(result.payload.task_integrity.duplicate_task_count, 1);
});

test("learningLoopSnapshotCommand writes a seeded loop artifact when no outcome exists", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-learning-seeded-"));
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

  const result = await learningLoopSnapshotCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.snapshot_type, "aof-learning-loop");
  assert.equal(result.payload.learning_state.has_outcome_evidence, false);
  assert.equal(result.payload.learning_state.has_next_value_slice, true);
});

test("learningLoopSnapshotCommand connects outcome, self-audit, and improvement focus", async (t) => {
  const projectRoot = await createTempProject(t);

  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  await outcomeReportCommand({
    session: runResult.sessionPath,
    result: "success",
    note: "登録導線の KPI が改善した",
    signalRef: "SIG-001"
  });

  await selfAuditRecordCommand({
    project: projectRoot,
    auditId: "FSA-LOOP-001",
    scope: "post-outcome review",
    summary: "An outcome was captured and should be folded into the next improvement slice.",
    detectedGap: "The improvement loop still needs an explicit artifact connecting outcome and follow-up action.",
    nextAction: "formalize the next improvement focus from the latest outcome evidence",
    relatedTaskIds: ["TASK-004"],
    maxEntries: 3
  });

  const result = await learningLoopSnapshotCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.learning_state.has_outcome_evidence, true);
  assert.equal(result.payload.learning_state.has_self_audit, true);
  assert.equal(result.payload.learning_state.loop_state, "improving");
  assert.equal(result.payload.improvement_proposal.proposal_basis, "framework-self-audit");
});

test("taskUpdateCommand moves a task across lifecycle directories", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Ship runtime write path",
    origin: "orchestrator",
    orchestratorSessionId: "SESS-ORCH-001",
    operatingGoalRef: "self-hosting-gap"
  });

  const result = await taskUpdateCommand({
    project: projectRoot,
    taskId: "TASK-001",
    status: "done",
    relatedDecisionRecordId: "DEC-003",
    triageNotes: "Completed in self-hosting slice"
  });

  assert.equal(result.ok, true);
  assert.equal(result.taskPath.endsWith(path.join(".aof", "tasks", "done", "TASK-001.json")), true);

  await assert.rejects(
    fs.access(path.join(projectRoot, ".aof", "tasks", "open", "TASK-001.json"))
  );

  const payload = JSON.parse(await fs.readFile(result.taskPath, "utf8"));
  assert.equal(payload.status, "done");
  assert.equal(payload.related_decision_record_id, "DEC-003");
  assert.equal(typeof payload.done_at, "string");
});

test("taskUpdateCommand consolidates duplicate lifecycle files for the same task id", async (t) => {
  const projectRoot = await createTempProject(t);

  await taskOpenCommand({
    project: projectRoot,
    title: "Consolidate duplicate lifecycle state"
  });

  const openPath = path.join(projectRoot, ".aof", "tasks", "open", "TASK-001.json");
  const duplicateDonePath = path.join(projectRoot, ".aof", "tasks", "done", "TASK-001.json");
  const duplicatePayload = JSON.parse(await fs.readFile(openPath, "utf8"));
  duplicatePayload.status = "done";
  duplicatePayload.updated_at = "2026-06-01T00:00:00.000Z";
  duplicatePayload.done_at = "2026-06-01T00:00:00.000Z";
  await fs.mkdir(path.dirname(duplicateDonePath), { recursive: true });
  await fs.writeFile(duplicateDonePath, `${JSON.stringify(duplicatePayload, null, 2)}\n`, "utf8");

  const result = await taskUpdateCommand({
    project: projectRoot,
    taskId: "TASK-001",
    status: "done",
    triageNotes: "Canonical done state after duplicate cleanup"
  });

  assert.equal(result.ok, true);
  await assert.rejects(fs.access(openPath));
  await fs.access(duplicateDonePath);

  const finalPayload = JSON.parse(await fs.readFile(duplicateDonePath, "utf8"));
  assert.equal(finalPayload.status, "done");
  assert.equal(finalPayload.triage_notes, "Canonical done state after duplicate cleanup");
});

test("confirmationWindowRecordCommand persists only the latest confirmation entries", async (t) => {
  const projectRoot = await createTempProject(t);

  await confirmationWindowRecordCommand({
    project: projectRoot,
    question: "まだ解くべき問題は同じか",
    answer: "はい",
    expectationState: "problem unchanged",
    maxEntries: 2
  });

  await confirmationWindowRecordCommand({
    project: projectRoot,
    question: "次の value slice は妥当か",
    answer: "はい、まず write path",
    scaleDirection: "implement runtime write path",
    maxEntries: 2
  });

  await confirmationWindowRecordCommand({
    project: projectRoot,
    question: "期待に近づいているか",
    answer: "一部。confirmation memory はまだ無い",
    mismatchState: "recent confirmation window missing",
    maxEntries: 2
  });

  const windowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const payload = JSON.parse(await fs.readFile(windowPath, "utf8"));
  assert.equal(payload.window_type, "recent-confirmation-window");
  assert.equal(payload.entries.length, 2);
  assert.equal(payload.entries[0].question, "次の value slice は妥当か");
  assert.equal(payload.entries[1].question, "期待に近づいているか");
});

test("loadTemplate fails when a required actor role is missing", async (t) => {
  const projectRoot = await createTempProject(t);
  const actorPath = path.join(projectRoot, ".aof", "actors", "visionary.yaml");
  const brokenActor = [
    "actor_id: visionary-worker-01",
    "display_name: Visionary Worker",
    "kind: ai",
    "capabilities:",
    "  - product-framing",
    "  - requirements-review",
    "policy_profile: default-product-policy",
    ""
  ].join("\n");
  await fs.writeFile(actorPath, brokenActor, "utf8");

  await assert.rejects(
    loadTemplate(projectRoot),
    /actor\.roles must be an array|actor\.roles must be a non-empty array/
  );
});

test("loadTemplate accepts optional clarification term overrides in organization config", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  use_default_high_stakes_patterns: false",
      "  use_default_brownfield_patterns: false",
      "  high_stakes_terms:",
      "    - structural",
      "  brownfield_terms:",
      "    - retrofit",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);

  assert.equal(template.organization.clarification.use_default_high_stakes_patterns, false);
  assert.equal(template.organization.clarification.use_default_brownfield_patterns, false);
  assert.deepEqual(template.organization.clarification.high_stakes_terms, ["structural"]);
  assert.deepEqual(template.organization.clarification.brownfield_terms, ["retrofit"]);
});

test("loadTemplate accepts partial clarification copy overrides and rejects malformed copy blocks", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  copy:",
      "    en:",
      "      questions:",
      "        scope: Which physical area should this redesign cover first?",
      "      summary_initial_questions: runtime generated architecture-specific clarification questions",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  assert.equal(
    template.organization.clarification.copy.en.questions.scope,
    "Which physical area should this redesign cover first?"
  );

  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  copy:",
      "    en:",
      "      questions:",
      "        scope:",
      "          label: bad-shape",
      ""
    ].join("\n"),
    "utf8"
  );

  await assert.rejects(
    loadTemplate(projectRoot),
    /organization\.clarification\.copy\.en\.questions\.scope must be a non-empty string/
  );
});

test("loadTemplate accepts clarification question policy and rejects malformed priority keys", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  question_policy:",
      "    initial_question_budget: 2",
      "    followup_budget: 1",
      "    max_rounds: 2",
      "    priority_order:",
      "      - high-stakes-risk",
      "      - missing-constraint",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  assert.equal(template.organization.clarification.question_policy.initial_question_budget, 2);
  assert.deepEqual(template.organization.clarification.question_policy.priority_order, [
    "high-stakes-risk",
    "missing-constraint"
  ]);

  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  question_policy:",
      "    priority_order:",
      "      - scope",
      ""
    ].join("\n"),
    "utf8"
  );

  await assert.rejects(
    loadTemplate(projectRoot),
    /organization\.clarification\.question_policy\.priority_order contains an unsupported key/
  );
});

test("generic example template loads successfully", async (t) => {
  const projectRoot = await createTempProjectFrom(t, genericExampleProjectRoot);
  const template = await loadTemplate(projectRoot);

  assert.equal(template.organization.organization_id, "civic-studio");
  assert.equal(template.workflowId, "service-design");
  assert.equal(template.workflow.name, "Service Design");
  assert.deepEqual(template.workflow.decision_points, ["concept-approval", "launch-approval"]);
  assert.equal(template.organization.clarification.use_default_high_stakes_patterns, false);
  assert.equal(
    template.organization.clarification.copy.en.questions.scope,
    "Which service touchpoint or environment should this redesign cover, and what should stay out of scope?"
  );
});

test("loadTemplate accepts empty decision_points and actor capabilities arrays", async (t) => {
  const projectRoot = await createTempProject(t);
  const workflowPath = path.join(projectRoot, ".aof", "workflows", "aidlc.yaml");
  const actorPath = path.join(projectRoot, ".aof", "actors", "builder.yaml");

  const relaxedWorkflow = [
    "workflow_id: aidlc",
    "name: AI-Driven Lifecycle",
    "entry_conditions: []",
    "stages:",
    "  - clarification",
    "  - planning",
    "  - proposal",
    "  - review",
    "  - approval",
    "decision_points: []",
    "default_governance_scope: requirements-approval",
    "default_routing_mode: deep-path",
    ""
  ].join("\n");

  const relaxedActor = [
    "actor_id: implementation-worker-01",
    "display_name: Builder Worker",
    "kind: ai",
    "roles:",
    "  - Builder",
    "capabilities: []",
    "policy_profile: default-product-policy",
    ""
  ].join("\n");

  await fs.writeFile(workflowPath, relaxedWorkflow, "utf8");
  await fs.writeFile(actorPath, relaxedActor, "utf8");

  const template = await loadTemplate(projectRoot);
  assert.deepEqual(template.workflow.decision_points, []);
  assert.deepEqual(template.actors.find((actor) => actor.actor_id === "implementation-worker-01")?.capabilities, []);
});

test("loadTemplate still rejects empty workflow stages", async (t) => {
  const projectRoot = await createTempProject(t);
  const workflowPath = path.join(projectRoot, ".aof", "workflows", "aidlc.yaml");
  const invalidWorkflow = [
    "workflow_id: aidlc",
    "name: AI-Driven Lifecycle",
    "entry_conditions: []",
    "stages: []",
    "decision_points:",
    "  - requirements-approval",
    "default_governance_scope: requirements-approval",
    "default_routing_mode: deep-path",
    ""
  ].join("\n");

  await fs.writeFile(workflowPath, invalidWorkflow, "utf8");

  await assert.rejects(
    loadTemplate(projectRoot),
    /workflow\.stages must be a non-empty array/
  );
});

test("runCommand uses English clarification questions when organization.language is en", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  const englishOrg = [
    "organization_id: product-team",
    "name: Product Team",
    "language: en",
    "mission: Deliver software outcomes through AIDLC",
    "governance_scopes:",
    "  - requirements-approval",
    "  - design-approval",
    "  - release-approval",
    ""
  ].join("\n");
  await fs.writeFile(organizationPath, englishOrg, "utf8");

  const result = await runCommand({
    project: projectRoot,
    request: "Improve the onboarding flow for new users"
  });

  assert.equal(result.pendingQuestions[0], "What exactly should be improved, and what scope should this effort cover?");
  const session = await loadSession(result.sessionPath);
  assert.equal(session.organization.language, "en");
  assert.equal(
    session.clarification.clarification_summary,
    "runtime identified initial clarification gaps and generated first-round user questions"
  );
});

test("deriveInitialClarification respects domain-specific clarification term overrides", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  use_default_high_stakes_patterns: false",
      "  use_default_brownfield_patterns: false",
      "  high_stakes_terms:",
      "    - structural",
      "  brownfield_terms:",
      "    - retrofit",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  const clarification = deriveInitialClarification(
    "Need a structural retrofit for the west wing",
    template
  );

  assert.equal(clarification.dimensions.risk_exposure, "conflicting");
  assert.equal(clarification.dimensions.brownfield_orientation_completeness, "partial");
  assert.ok(clarification.trigger_classes.includes("high-stakes-risk"));
  assert.ok(
    clarification.gaps.some((gap) => gap.trigger_class === "brownfield-gap")
  );

  const noBrownfieldFromDefault = deriveInitialClarification(
    "Improve the visitor flow",
    template
  );
  assert.equal(noBrownfieldFromDefault.dimensions.brownfield_orientation_completeness, "clear");
  assert.equal(noBrownfieldFromDefault.trigger_classes.includes("brownfield-gap"), false);
});

test("deriveInitialClarification applies partial clarification copy overrides", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver service outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  copy:",
      "    en:",
      "      questions:",
      "        scope: Which service environment should be redesigned first?",
      "      rationales:",
      "        scope: This keeps the service redesign bounded before planning.",
      "      summary_initial_questions: runtime generated service-specific clarification questions",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  const clarification = deriveInitialClarification(
    "Improve the visitor check-in experience",
    template
  );

  assert.equal(
    clarification.pending_questions[0].question,
    "Which service environment should be redesigned first?"
  );
  assert.equal(
    clarification.pending_questions[0].rationale,
    "This keeps the service redesign bounded before planning."
  );
  assert.equal(
    clarification.clarification_summary,
    "runtime generated service-specific clarification questions"
  );
  assert.equal(
    clarification.pending_questions[1].question,
    "How should improvement success be judged: which metric or end state matters most?"
  );
});

test("visibility view loader and HTML shell align with the v1.4 visibility contract", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-visibility-"));
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const fixture = await writeVisibilityFixture(tempRoot);
  const views = await loadVisibilityViews({
    statusInput: fixture.statusPath,
    timelineInput: fixture.timelinePath,
    flowInput: fixture.flowPath
  });

  assert.equal(views.status_card.view_type, "status_card");
  assert.equal(views.timeline_feed.entries[0].event_type, "candidate_selected");
  assert.equal(views.flow_snapshot.current_node, "selected");
  assert.equal(views.flow_snapshot.ordered_nodes.length, 3);
  assert.equal(views.derived.flow_metrics.total_steps, 3);
  assert.equal(views.derived.flow_metrics.current_step_index, 2);
  assert.equal(views.derived.narrative.current_position.step_progress, "2 / 3");
  assert.equal(views.derived.narrative.next_action.immediate_next_step, "candidate_published");
  assert.equal(views.derived.narrative.remaining_work.remaining_steps_after_current, 1);
  assert.equal(views.derived.current_node_detail.node_label, "candidate_selected");
  assert.equal(views.derived.current_node_detail.substep_progress, "1 / 3");
  assert.equal(views.derived.current_node_detail.current_substep_label, "Final Review");
  assert.equal(views.derived.current_node_detail.next_substep_label, "Ready To Publish");
  assert.equal(views.derived.current_node_detail.branches[0].label, "approve and publish");
  assert.equal(views.derived.current_node_detail.loopbacks[0].to, "generated");

  const html = buildVisibilityPageHtml("Test Visibility");
  assert.match(html, /Test Visibility/);
  assert.match(html, /Human Visibility Layer viewer/);
  assert.match(html, /status-root/);
  assert.match(html, /overview-root/);
  assert.match(html, /node-root/);
  assert.match(html, /timeline-root/);
  assert.match(html, /flow-root/);
  assert.match(html, /progress-donut/);
});

test("deriveInitialClarification respects trigger-class priority order and question budget", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver architecture outcomes",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  use_default_high_stakes_patterns: false",
      "  use_default_brownfield_patterns: false",
      "  high_stakes_terms:",
      "    - structural",
      "  brownfield_terms:",
      "    - retrofit",
      "  question_policy:",
      "    initial_question_budget: 2",
      "    priority_order:",
      "      - brownfield-gap",
      "      - high-stakes-risk",
      "      - missing-success-criteria",
      "      - missing-constraint",
      "      - missing-prohibition",
      ""
    ].join("\n"),
    "utf8"
  );

  const template = await loadTemplate(projectRoot);
  const clarification = deriveInitialClarification(
    "Need a structural retrofit for the west wing",
    template
  );

  assert.equal(clarification.pending_questions.length, 2);
  assert.deepEqual(
    clarification.trigger_classes,
    ["brownfield-gap", "high-stakes-risk"]
  );
  assert.equal(
    clarification.pending_questions[0].question,
    "In the current implementation or operation, what context must be carried forward into this decision?"
  );
  assert.equal(
    clarification.pending_questions[1].question,
    "For safety, legal, authentication, or personal-data concerns, what conditions are absolutely non-negotiable?"
  );
});

test("runCommand works with the generic example template", async (t) => {
  const projectRoot = await createTempProjectFrom(t, genericExampleProjectRoot);
  const result = await runCommand({
    project: projectRoot,
    request: "Need a structural retrofit for legacy visitor circulation"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "waiting_user");
  assert.equal(result.routingMode, "deep-path");
  assert.equal(result.pendingQuestions[0], "For safety, legal, authentication, or personal-data concerns, what conditions are absolutely non-negotiable?");
  assert.equal(
    result.pendingQuestions[1],
    "Which service touchpoint or environment should this redesign cover, and what should stay out of scope?"
  );
  assert.equal(result.pendingQuestions.length, 2);

  const session = await loadSession(result.sessionPath);
  assert.equal(session.workflow_id, "service-design");
  assert.equal(session.organization_id, "civic-studio");
  assert.equal(session.organization.language, "en");
  assert.equal(session.clarification.dimensions.brownfield_orientation_completeness, "partial");
  assert.equal(session.clarification.question_budget.initial_question_budget, 2);
  assert.equal(session.clarification.question_budget.followup_budget, 1);
  assert.equal(session.clarification.question_budget.max_rounds, 2);
  assert.equal(
    session.clarification.clarification_summary,
    "runtime identified service-design clarification gaps and generated first-round questions"
  );
});

test("generic example template works end-to-end through planning and approval", async (t) => {
  const projectRoot = await createTempProjectFrom(t, genericExampleProjectRoot);
  const runResult = await runCommand({
    project: projectRoot,
    request: "Need a structural retrofit for legacy visitor circulation"
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "Visitor circulation across the legacy civic lobby and service counter",
      "Structural safety, safeguarding, fire egress, and accessibility compliance are non-negotiable"
    ]
  });

  const planningExecution = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "planning",
    invokeModel: true,
    provider: "mock"
  });

  const approvalExecution = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    invokeModel: true,
    provider: "mock"
  });

  assert.equal(answerResult.status, "framed");
  assert.equal(answerResult.currentStage, "planning");
  assert.equal(planningExecution.executionStatus, "completed");
  assert.equal(approvalExecution.executionStatus, "completed");
  assert.equal(approvalExecution.execution.approval_outcome.status, "approved");
});

test("runCommand creates a session and initial decision record", async (t) => {
  const projectRoot = await createTempProject(t);
  const result = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "waiting_user");
  assert.equal(result.pendingQuestions.length, 3);
  assert.equal(result.routingMode, "deep-path");

  const session = await loadSession(result.sessionPath);
  assert.equal(session.current_stage, "clarification");
  assert.equal(session.routing_mode, "deep-path");
  assert.equal(session.open_decision_ids.length, 1);
  assert.equal(session.reopen_count, 0);
  assert.deepEqual(session.outcome_reports, []);
  assert.equal(session.stage_transitions.length, 1);
  assert.deepEqual(session.stage_transitions[0], {
    from_stage: null,
    to_stage: "clarification",
    from_status: null,
    to_status: "waiting_user",
    at: session.created_at,
    reason: "session-created"
  });
  assert.deepEqual(session.routing_mode_history, [{
    from_mode: null,
    to_mode: "deep-path",
    at: session.created_at,
    reason: "session-created"
  }]);

  const sessionsDir = path.join(projectRoot, ".aof", "sessions");
  const decisionsDir = path.join(projectRoot, ".aof", "decisions");
  assert.equal(await countGeneratedFiles(sessionsDir, ".json"), 1);
  assert.equal(await countGeneratedFiles(decisionsDir, ".json"), 1);
  assert.equal(await countGeneratedFiles(decisionsDir, ".md"), 1);
});

test("runCommand also projects the initial operating goal into project memory", async (t) => {
  const projectRoot = await createTempProject(t);
  const request = "初回離脱率を下げたい";
  const result = await runCommand({
    project: projectRoot,
    request
  });

  assert.equal(result.projectMemory.operatingGoalProjection?.ok, true);

  const goalProjectionPath = path.join(projectRoot, ".aof", "goals", "operating-goal.json");
  const goalProjection = JSON.parse(await fs.readFile(goalProjectionPath, "utf8"));
  assert.equal(goalProjection.goal_type, "operating-goal");
  assert.equal(goalProjection.content, request);
  assert.equal(goalProjection.agreed_with_human, true);
  assert.equal(goalProjection.source_session_id, result.sessionId);
});

test("runCommand renders markdown using the project decision template shell", async (t) => {
  const projectRoot = await createTempProject(t);
  const templatePath = path.join(projectRoot, ".aof", "templates", "decision-record.md");
  await fs.writeFile(
    templatePath,
    [
      "# Custom Decision Shell: {{decision_id}}",
      "",
      "Rendered At: {{created_at}}",
      "",
      "{{decision_record_content}}",
      "",
      "Footer: project-specific shell",
      ""
    ].join("\n"),
    "utf8"
  );

  const result = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  const markdown = await fs.readFile(result.decisionMarkdownPath, "utf8");
  assert.match(markdown, /^# Custom Decision Shell: DEC-/);
  assert.match(markdown, /Footer: project-specific shell/);
  assert.match(markdown, /## Scope/);
});

test("runCommand validates decision records against the project-local decision schema", async (t) => {
  const projectRoot = await createTempProject(t);
  const schemaPath = path.join(projectRoot, ".aof", "templates", "decision-record.schema.json");
  await fs.writeFile(
    schemaPath,
    `${JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        organization: { type: "integer" }
      },
      required: ["organization"],
      additionalProperties: true
    }, null, 2)}\n`,
    "utf8"
  );

  await assert.rejects(
    runCommand({
      project: projectRoot,
      request: "初回離脱率を下げたい"
    }),
    /project decision record\.organization must be of type integer/
  );
});

test("runCommand cleans up the session if decision creation fails", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);
  const sessionsDir = path.join(projectRoot, ".aof", "sessions");
  const decisionsDir = path.join(projectRoot, ".aof", "decisions");

  await assert.rejects(
    runCommand(
      {
        project: projectRoot,
        request: "初回離脱率を下げたい"
      },
      {
        loadTemplate: async () => template,
        createInitialDecision: async () => {
          const error = new Error("decision creation failed");
          throw error;
        }
      }
    ),
    /decision creation failed/
  );

  assert.equal(await countGeneratedFiles(sessionsDir, ".json"), 0);
  assert.equal(await countGeneratedFiles(decisionsDir, ".json"), 0);
  assert.equal(await countGeneratedFiles(decisionsDir, ".md"), 0);
});

test("runCommand cleans up the session and decision files if attach fails", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);
  const sessionsDir = path.join(projectRoot, ".aof", "sessions");
  const decisionsDir = path.join(projectRoot, ".aof", "decisions");

  await assert.rejects(
    runCommand(
      {
        project: projectRoot,
        request: "初回離脱率を下げたい"
      },
      {
        loadTemplate: async () => template,
        attachOpenDecision: async () => {
          throw new Error("attach failed");
        }
      }
    ),
    /attach failed/
  );

  assert.equal(await countGeneratedFiles(sessionsDir, ".json"), 0);
  assert.equal(await countGeneratedFiles(decisionsDir, ".json"), 0);
  assert.equal(await countGeneratedFiles(decisionsDir, ".md"), 0);
});

test("CLI run emits a session and decision payload", async (t) => {
  const projectRoot = await createTempProject(t);
  const cliPath = path.join(repoRoot, "src", "cli.js");
  const result = spawnCliWithRetry([cliPath, "run", "初回離脱率を下げたい", "--project", projectRoot]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.status, "waiting_user");
  assert.equal(payload.routingMode, "deep-path");
  assert.equal(payload.pendingQuestions.length, 3);
});

test("CLI run accepts --fast-track", async (t) => {
  const projectRoot = await createTempProject(t);
  const cliPath = path.join(repoRoot, "src", "cli.js");
  const result = spawnCliWithRetry([cliPath, "run", "初回離脱率を下げたい", "--project", projectRoot, "--fast-track"]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.routingMode, "fast-track");
});

test("runCommand accepts fast-track routing overrides", async (t) => {
  const projectRoot = await createTempProject(t);
  const result = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  assert.equal(result.routingMode, "fast-track");
  const session = await loadSession(result.sessionPath);
  assert.equal(session.routing_mode, "fast-track");
});

test("council planning differs between deep-path and fast-track", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);

  const deepRun = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });
  const deepSession = await loadSession(deepRun.sessionPath);
  const deepPlan = buildCouncilExecutionPlan({
    template,
    session: deepSession,
    stage: "planning"
  });

  const fastRun = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });
  const fastSession = await loadSession(fastRun.sessionPath);
  const fastPlan = buildCouncilExecutionPlan({
    template,
    session: fastSession,
    stage: "planning"
  });

  assert.equal(deepPlan.routing_mode, "deep-path");
  assert.equal(deepPlan.seats.length, 2);
  assert.equal(deepPlan.seats[1].role, "Visionary");
  assert.equal(fastPlan.routing_mode, "fast-track");
  assert.equal(fastPlan.seats.length, 1);
  assert.equal(fastPlan.primary_role, "Builder");
});

test("fast-track approval uses a single Guardian reviewer", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });
  const session = await loadSession(runResult.sessionPath);
  const plan = buildCouncilExecutionPlan({
    template,
    session,
    stage: "approval"
  });

  assert.equal(plan.routing_mode, "fast-track");
  assert.equal(plan.primary_role, "Guardian");
  assert.equal(plan.approval_mode, "single-reviewer");
  assert.equal(plan.seats.length, 1);
  assert.equal(plan.seats[0].role, "Guardian");
});

test("buildModelInputPacket uses canonical call_purpose values per stage", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });
  const session = await loadSession(runResult.sessionPath);

  const clarificationPacket = buildModelInputPacket({ template, session, stage: "clarification", roleOverride: "" });
  const planningPacket = buildModelInputPacket({ template, session, stage: "planning", roleOverride: "" });
  const proposalPacket = buildModelInputPacket({ template, session, stage: "proposal", roleOverride: "" });
  const reviewPacket = buildModelInputPacket({ template, session, stage: "review", roleOverride: "" });
  const approvalPacket = buildModelInputPacket({ template, session, stage: "approval", roleOverride: "Guardian" });
  const reopenPacket = buildModelInputPacket({ template, session, stage: "reopen", roleOverride: "Visionary" });

  assert.equal(clarificationPacket.metadata.call_purpose, "generate-clarification-questions");
  assert.equal(planningPacket.metadata.call_purpose, "generate-plan");
  assert.equal(proposalPacket.metadata.call_purpose, "generate-proposal");
  assert.equal(reviewPacket.metadata.call_purpose, "generate-review");
  assert.equal(approvalPacket.metadata.call_purpose, "generate-approval-recommendation");
  assert.equal(reopenPacket.metadata.call_purpose, "generate-reopen-recommendation");
});

test("councilExecCommand persists routing_mode on execution runs", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const result = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "planning",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  assert.equal(result.execution.routing_mode, "fast-track");

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.council_execution_runs.length, 1);
  assert.equal(session.council_execution_runs[0].routing_mode, "fast-track");
});

test("councilExecCommand can write a verification artifact", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const artifactPath = path.join(projectRoot, ".aof", "artifacts", "planning-exec.json");
  const result = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "planning",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined,
    artifactPath
  });

  assert.equal(result.executionStatus, "completed");
  assert.equal(result.artifactPath, artifactPath);

  const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  assert.equal(artifact.artifact_type, "council-exec");
  assert.equal(artifact.payload.executionId, result.executionId);
  assert.equal(artifact.payload.executionStatus, "completed");
  assert.equal(artifact.payload.execution.execution_id, result.executionId);
});

test("liveVerifyCommand writes a verification bundle and child artifacts", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const artifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verification");
  const result = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: true,
    includeEscalationTerminal: true,
    signalPath
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "completed");
  assert.equal(result.providerCheck.ok, true);
  assert.equal(result.planningExecution.executionStatus, "completed");

  const providerCheckArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "provider-check.json"), "utf8")
  );
  const planningExecArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "planning-exec.json"), "utf8")
  );
  const proposalExecArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "proposal-exec.json"), "utf8")
  );
  const reviewExecArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "review-exec.json"), "utf8")
  );
  const approvalExecArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "approval-exec.json"), "utf8")
  );
  const signalReopenArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "signal-reopen.json"), "utf8")
  );
  const escalationReopenArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "escalation-reopen.json"), "utf8")
  );
  const escalationApproveResolutionArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "escalation-approve-resolution.json"), "utf8")
  );
  const escalationStopResolutionArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "escalation-stop-resolution.json"), "utf8")
  );
  const bundleArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "verification-bundle.json"), "utf8")
  );
  const reportArtifact = await fs.readFile(path.join(artifactDir, "verification-report.md"), "utf8");

  assert.equal(providerCheckArtifact.artifact_type, "provider-check");
  assert.equal(planningExecArtifact.artifact_type, "council-exec");
  assert.equal(proposalExecArtifact.artifact_type, "council-exec");
  assert.equal(reviewExecArtifact.artifact_type, "council-exec");
  assert.equal(approvalExecArtifact.artifact_type, "council-exec");
  assert.equal(signalReopenArtifact.artifact_type, "signal-reopen");
  assert.equal(escalationReopenArtifact.artifact_type, "escalation-reopen");
  assert.equal(escalationApproveResolutionArtifact.artifact_type, "escalation-approve");
  assert.equal(escalationStopResolutionArtifact.artifact_type, "escalation-stop");
  assert.equal(bundleArtifact.artifact_type, "live-provider-verification");
  assert.equal(bundleArtifact.status, "completed");
  assert.equal(bundleArtifact.verification_context.organization.organization_id, "product-team");
  assert.equal(bundleArtifact.verification_context.organization.language, "ja");
  assert.equal(bundleArtifact.verification_context.workflow.workflow_id, "aidlc");
  assert.equal(bundleArtifact.verification_context.workflow.default_routing_mode, "deep-path");
  assert.equal(bundleArtifact.verification_context.governance.model, "council-of-three");
  assert.equal(bundleArtifact.verification_context.policies.policy_profile_id, "default-product-policy");
  assert.match(bundleArtifact.verification_context.template_assets.decision_record_markdown_path, /decision-record\.md$/);
  assert.match(bundleArtifact.verification_context.template_assets.decision_record_schema_path, /decision-record\.schema\.json$/);
  assert.equal(bundleArtifact.execution_policy.include_middle_stages, true);
  assert.equal(bundleArtifact.execution_policy.include_approval, true);
  assert.equal(bundleArtifact.execution_policy.include_signal_reopen, true);
  assert.equal(bundleArtifact.execution_policy.include_escalation_reopen, true);
  assert.equal(bundleArtifact.execution_policy.include_escalation_terminal, true);
  assert.equal(bundleArtifact.execution_policy.provider, "mock");
  assert.equal(bundleArtifact.execution_policy.routing_mode, "workflow-default");
  assert.equal(bundleArtifact.execution_policy.timeout_ms, 30000);
  assert.equal(bundleArtifact.execution_policy.max_retries, 0);
  assert.equal(bundleArtifact.execution_policy.response_count, 3);
  assert.equal(bundleArtifact.execution_policy.signal_response_count, 1);
  assert.equal(bundleArtifact.execution_policy.escalation_resume_response_count, 1);
  assert.equal(bundleArtifact.execution_policy.used_default_responses, false);
  assert.equal(bundleArtifact.artifacts.provider_check.endsWith("provider-check.json"), true);
  assert.equal(bundleArtifact.artifacts.verification_report.endsWith("verification-report.md"), true);
  assert.equal(bundleArtifact.artifacts.verification_bundle.endsWith("verification-bundle.json"), true);
  assert.equal(bundleArtifact.artifacts.planning_execution.endsWith("planning-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.proposal_execution.endsWith("proposal-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.review_execution.endsWith("review-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.approval_execution.endsWith("approval-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.signal_reopen.endsWith("signal-reopen.json"), true);
  assert.equal(bundleArtifact.artifacts.signal_resume_proposal_execution.endsWith("signal-resume-proposal-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.signal_resume_review_execution.endsWith("signal-resume-review-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_approval_execution.endsWith("escalation-approval-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_reopen.endsWith("escalation-reopen.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_resume_proposal_execution.endsWith("escalation-resume-proposal-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_resume_review_execution.endsWith("escalation-resume-review-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_approve_approval_execution.endsWith("escalation-approve-approval-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_approve_resolution.endsWith("escalation-approve-resolution.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_stop_approval_execution.endsWith("escalation-stop-approval-exec.json"), true);
  assert.equal(bundleArtifact.artifacts.escalation_stop_resolution.endsWith("escalation-stop-resolution.json"), true);
  assert.equal(bundleArtifact.branch_outcomes.happy_path.planning_status, "completed");
  assert.equal(bundleArtifact.branch_outcomes.happy_path.approval_status, "approved");
  assert.equal(bundleArtifact.branch_outcomes.signal_reopen.reopen_status, "reopened");
  assert.equal(bundleArtifact.branch_outcomes.signal_reopen.resume_answer_status, "framed");
  assert.equal(bundleArtifact.branch_outcomes.escalation_reopen.approval_status, "rejected");
  assert.equal(bundleArtifact.branch_outcomes.escalation_reopen.resolution_status, "reopened");
  assert.equal(bundleArtifact.branch_outcomes.escalation_approve.resolution_status, "closed");
  assert.equal(bundleArtifact.branch_outcomes.escalation_stop.resolution_status, "stopped");
  assert.equal(bundleArtifact.verification_recommendation.action, "investigate-drift");
  assert.equal(bundleArtifact.verification_recommendation.urgency, "warning");
  assert.ok(bundleArtifact.verification_recommendation.source_signals.includes("signal-reopen-observed"));
  assert.equal(bundleArtifact.branch_policies.happy_path.routing_mode, "deep-path");
  assert.equal(bundleArtifact.branch_policies.happy_path.include_middle_stages, true);
  assert.equal(bundleArtifact.branch_policies.happy_path.provider, "mock");
  assert.equal(bundleArtifact.branch_policies.signal_reopen.post_reopen_routing_mode, "deep-path");
  assert.equal(bundleArtifact.branch_policies.escalation_reopen.resolution, "reopen");
  assert.equal(bundleArtifact.branch_policies.escalation_approve.resolution, "approve");
  assert.equal(bundleArtifact.branch_policies.escalation_stop.resolution, "stop");
  assert.equal(bundleArtifact.provider_observability.planning.execution_id, result.planningExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.planning.stage, "planning");
  assert.equal(
    bundleArtifact.provider_observability.planning.step_count,
    result.planningExecution.execution.steps.length
  );
  assert.equal(bundleArtifact.provider_observability.planning.observed_step_count, 0);
  assert.deepEqual(bundleArtifact.provider_observability.planning.steps, []);
  assert.equal(bundleArtifact.provider_observability.proposal.execution_id, result.proposalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.proposal.stage, "proposal");
  assert.equal(
    bundleArtifact.provider_observability.proposal.step_count,
    result.proposalExecution.execution.steps.length
  );
  assert.equal(bundleArtifact.provider_observability.proposal.observed_step_count, 0);
  assert.deepEqual(bundleArtifact.provider_observability.proposal.steps, []);
  assert.equal(bundleArtifact.provider_observability.review.execution_id, result.reviewExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.review.stage, "review");
  assert.equal(
    bundleArtifact.provider_observability.review.step_count,
    result.reviewExecution.execution.steps.length
  );
  assert.equal(bundleArtifact.provider_observability.review.observed_step_count, 0);
  assert.deepEqual(bundleArtifact.provider_observability.review.steps, []);
  assert.equal(bundleArtifact.provider_observability.approval.execution_id, result.approvalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.approval.stage, "approval");
  assert.equal(
    bundleArtifact.provider_observability.approval.step_count,
    result.approvalExecution.execution.steps.length
  );
  assert.equal(bundleArtifact.provider_observability.approval.observed_step_count, 0);
  assert.deepEqual(bundleArtifact.provider_observability.approval.steps, []);
  assert.equal(bundleArtifact.provider_observability.signal_resume_proposal.execution_id, result.signalResumeProposalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.signal_resume_proposal.stage, "proposal");
  assert.equal(bundleArtifact.provider_observability.signal_resume_proposal.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.signal_resume_review.execution_id, result.signalResumeReviewExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.signal_resume_review.stage, "review");
  assert.equal(bundleArtifact.provider_observability.signal_resume_review.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_approval.execution_id, result.escalationApprovalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_approval.stage, "approval");
  assert.equal(bundleArtifact.provider_observability.escalation_approval.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_resume_proposal.execution_id, result.escalationResumeProposalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_resume_proposal.stage, "proposal");
  assert.equal(bundleArtifact.provider_observability.escalation_resume_proposal.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_resume_review.execution_id, result.escalationResumeReviewExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_resume_review.stage, "review");
  assert.equal(bundleArtifact.provider_observability.escalation_resume_review.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_approve_approval.execution_id, result.escalationApproveApprovalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_approve_approval.stage, "approval");
  assert.equal(bundleArtifact.provider_observability.escalation_approve_approval.observed_step_count, 0);
  assert.equal(bundleArtifact.provider_observability.escalation_stop_approval.execution_id, result.escalationStopApprovalExecution.executionId);
  assert.equal(bundleArtifact.provider_observability.escalation_stop_approval.stage, "approval");
  assert.equal(bundleArtifact.provider_observability.escalation_stop_approval.observed_step_count, 0);
  assert.equal(result.signalReopen.status, "reopened");
  assert.equal(result.signalResumeAnswer.status, "framed");
  assert.equal(result.escalationReopen.status, "reopened");
  assert.equal(result.escalationResumeAnswer.status, "framed");
  assert.equal(result.escalationApproveResolution.status, "closed");
  assert.equal(result.escalationStopResolution.status, "stopped");
  assert.equal(bundleArtifact.planningExecution.executionStatus, "completed");
  assert.equal(bundleArtifact.approvalExecution.executionStatus, "completed");
  assert.equal(bundleArtifact.approvalExecution.execution.approval_outcome.status, "approved");
  assert.equal(bundleArtifact.escalationApprovalExecution.execution.approval_outcome.status, "rejected");
  assert.equal(bundleArtifact.escalationApproveApprovalExecution.execution.approval_outcome.status, "rejected");
  assert.equal(bundleArtifact.escalationStopApprovalExecution.execution.approval_outcome.status, "rejected");
  assert.equal(result.reportPath.endsWith("verification-report.md"), true);
  assert.match(reportArtifact, /^# Live Verification Report/m);
  assert.match(reportArtifact, /## Verification Context/);
  assert.match(reportArtifact, /## Execution Policy/);
  assert.match(reportArtifact, /## Branch Outcomes/);
  assert.match(reportArtifact, /## Branch Policies/);
  assert.match(reportArtifact, /## Provider Observability/);
  assert.match(reportArtifact, /## Artifact Inventory/);
  assert.match(reportArtifact, /organization: product-team \(Product Team\)/);
  assert.match(reportArtifact, /happy path approval: approved/);
  assert.match(reportArtifact, /signal reopen status: reopened/);
  assert.match(reportArtifact, /escalation stop resolution: stopped/);
  assert.match(reportArtifact, /verification_report: .*verification-report\.md/);
});

test("liveVerifyCommand summarizes provider response metadata in the verification bundle", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const artifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verification-openai");
  const originalFetch = global.fetch;
  let chatCompletionCount = 0;

  global.fetch = async (url) => {
    if (String(url).endsWith("/models")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: "gpt-4.1-mini" }]
        })
      };
    }

    chatCompletionCount += 1;
    const responseMatrix = [
      {
        requestId: "req_planning_123",
        processingMs: "211",
        remainingRequests: "4998",
        remainingTokens: "198000",
        content: "DECISION: proceed\nPlanning looks acceptable."
      },
      {
        requestId: "req_middle_234",
        processingMs: "233",
        remainingRequests: "4997",
        remainingTokens: "197500",
        content: "DECISION: proceed\nProposal looks acceptable."
      },
      {
        requestId: "req_middle_234",
        processingMs: "237",
        remainingRequests: "4997",
        remainingTokens: "197000",
        content: "DECISION: proceed\nReview looks acceptable."
      },
      {
        requestId: "req_approval_456",
        processingMs: "433",
        remainingRequests: "4996",
        remainingTokens: "196500",
        content: "DECISION: approve\nVETO: no\nApproval looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "255",
        remainingRequests: "4995",
        remainingTokens: "196000",
        content: "DECISION: proceed\nSignal resume proposal looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "256",
        remainingRequests: "4995",
        remainingTokens: "195900",
        content: "DECISION: proceed\nSignal resume proposal looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "257",
        remainingRequests: "4995",
        remainingTokens: "195800",
        content: "DECISION: proceed\nSignal resume proposal looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "259",
        remainingRequests: "4995",
        remainingTokens: "195500",
        content: "DECISION: proceed\nSignal resume review looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "260",
        remainingRequests: "4995",
        remainingTokens: "195400",
        content: "DECISION: proceed\nSignal resume review looks acceptable."
      },
      {
        requestId: "req_signal_567",
        processingMs: "261",
        remainingRequests: "4995",
        remainingTokens: "195300",
        content: "DECISION: proceed\nSignal resume review looks acceptable."
      },
      {
        requestId: "req_escalation_678",
        processingMs: "477",
        remainingRequests: "4994",
        remainingTokens: "195000",
        content: "DECISION: reject\nVETO: yes\nEscalation branch requires human review."
      },
      {
        requestId: "req_escalation_resume_789",
        processingMs: "281",
        remainingRequests: "4993",
        remainingTokens: "194500",
        content: "DECISION: proceed\nEscalation resume proposal looks acceptable."
      },
      {
        requestId: "req_escalation_resume_789",
        processingMs: "286",
        remainingRequests: "4993",
        remainingTokens: "194000",
        content: "DECISION: proceed\nEscalation resume review looks acceptable."
      },
      {
        requestId: "req_escalation_approve_901",
        processingMs: "488",
        remainingRequests: "4992",
        remainingTokens: "193500",
        content: "DECISION: reject\nVETO: yes\nEscalation approve branch requires human review."
      },
      {
        requestId: "req_escalation_stop_902",
        processingMs: "489",
        remainingRequests: "4991",
        remainingTokens: "193000",
        content: "DECISION: reject\nVETO: yes\nEscalation stop branch requires human review."
      }
    ];
    const current = responseMatrix[chatCompletionCount - 1];
    return {
      ok: true,
      status: 200,
      headers: {
        get(name) {
          const values = {
            "x-request-id": current.requestId,
            "openai-processing-ms": current.processingMs,
            "x-ratelimit-remaining-requests": current.remainingRequests,
            "x-ratelimit-remaining-tokens": current.remainingTokens
          };
          return values[name] ?? null;
        }
      },
      json: async () => ({
        choices: [
          {
            message: {
              content: current.content
            }
          }
        ]
      })
    };
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: "fast-track",
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678",
    apiKeyEnv: "",
    temperature: undefined,
    ping: true,
    artifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: true,
    includeEscalationTerminal: true,
    signalPath,
    timeoutMs: 30000,
    maxRetries: 0
  });

  assert.equal(result.ok, true);
  const bundleArtifact = JSON.parse(
    await fs.readFile(path.join(artifactDir, "verification-bundle.json"), "utf8")
  );
  const reportArtifact = await fs.readFile(path.join(artifactDir, "verification-report.md"), "utf8");

  assert.equal(bundleArtifact.verification_context.organization.language, "ja");
  assert.equal(bundleArtifact.verification_context.workflow.name, "AIDLC");
  assert.equal(bundleArtifact.verification_context.governance.escalation_target, "human-maintainer");
  assert.deepEqual(bundleArtifact.verification_context.policies.default_priority_order, [
    "value",
    "quality",
    "safety",
    "speed",
    "cost"
  ]);
  assert.equal(bundleArtifact.branch_policies.happy_path.routing_mode, "fast-track");
  assert.equal(bundleArtifact.branch_policies.happy_path.provider, "openai-compatible");
  assert.equal(bundleArtifact.branch_policies.happy_path.model, "gpt-4.1-mini");
  assert.equal(bundleArtifact.branch_policies.signal_reopen.routing_escalated, true);
  assert.equal(bundleArtifact.branch_policies.escalation_reopen.resolution_note, "Need broader clarification after approval rejection");
  assert.equal(bundleArtifact.branch_policies.escalation_approve.resolution_note, "Human approver accepted the exception");
  assert.equal(bundleArtifact.branch_policies.escalation_stop.resolution_note, "Human approver chose to stop the work");
  assert.equal(bundleArtifact.provider_observability.planning.stage, "planning");
  assert.equal(bundleArtifact.provider_observability.planning.observed_step_count, 1);
  assert.deepEqual(bundleArtifact.provider_observability.planning.steps[0], {
    role: "Builder",
    response_status: 200,
    request_id: "req_planning_123",
    processing_ms: "211",
    remaining_requests: "4998",
    remaining_tokens: "198000",
    retry_after: null
  });

  assert.equal(bundleArtifact.provider_observability.proposal.stage, "proposal");
  assert.equal(
    bundleArtifact.provider_observability.proposal.observed_step_count,
    result.proposalExecution.execution.steps.length
  );
  assert.deepEqual(
    bundleArtifact.provider_observability.proposal.steps.map((step) => step.request_id),
    result.proposalExecution.execution.steps.map(() => "req_middle_234")
  );

  assert.equal(bundleArtifact.provider_observability.review.stage, "review");
  assert.equal(
    bundleArtifact.provider_observability.review.observed_step_count,
    result.reviewExecution.execution.steps.length
  );
  assert.deepEqual(
    bundleArtifact.provider_observability.review.steps.map((step) => step.request_id),
    result.reviewExecution.execution.steps.map(() => "req_middle_234")
  );

  assert.equal(bundleArtifact.provider_observability.approval.stage, "approval");
  assert.equal(
    bundleArtifact.provider_observability.approval.observed_step_count,
    result.approvalExecution.execution.steps.length
  );
  assert.deepEqual(
    bundleArtifact.provider_observability.approval.steps.map((step) => step.request_id),
    result.approvalExecution.execution.steps.map(() => "req_approval_456")
  );

  assert.equal(bundleArtifact.provider_observability.signal_resume_proposal.stage, "proposal");
  assert.deepEqual(
    bundleArtifact.provider_observability.signal_resume_proposal.steps.map((step) => step.request_id),
    result.signalResumeProposalExecution.execution.steps.map(() => "req_signal_567")
  );

  assert.equal(bundleArtifact.provider_observability.signal_resume_review.stage, "review");
  assert.deepEqual(
    bundleArtifact.provider_observability.signal_resume_review.steps.map((step) => step.request_id),
    result.signalResumeReviewExecution.execution.steps.map(() => "req_signal_567")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_approval.stage, "approval");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_approval.steps.map((step) => step.request_id),
    result.escalationApprovalExecution.execution.steps.map(() => "req_escalation_678")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_resume_proposal.stage, "proposal");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_resume_proposal.steps.map((step) => step.request_id),
    result.escalationResumeProposalExecution.execution.steps.map(() => "req_escalation_resume_789")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_resume_review.stage, "review");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_resume_review.steps.map((step) => step.request_id),
    result.escalationResumeReviewExecution.execution.steps.map(() => "req_escalation_resume_789")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_approve_approval.stage, "approval");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_approve_approval.steps.map((step) => step.request_id),
    result.escalationApproveApprovalExecution.execution.steps.map(() => "req_escalation_approve_901")
  );

  assert.equal(bundleArtifact.provider_observability.escalation_stop_approval.stage, "approval");
  assert.deepEqual(
    bundleArtifact.provider_observability.escalation_stop_approval.steps.map((step) => step.request_id),
    result.escalationStopApprovalExecution.execution.steps.map(() => "req_escalation_stop_902")
  );
  assert.equal(bundleArtifact.branch_outcomes.happy_path.proposal_status, "completed");
  assert.equal(bundleArtifact.branch_outcomes.happy_path.review_status, "completed");
  assert.equal(bundleArtifact.branch_outcomes.happy_path.approval_status, "approved");
  assert.equal(bundleArtifact.branch_outcomes.signal_reopen.routing_mode, "deep-path");
  assert.equal(bundleArtifact.branch_outcomes.escalation_reopen.guardian_veto_used, true);
  assert.equal(bundleArtifact.branch_outcomes.escalation_approve.approval_status, "rejected");
  assert.equal(bundleArtifact.branch_outcomes.escalation_stop.approval_status, "rejected");
  assert.equal(bundleArtifact.verification_recommendation.action, "investigate-drift");
  assert.equal(bundleArtifact.verification_recommendation.urgency, "warning");
  assert.match(reportArtifact, /provider: openai-compatible/);
  assert.match(reportArtifact, /model: gpt-4\.1-mini/);
  assert.match(reportArtifact, /remaining_requests=4998/);
  assert.match(reportArtifact, /escalation approve note: Human approver accepted the exception/);
});

test("liveVerifyCommand can archive its own verification run into the project-local archive", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const artifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verification-archived");

  const result = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath,
    archiveVerification: true,
    archiveDir: "",
    archiveMaxRuns: 1
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "completed");
  assert.equal(result.archiveResult?.ok, true);
  assert.equal(result.archiveResult?.importedCount, 1);
  assert.equal(result.archiveResult?.skippedCount, 0);
  assert.equal(result.archiveResult?.overallRecommendedAction, "investigate-lineage-drift");
  assert.equal(result.archiveResult?.dashboardIndexRecommendedAction, "human-review-recommended");

  const manifestJson = JSON.parse(await fs.readFile(result.archiveResult.manifestJsonPath, "utf8"));
  const archiveIndexJson = JSON.parse(await fs.readFile(result.archiveResult.archiveIndexJsonPath, "utf8"));
  const dashboardIndexJson = JSON.parse(await fs.readFile(result.archiveResult.dashboardIndexJsonPath, "utf8"));

  assert.equal(manifestJson.artifact_type, "verification-archive-manifest");
  assert.equal(manifestJson.run_count, 1);
  assert.equal(manifestJson.entries.length, 1);
  assert.equal(manifestJson.retention_policy.max_runs, 1);
  assert.equal(manifestJson.entries[0].source_bundle_path, result.bundlePath);
  assert.ok(manifestJson.entries[0].archived_bundle_path.endsWith("verification-bundle.json"));
  assert.equal(archiveIndexJson.artifact_type, "verification-archive-index");
  assert.equal(archiveIndexJson.retained_count, 1);
  assert.equal(archiveIndexJson.retention_policy.max_runs, 1);
  assert.equal(archiveIndexJson.retention_reached, true);
  assert.equal(archiveIndexJson.health_status, "critical");
  assert.equal(archiveIndexJson.threshold_status, "breached");
  assert.equal(archiveIndexJson.operator_recommendation.action, "human-review-recommended");
  assert.ok(archiveIndexJson.alerts.some((item) => item.code === "archive-retention-capacity-reached"));
  assert.ok(archiveIndexJson.threshold_breaches.some((item) => item.code === "archive-dashboard-threshold-required-within"));
  assert.equal(archiveIndexJson.latest_archived_run.source_bundle_path, result.bundlePath);
  assert.equal(archiveIndexJson.overall_operator_recommendation, "investigate-lineage-drift");
  assert.equal(archiveIndexJson.dashboard_index_recommendation, "human-review-recommended");

  assert.equal(dashboardIndexJson.artifact_type, "verification-dashboard-index");
  assert.equal(dashboardIndexJson.health_status, "warning");
  assert.equal(dashboardIndexJson.threshold_status, "breached");
  assert.equal(dashboardIndexJson.operator_recommendation.action, "human-review-recommended");
});

test("verifyHistoryCommand aggregates multiple verification bundles into JSON and Markdown history artifacts", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const firstArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-history-a");
  const secondArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-history-b");
  const historyArtifactDir = path.join(projectRoot, ".aof", "artifacts", "verification-history");

  const firstResult = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const secondResult = await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const result = await verifyHistoryCommand({
    inputs: [
      firstArtifactDir,
      path.join(secondArtifactDir, "verification-bundle.json")
    ],
    artifactDir: historyArtifactDir
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "completed");
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.providers, ["mock"]);
  assert.deepEqual(result.workflows, ["aidlc"]);
  assert.equal(result.historyJsonPath.endsWith("verification-history.json"), true);
  assert.equal(result.historyReportPath.endsWith("verification-history.md"), true);

  const historyJson = JSON.parse(await fs.readFile(result.historyJsonPath, "utf8"));
  const historyReport = await fs.readFile(result.historyReportPath, "utf8");

  assert.equal(historyJson.artifact_type, "verification-history");
  assert.equal(historyJson.entry_count, 2);
  assert.deepEqual(historyJson.summary.providers, ["mock"]);
  assert.deepEqual(historyJson.summary.workflows, ["aidlc"]);
  assert.equal(historyJson.summary.statuses.completed, 2);
  assert.equal(historyJson.summary.drift.has_drift, true);
  assert.equal(historyJson.summary.recommendation.first_action, "investigate-drift");
  assert.equal(historyJson.summary.recommendation.first_urgency, "warning");
  assert.equal(historyJson.summary.recommendation.latest_action, "continue-monitoring");
  assert.equal(historyJson.summary.recommendation.latest_urgency, "healthy");
  assert.equal(historyJson.summary.recommendation.previous_action, "investigate-drift");
  assert.equal(historyJson.summary.recommendation.previous_urgency, "warning");
  assert.equal(historyJson.summary.recommendation.latest_transition, "de-escalated");
  assert.deepEqual(historyJson.summary.recommendation.distinct_actions, [
    "investigate-drift",
    "continue-monitoring"
  ]);
  assert.deepEqual(historyJson.summary.recommendation.distinct_urgencies, [
    "warning",
    "healthy"
  ]);
  assert.deepEqual(
    historyJson.summary.recommendation.timeline.map((item) => [item.entry_index, item.action, item.urgency]),
    [
      [0, "investigate-drift", "warning"],
      [1, "continue-monitoring", "healthy"]
    ]
  );
  assert.deepEqual(historyJson.summary.drift.fields_with_drift, [
    "routing_mode",
    "verification_recommendation_action",
    "verification_recommendation_urgency",
    "signal_reopen_status"
  ]);
  assert.deepEqual(historyJson.summary.latest_comparison.changed_fields, [
    "routing_mode",
    "verification_recommendation_action",
    "verification_recommendation_urgency",
    "signal_reopen_status"
  ]);
  assert.equal(historyJson.summary.latest_comparison.fields.find((field) => field.field === "routing_mode")?.from, "deep-path");
  assert.equal(historyJson.summary.latest_comparison.fields.find((field) => field.field === "routing_mode")?.to, "fast-track");
  assert.equal(historyJson.summary.latest_comparison.fields.find((field) => field.field === "verification_recommendation_action")?.from, "investigate-drift");
  assert.equal(historyJson.summary.latest_comparison.fields.find((field) => field.field === "verification_recommendation_action")?.to, "continue-monitoring");
  assert.equal(historyJson.entries[0].workflow.workflow_id, "aidlc");
  assert.equal(historyJson.entries[0].provider, "mock");
  assert.equal(historyJson.entries[0].verification_recommendation.action, "investigate-drift");
  assert.equal(historyJson.entries[0].branch_outcomes.happy_path.approval_status, "approved");
  assert.equal(historyJson.entries[1].routing_mode, "fast-track");
  assert.equal(historyJson.entries[1].verification_recommendation.action, "continue-monitoring");
  assert.equal(historyJson.entries[1].branch_policies.happy_path.routing_mode, "fast-track");
  assert.equal(historyJson.entries[1].provider_observability.observed_stage_count, 0);
  assert.deepEqual(historyJson.sources, [
    path.resolve(firstArtifactDir),
    path.resolve(path.join(secondArtifactDir, "verification-bundle.json"))
  ]);

  assert.match(historyReport, /^# Verification History Report/m);
  assert.match(historyReport, /entry count: 2/);
  assert.match(historyReport, /providers: mock/);
  assert.match(historyReport, /workflows: aidlc/);
  assert.match(historyReport, /## Drift Summary/);
  assert.match(historyReport, /fields with drift: routing_mode, verification_recommendation_action, verification_recommendation_urgency, signal_reopen_status/);
  assert.match(historyReport, /routing_mode: has_drift=true, distinct=deep-path, fast-track/);
  assert.match(historyReport, /verification_recommendation_action: has_drift=true, distinct=investigate-drift, continue-monitoring/);
  assert.match(historyReport, /## Latest Comparison/);
  assert.match(historyReport, /changed fields: routing_mode, verification_recommendation_action, verification_recommendation_urgency, signal_reopen_status/);
  assert.match(historyReport, /routing_mode: from=deep-path, to=fast-track, changed=true/);
  assert.match(historyReport, /verification_recommendation_action: from=investigate-drift, to=continue-monitoring, changed=true/);
  assert.match(historyReport, /## Recommendation Summary/);
  assert.match(historyReport, /first action: investigate-drift/);
  assert.match(historyReport, /latest action: continue-monitoring/);
  assert.match(historyReport, /latest transition: de-escalated/);
  assert.match(historyReport, /distinct actions: investigate-drift, continue-monitoring/);
  assert.match(historyReport, /\[0\] generated_at=.*action=investigate-drift, urgency=warning/);
  assert.match(historyReport, /\[1\] generated_at=.*action=continue-monitoring, urgency=healthy/);
  assert.match(historyReport, /## Entries/);
  assert.match(historyReport, /verification recommendation: investigate-drift \/ urgency=warning/);
  assert.match(historyReport, /happy path approval: approved/);
  assert.match(historyReport, /routing mode: fast-track/);

  assert.equal(firstResult.ok, true);
  assert.equal(secondResult.ok, true);
});

test("verifyLogCommand appends verification entries and deduplicates by bundle path", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const firstArtifactDir = path.join(projectRoot, ".aof", "artifacts", "log-a");
  const secondArtifactDir = path.join(projectRoot, ".aof", "artifacts", "log-b");
  const logArtifactDir = path.join(projectRoot, ".aof", "artifacts", "verification-log");

  const firstResult = await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const secondResult = await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const firstAppend = await verifyLogCommand({
    inputs: [firstArtifactDir],
    artifactDir: logArtifactDir
  });
  const secondAppend = await verifyLogCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: logArtifactDir
  });

  assert.equal(firstAppend.ok, true);
  assert.equal(firstAppend.entryCount, 1);
  assert.equal(secondAppend.ok, true);
  assert.equal(secondAppend.entryCount, 2);

  const logJson = JSON.parse(await fs.readFile(secondAppend.logJsonPath, "utf8"));
  const logReport = await fs.readFile(secondAppend.logReportPath, "utf8");
  const indexJson = JSON.parse(await fs.readFile(secondAppend.indexJsonPath, "utf8"));
  const indexReport = await fs.readFile(secondAppend.indexReportPath, "utf8");

  assert.equal(logJson.artifact_type, "verification-log");
  assert.equal(logJson.entry_count, 2);
  assert.equal(logJson.summary.statuses.completed, 2);
  assert.deepEqual(logJson.summary.providers, ["mock"]);
  assert.deepEqual(logJson.summary.workflows, ["aidlc"]);
  assert.equal(logJson.threshold_trend.first_breach_generated_at, logJson.entries[1].generated_at);
  assert.equal(logJson.threshold_trend.latest_breach_generated_at, logJson.entries[1].generated_at);
  assert.equal(logJson.threshold_trend.consecutive_breached_run_count, 1);
  assert.equal(logJson.threshold_trend.latest_trend, "worsened");
  assert.equal(logJson.operator_recommendation.action, "investigate-drift");
  assert.equal(logJson.operator_recommendation.urgency, "warning");
  assert.ok(logJson.operator_recommendation.source_signals.includes("warning-alert-threshold-exceeded"));
  assert.equal(logJson.recommendation_trend.first_non_monitoring_generated_at, logJson.entries[1].generated_at);
  assert.equal(logJson.recommendation_trend.latest_action, "investigate-drift");
  assert.equal(logJson.recommendation_trend.latest_urgency, "warning");
  assert.equal(logJson.recommendation_trend.latest_transition, "escalated");
  assert.equal(logJson.recommendation_trend.consecutive_identical_recommendation_count, 1);
  assert.deepEqual(
    logJson.threshold_trend.timeline.map((item) => [item.entry_index, item.threshold_status, item.threshold_breach_count]),
    [
      [0, "within-threshold", 0],
      [1, "breached", 1]
    ]
  );
  assert.deepEqual(
    logJson.recommendation_trend.timeline.map((item) => [item.entry_index, item.action, item.urgency]),
    [
      [0, "continue-monitoring", "healthy"],
      [1, "investigate-drift", "warning"]
    ]
  );
  assert.equal(logJson.entries.length, 2);
  assert.equal(logJson.entries[0].bundle_path, path.join(firstArtifactDir, "verification-bundle.json"));
  assert.equal(logJson.entries[1].bundle_path, path.join(secondArtifactDir, "verification-bundle.json"));
  assert.equal(logJson.summary.latest_comparison.fields.find((field) => field.field === "routing_mode")?.to, "fast-track");
  assert.match(logReport, /^# Verification Log Report/m);
  assert.match(logReport, /entry count: 2/);
  assert.match(logReport, /changed fields: routing_mode/);
  assert.match(logReport, /routing_mode: from=deep-path, to=fast-track, changed=true/);
  assert.match(logReport, /## Operator Recommendation/);
  assert.match(logReport, /action: investigate-drift/);
  assert.match(logReport, /urgency: warning/);
  assert.match(logReport, /## Recommendation Trend/);
  assert.match(logReport, /first non-monitoring generated at:/);
  assert.match(logReport, /latest transition: escalated/);
  assert.match(logReport, /\[0\] generated_at=.*action=continue-monitoring, urgency=healthy/);
  assert.match(logReport, /\[1\] generated_at=.*action=investigate-drift, urgency=warning/);
  assert.match(logReport, /## Threshold Trend/);
  assert.match(logReport, /first breach generated at:/);
  assert.match(logReport, /consecutive breached run count: 1/);
  assert.match(logReport, /latest trend: worsened/);
  assert.match(logReport, /\[0\] generated_at=.*threshold_status=within-threshold, threshold_breach_count=0/);
  assert.match(logReport, /\[1\] generated_at=.*threshold_status=breached, threshold_breach_count=1/);
  assert.equal(indexJson.artifact_type, "verification-index");
  assert.equal(indexJson.entry_count, 2);
  assert.equal(indexJson.health_status, "warning");
  assert.equal(indexJson.threshold_status, "breached");
  assert.equal(indexJson.operator_recommendation.action, "investigate-drift");
  assert.equal(indexJson.operator_recommendation.urgency, "warning");
  assert.equal(indexJson.recommendation_summary.first_non_monitoring_generated_at, logJson.entries[1].generated_at);
  assert.equal(indexJson.recommendation_summary.latest_action, "investigate-drift");
  assert.equal(indexJson.recommendation_summary.latest_urgency, "warning");
  assert.equal(indexJson.recommendation_summary.latest_transition, "escalated");
  assert.equal(indexJson.recommendation_summary.previous_action, "continue-monitoring");
  assert.equal(indexJson.recommendation_summary.previous_urgency, "healthy");
  assert.equal(indexJson.recommendation_summary.latest_generated_at, logJson.entries[1].generated_at);
  assert.equal(indexJson.recommendation_summary.consecutive_identical_recommendation_count, 1);
  assert.equal(indexJson.summary.alert_count, 2);
  assert.deepEqual(indexJson.monitoring_policy.field_severity.critical, [
    "provider",
    "model",
    "workflow_id",
    "happy_path_approval_status"
  ]);
  assert.deepEqual(indexJson.monitoring_policy.field_severity.warning, [
    "routing_mode",
    "verification_recommendation_action",
    "verification_recommendation_urgency",
    "signal_reopen_status",
    "escalation_reopen_status",
    "escalation_approve_status",
    "escalation_stop_status"
  ]);
  assert.deepEqual(indexJson.summary.alert_severity_counts, {
    critical: 0,
    warning: 2,
    info: 0
  });
  assert.deepEqual(indexJson.monitoring_policy.thresholds, {
    max_critical_alerts: 0,
    max_warning_alerts: 1,
    require_latest_run_completed: true,
    require_latest_happy_path_approved: true,
    min_observed_provider_stages_non_mock: 1
  });
  assert.deepEqual(indexJson.summary.threshold_breach_severity_counts, {
    critical: 0,
    warning: 1,
    info: 0
  });
  assert.equal(indexJson.summary.threshold_breach_count, 1);
  assert.deepEqual(indexJson.summary.drift_fields, [
    "routing_mode"
  ]);
  assert.deepEqual(indexJson.summary.latest_changed_fields, [
    "routing_mode"
  ]);
  assert.deepEqual(
    indexJson.alerts.map((alert) => [alert.code, alert.severity]),
    [
      ["verification-drift-detected", "warning"],
      ["latest-comparison-changes-detected", "warning"]
    ]
  );
  assert.deepEqual(
    indexJson.threshold_breaches.map((breach) => [breach.code, breach.severity]),
    [
      ["warning-alert-threshold-exceeded", "warning"]
    ]
  );
  assert.equal(indexJson.latest_entry.status, "completed");
  assert.equal(indexJson.latest_entry.routing_mode, "fast-track");
  assert.equal(indexJson.latest_entry.provider, "mock");
  assert.equal(indexJson.latest_entry.workflow.workflow_id, "aidlc");
  assert.match(indexReport, /^# Verification Index Report/m);
  assert.match(indexReport, /health status: warning/);
  assert.match(indexReport, /threshold status: breached/);
  assert.match(indexReport, /action: investigate-drift/);
  assert.match(indexReport, /urgency: warning/);
  assert.match(indexReport, /## Recommendation Summary/);
  assert.match(indexReport, /latest transition: escalated/);
  assert.match(indexReport, /previous action: continue-monitoring/);
  assert.match(indexReport, /consecutive identical recommendation count: 1/);
  assert.match(indexReport, /alert count: 2/);
  assert.match(indexReport, /alert severity counts: critical=0, warning=2, info=0/);
  assert.match(indexReport, /threshold breach count: 1/);
  assert.match(indexReport, /threshold breach severity counts: critical=0, warning=1, info=0/);
  assert.match(indexReport, /critical fields: provider, model, workflow_id, happy_path_approval_status/);
  assert.match(indexReport, /warning fields: routing_mode, verification_recommendation_action, verification_recommendation_urgency, signal_reopen_status, escalation_reopen_status, escalation_approve_status, escalation_stop_status/);
  assert.match(indexReport, /max warning alerts: 1/);
  assert.match(indexReport, /\[warning\] verification-drift-detected:/);
  assert.match(indexReport, /\[warning\] latest-comparison-changes-detected:/);
  assert.match(indexReport, /\[warning\] warning-alert-threshold-exceeded:/);
  assert.match(indexReport, /status: completed/);
  assert.match(indexReport, /latest changed fields: routing_mode/);
  assert.match(indexReport, /routing mode: fast-track/);

  assert.equal(firstResult.ok, true);
  assert.equal(secondResult.ok, true);
});

test("verifyLineageCommand summarizes recommendation lineage across verification artifacts", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const firstArtifactDir = path.join(projectRoot, ".aof", "artifacts", "lineage-a");
  const secondArtifactDir = path.join(projectRoot, ".aof", "artifacts", "lineage-b");
  const historyArtifactDir = path.join(projectRoot, ".aof", "artifacts", "lineage-history");
  const logArtifactDir = path.join(projectRoot, ".aof", "artifacts", "lineage-log");
  const lineageArtifactDir = path.join(projectRoot, ".aof", "artifacts", "lineage-summary");

  await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const historyResult = await verifyHistoryCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: historyArtifactDir
  });
  const logResult = await verifyLogCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: logArtifactDir
  });
  const lineageResult = await verifyLineageCommand({
    historyInput: historyResult.historyJsonPath,
    logInput: logResult.logJsonPath,
    indexInput: logResult.indexJsonPath,
    artifactDir: lineageArtifactDir
  });

  assert.equal(lineageResult.ok, true);
  assert.equal(lineageResult.status, "completed");
  assert.equal(lineageResult.currentAction, "investigate-drift");
  assert.equal(lineageResult.currentTransition, "escalated");
  assert.equal(lineageResult.healthStatus, "warning");
  assert.equal(lineageResult.thresholdStatus, "breached");
  assert.equal(lineageResult.operatorRecommendation, "investigate-lineage-drift");
  assert.deepEqual(lineageResult.distinctActions, [
    "investigate-drift",
    "continue-monitoring"
  ]);

  const lineageJson = JSON.parse(await fs.readFile(lineageResult.lineageJsonPath, "utf8"));
  const lineageReport = await fs.readFile(lineageResult.lineageReportPath, "utf8");

  assert.equal(lineageJson.artifact_type, "verification-lineage");
  assert.equal(lineageJson.health_status, "warning");
  assert.equal(lineageJson.operator_recommendation.action, "investigate-lineage-drift");
  assert.equal(lineageJson.operator_recommendation.urgency, "warning");
  assert.ok(lineageJson.operator_recommendation.source_signals.includes("history-index-action-divergence"));
  assert.equal(lineageJson.trend_summary.health_direction, "worsened");
  assert.equal(lineageJson.trend_summary.recommendation_direction, "worsened");
  assert.equal(lineageJson.trend_summary.alert_direction, "increased");
  assert.equal(lineageJson.trend_summary.source_snapshots.history_transition, "de-escalated");
  assert.equal(lineageJson.trend_summary.source_snapshots.current_transition, "escalated");
  assert.equal(lineageJson.threshold_status, "breached");
  assert.deepEqual(lineageJson.monitoring_policy.thresholds, {
    max_critical_alerts: 0,
    max_warning_alerts: 0,
    allow_recommendation_worsened: false,
    require_healthy_for_continue_monitoring: true
  });
  assert.equal(lineageJson.summary.alert_count, 2);
  assert.equal(lineageJson.summary.alert_severity_counts.warning, 2);
  assert.equal(lineageJson.summary.threshold_breach_count, 2);
  assert.equal(lineageJson.summary.current_action, "investigate-drift");
  assert.equal(lineageJson.summary.current_urgency, "warning");
  assert.equal(lineageJson.summary.current_transition, "escalated");
  assert.equal(lineageJson.summary.history_transition, "de-escalated");
  assert.equal(lineageJson.summary.log_transition, "escalated");
  assert.deepEqual(lineageJson.summary.distinct_actions, [
    "investigate-drift",
    "continue-monitoring"
  ]);
  assert.deepEqual(lineageJson.summary.distinct_urgencies, [
    "warning",
    "healthy"
  ]);
  assert.equal(lineageJson.summary.layer_snapshots.history.latest_action, "continue-monitoring");
  assert.equal(lineageJson.summary.layer_snapshots.history.latest_transition, "de-escalated");
  assert.equal(lineageJson.summary.layer_snapshots.log.latest_action, "investigate-drift");
  assert.equal(lineageJson.summary.layer_snapshots.log.latest_transition, "escalated");
  assert.equal(lineageJson.summary.layer_snapshots.index.latest_action, "investigate-drift");
  assert.equal(lineageJson.summary.layer_snapshots.index.latest_transition, "escalated");
  assert.equal(lineageJson.summary.layer_snapshots.index.previous_action, "continue-monitoring");
  assert.equal(lineageJson.summary.timeline_entry_count, 5);
  assert.deepEqual(
    lineageJson.alerts.map((alert) => [alert.code, alert.severity]),
    [
      ["history-index-action-divergence", "warning"],
      ["history-index-transition-divergence", "warning"]
    ]
  );
  assert.deepEqual(
    lineageJson.threshold_breaches.map((breach) => [breach.code, breach.severity]),
    [
      ["warning-alert-threshold-exceeded", "warning"],
      ["recommendation-worsened-not-allowed", "warning"]
    ]
  );
  assert.deepEqual(
    lineageJson.timeline.map((item) => [item.layer, item.action, item.urgency]),
    [
      ["history", "investigate-drift", "warning"],
      ["history", "continue-monitoring", "healthy"],
      ["log", "continue-monitoring", "healthy"],
      ["log", "investigate-drift", "warning"],
      ["index", "investigate-drift", "warning"]
    ]
  );

  assert.match(lineageReport, /^# Verification Recommendation Lineage Report/m);
  assert.match(lineageReport, /health status: warning/);
  assert.match(lineageReport, /current action: investigate-drift/);
  assert.match(lineageReport, /current transition: escalated/);
  assert.match(lineageReport, /history transition: de-escalated/);
  assert.match(lineageReport, /log transition: escalated/);
  assert.match(lineageReport, /distinct actions: investigate-drift, continue-monitoring/);
  assert.match(lineageReport, /## Operator Recommendation/);
  assert.match(lineageReport, /action: investigate-lineage-drift/);
  assert.match(lineageReport, /urgency: warning/);
  assert.match(lineageReport, /## Trend Summary/);
  assert.match(lineageReport, /health direction: worsened/);
  assert.match(lineageReport, /recommendation direction: worsened/);
  assert.match(lineageReport, /alert direction: increased/);
  assert.match(lineageReport, /## Monitoring Policy/);
  assert.match(lineageReport, /max warning alerts: 0/);
  assert.match(lineageReport, /allow recommendation worsened: false/);
  assert.match(lineageReport, /## Alerts/);
  assert.match(lineageReport, /\[warning\] history-index-action-divergence:/);
  assert.match(lineageReport, /\[warning\] history-index-transition-divergence:/);
  assert.match(lineageReport, /## Threshold Breaches/);
  assert.match(lineageReport, /\[warning\] warning-alert-threshold-exceeded:/);
  assert.match(lineageReport, /\[warning\] recommendation-worsened-not-allowed:/);
  assert.match(lineageReport, /## Layer Snapshots/);
  assert.match(lineageReport, /history: action=continue-monitoring, urgency=healthy, transition=de-escalated/);
  assert.match(lineageReport, /log: action=investigate-drift, urgency=warning, transition=escalated/);
  assert.match(lineageReport, /index: action=investigate-drift, urgency=warning, transition=escalated/);
  assert.match(lineageReport, /## Timeline/);
  assert.match(lineageReport, /history: generated_at=.*action=investigate-drift, urgency=warning/);
  assert.match(lineageReport, /log: generated_at=.*action=continue-monitoring, urgency=healthy/);
  assert.match(lineageReport, /index: generated_at=.*action=investigate-drift, urgency=warning/);
});

test("verifyDashboardCommand summarizes the operator-facing verification state", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const firstArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-a");
  const secondArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-b");
  const historyArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-history");
  const logArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log");
  const lineageArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-lineage");
  const dashboardArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-summary");

  await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const historyResult = await verifyHistoryCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: historyArtifactDir
  });
  const logResult = await verifyLogCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: logArtifactDir
  });
  const lineageResult = await verifyLineageCommand({
    historyInput: historyResult.historyJsonPath,
    logInput: logResult.logJsonPath,
    indexInput: logResult.indexJsonPath,
    artifactDir: lineageArtifactDir
  });
  const dashboardResult = await verifyDashboardCommand({
    historyInput: historyResult.historyJsonPath,
    logInput: logResult.logJsonPath,
    indexInput: logResult.indexJsonPath,
    lineageInput: lineageResult.lineageJsonPath,
    artifactDir: dashboardArtifactDir
  });

  assert.equal(dashboardResult.ok, true);
  assert.equal(dashboardResult.status, "completed");
  assert.equal(dashboardResult.overallHealthStatus, "warning");
  assert.equal(dashboardResult.overallThresholdStatus, "breached");
  assert.equal(dashboardResult.overallOperatorRecommendation, "investigate-lineage-drift");

  const dashboardJson = JSON.parse(await fs.readFile(dashboardResult.dashboardJsonPath, "utf8"));
  const dashboardReport = await fs.readFile(dashboardResult.dashboardReportPath, "utf8");

  assert.equal(dashboardJson.artifact_type, "verification-dashboard");
  assert.equal(dashboardJson.overall_health_status, "warning");
  assert.equal(dashboardJson.overall_threshold_status, "breached");
  assert.equal(dashboardJson.overall_operator_recommendation.action, "investigate-lineage-drift");
  assert.equal(dashboardJson.overall_operator_recommendation.urgency, "warning");
  assert.ok(dashboardJson.overall_operator_recommendation.source_signals.includes("index:warning-alert-threshold-exceeded"));
  assert.ok(dashboardJson.overall_operator_recommendation.source_signals.includes("lineage:recommendation-worsened-not-allowed"));
  assert.equal(dashboardJson.current_state.history.latest_action, "continue-monitoring");
  assert.equal(dashboardJson.current_state.log.latest_action, "investigate-drift");
  assert.equal(dashboardJson.current_state.index.threshold_status, "breached");
  assert.equal(dashboardJson.current_state.lineage.recommendation_direction, "worsened");
  assert.deepEqual(dashboardJson.drift_summary.history_drift_fields, [
    "routing_mode",
    "verification_recommendation_action",
    "verification_recommendation_urgency",
    "signal_reopen_status"
  ]);
  assert.deepEqual(dashboardJson.drift_summary.index_changed_fields, [
    "routing_mode",
    "verification_recommendation_action",
    "verification_recommendation_urgency",
    "signal_reopen_status"
  ]);
  assert.deepEqual(dashboardJson.drift_summary.lineage_alert_codes, [
    "history-index-action-divergence",
    "history-index-transition-divergence"
  ]);
  assert.deepEqual(dashboardJson.drift_summary.lineage_threshold_breach_codes, [
    "warning-alert-threshold-exceeded",
    "recommendation-worsened-not-allowed"
  ]);
  assert.ok(Array.isArray(dashboardJson.alerts));
  assert.ok(dashboardJson.alerts.some((alert) => alert.source === "index" && alert.code === "verification-drift-detected"));
  assert.ok(dashboardJson.alerts.some((alert) => alert.source === "lineage" && alert.code === "history-index-action-divergence"));
  assert.ok(Array.isArray(dashboardJson.threshold_breaches));
  assert.ok(dashboardJson.threshold_breaches.some((breach) => breach.source === "index" && breach.code === "warning-alert-threshold-exceeded"));
  assert.ok(dashboardJson.threshold_breaches.some((breach) => breach.source === "lineage" && breach.code === "recommendation-worsened-not-allowed"));

  assert.match(dashboardReport, /^# Verification Dashboard Report/m);
  assert.match(dashboardReport, /overall health status: warning/);
  assert.match(dashboardReport, /overall threshold status: breached/);
  assert.match(dashboardReport, /overall recommendation action: investigate-lineage-drift/);
  assert.match(dashboardReport, /## Overall Operator Recommendation/);
  assert.match(dashboardReport, /action: investigate-lineage-drift/);
  assert.match(dashboardReport, /## Current State/);
  assert.match(dashboardReport, /history: latest_action=continue-monitoring/);
  assert.match(dashboardReport, /index: health_status=warning, threshold_status=breached/);
  assert.match(dashboardReport, /## Drift Summary/);
  assert.match(dashboardReport, /lineage threshold breach codes: warning-alert-threshold-exceeded, recommendation-worsened-not-allowed/);
  assert.match(dashboardReport, /## Alerts/);
  assert.match(dashboardReport, /\[warning\] index:verification-drift-detected:/);
  assert.match(dashboardReport, /\[warning\] lineage:history-index-action-divergence:/);
  assert.match(dashboardReport, /## Threshold Breaches/);
  assert.match(dashboardReport, /\[warning\] index:warning-alert-threshold-exceeded:/);
  assert.match(dashboardReport, /\[warning\] lineage:recommendation-worsened-not-allowed:/);
  assert.match(dashboardReport, /## Source Artifacts/);
});

test("verifyDashboardLogCommand accumulates dashboard snapshots and summarizes transitions", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const firstArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-a");
  const secondArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-b");
  const firstHistoryDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-history-a");
  const secondHistoryDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-history-b");
  const firstLogDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-log-a");
  const secondLogDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-log-b");
  const firstLineageDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-lineage-a");
  const secondLineageDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-lineage-b");
  const firstDashboardDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-dashboard-a");
  const secondDashboardDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-dashboard-b");
  const dashboardLogDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-log-summary");

  await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const firstHistory = await verifyHistoryCommand({
    inputs: [firstArtifactDir],
    artifactDir: firstHistoryDir
  });
  const firstLog = await verifyLogCommand({
    inputs: [firstArtifactDir],
    artifactDir: firstLogDir
  });
  const firstLineage = await verifyLineageCommand({
    historyInput: firstHistory.historyJsonPath,
    logInput: firstLog.logJsonPath,
    indexInput: firstLog.indexJsonPath,
    artifactDir: firstLineageDir
  });
  const firstDashboard = await verifyDashboardCommand({
    historyInput: firstHistory.historyJsonPath,
    logInput: firstLog.logJsonPath,
    indexInput: firstLog.indexJsonPath,
    lineageInput: firstLineage.lineageJsonPath,
    artifactDir: firstDashboardDir
  });

  const secondHistory = await verifyHistoryCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: secondHistoryDir
  });
  const secondLog = await verifyLogCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: secondLogDir
  });
  const secondLineage = await verifyLineageCommand({
    historyInput: secondHistory.historyJsonPath,
    logInput: secondLog.logJsonPath,
    indexInput: secondLog.indexJsonPath,
    artifactDir: secondLineageDir
  });
  const secondDashboard = await verifyDashboardCommand({
    historyInput: secondHistory.historyJsonPath,
    logInput: secondLog.logJsonPath,
    indexInput: secondLog.indexJsonPath,
    lineageInput: secondLineage.lineageJsonPath,
    artifactDir: secondDashboardDir
  });

  const firstAppend = await verifyDashboardLogCommand({
    inputs: [firstDashboard.dashboardJsonPath],
    artifactDir: dashboardLogDir
  });
  const secondAppend = await verifyDashboardLogCommand({
    inputs: [firstDashboard.dashboardJsonPath, secondDashboard.dashboardJsonPath],
    artifactDir: dashboardLogDir
  });

  assert.equal(firstAppend.ok, true);
  assert.equal(firstAppend.entryCount, 1);
  assert.equal(secondAppend.ok, true);
  assert.equal(secondAppend.entryCount, 2);
  assert.equal(secondAppend.latestRecommendation, "investigate-lineage-drift");

  const dashboardLogJson = JSON.parse(await fs.readFile(secondAppend.logJsonPath, "utf8"));
  const dashboardLogReport = await fs.readFile(secondAppend.logReportPath, "utf8");

  assert.equal(dashboardLogJson.artifact_type, "verification-dashboard-log");
  assert.equal(dashboardLogJson.entry_count, 2);
  assert.equal(dashboardLogJson.summary.health.latest_status, "warning");
  assert.equal(dashboardLogJson.summary.health.previous_status, "warning");
  assert.equal(dashboardLogJson.summary.health.latest_transition, "stable");
  assert.deepEqual(dashboardLogJson.summary.health.distinct_statuses, ["warning"]);
  assert.equal(dashboardLogJson.summary.threshold.latest_status, "breached");
  assert.equal(dashboardLogJson.summary.threshold.previous_status, "breached");
  assert.equal(dashboardLogJson.summary.threshold.latest_transition, "stable");
  assert.deepEqual(dashboardLogJson.summary.threshold.distinct_statuses, ["breached"]);
  assert.equal(dashboardLogJson.summary.recommendation.latest_action, "investigate-lineage-drift");
  assert.equal(dashboardLogJson.summary.recommendation.latest_urgency, "warning");
  assert.equal(dashboardLogJson.summary.recommendation.previous_action, "investigate-lineage-drift");
  assert.equal(dashboardLogJson.summary.recommendation.previous_urgency, "warning");
  assert.equal(dashboardLogJson.summary.recommendation.latest_transition, "stable");
  assert.deepEqual(dashboardLogJson.summary.recommendation.distinct_actions, [
    "investigate-lineage-drift"
  ]);
  assert.deepEqual(dashboardLogJson.summary.recommendation.distinct_urgencies, ["warning"]);
  assert.equal(dashboardLogJson.latest_dashboard.overall_operator_recommendation.action, "investigate-lineage-drift");
  assert.equal(dashboardLogJson.latest_dashboard.overall_threshold_status, "breached");
  assert.equal(dashboardLogJson.entries[0].dashboard_path, firstDashboard.dashboardJsonPath);
  assert.equal(dashboardLogJson.entries[1].dashboard_path, secondDashboard.dashboardJsonPath);

  assert.match(dashboardLogReport, /^# Verification Dashboard Log Report/m);
  assert.match(dashboardLogReport, /entry count: 2/);
  assert.match(dashboardLogReport, /## Health Summary/);
  assert.match(dashboardLogReport, /latest status: warning/);
  assert.match(dashboardLogReport, /## Threshold Summary/);
  assert.match(dashboardLogReport, /latest status: breached/);
  assert.match(dashboardLogReport, /## Recommendation Summary/);
  assert.match(dashboardLogReport, /latest action: investigate-lineage-drift/);
  assert.match(dashboardLogReport, /previous action: investigate-lineage-drift/);
  assert.match(dashboardLogReport, /latest transition: stable/);
  assert.match(dashboardLogReport, /## Latest Dashboard/);
  assert.match(dashboardLogReport, /operator recommendation: investigate-lineage-drift \/ urgency=warning/);
  assert.match(dashboardLogReport, /## Timeline/);
});

test("verifyDashboardIndexCommand summarizes latest dashboard operator state", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const firstArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-a");
  const secondArtifactDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-b");
  const firstHistoryDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-history-a");
  const secondHistoryDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-history-b");
  const firstLogDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-log-a");
  const secondLogDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-log-b");
  const firstLineageDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-lineage-a");
  const secondLineageDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-lineage-b");
  const firstDashboardDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-dashboard-a");
  const secondDashboardDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-dashboard-b");
  const dashboardLogDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-dashboard-log");
  const dashboardIndexDir = path.join(projectRoot, ".aof", "artifacts", "dashboard-index-summary");

  await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const firstHistory = await verifyHistoryCommand({
    inputs: [firstArtifactDir],
    artifactDir: firstHistoryDir
  });
  const firstLog = await verifyLogCommand({
    inputs: [firstArtifactDir],
    artifactDir: firstLogDir
  });
  const firstLineage = await verifyLineageCommand({
    historyInput: firstHistory.historyJsonPath,
    logInput: firstLog.logJsonPath,
    indexInput: firstLog.indexJsonPath,
    artifactDir: firstLineageDir
  });
  const firstDashboard = await verifyDashboardCommand({
    historyInput: firstHistory.historyJsonPath,
    logInput: firstLog.logJsonPath,
    indexInput: firstLog.indexJsonPath,
    lineageInput: firstLineage.lineageJsonPath,
    artifactDir: firstDashboardDir
  });

  const secondHistory = await verifyHistoryCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: secondHistoryDir
  });
  const secondLog = await verifyLogCommand({
    inputs: [firstArtifactDir, secondArtifactDir],
    artifactDir: secondLogDir
  });
  const secondLineage = await verifyLineageCommand({
    historyInput: secondHistory.historyJsonPath,
    logInput: secondLog.logJsonPath,
    indexInput: secondLog.indexJsonPath,
    artifactDir: secondLineageDir
  });
  const secondDashboard = await verifyDashboardCommand({
    historyInput: secondHistory.historyJsonPath,
    logInput: secondLog.logJsonPath,
    indexInput: secondLog.indexJsonPath,
    lineageInput: secondLineage.lineageJsonPath,
    artifactDir: secondDashboardDir
  });

  await verifyDashboardLogCommand({
    inputs: [firstDashboard.dashboardJsonPath],
    artifactDir: dashboardLogDir
  });
  const dashboardLog = await verifyDashboardLogCommand({
    inputs: [firstDashboard.dashboardJsonPath, secondDashboard.dashboardJsonPath],
    artifactDir: dashboardLogDir
  });

  const dashboardIndex = await verifyDashboardIndexCommand({
    logInput: dashboardLog.logJsonPath,
    artifactDir: dashboardIndexDir
  });

  assert.equal(dashboardIndex.ok, true);
  assert.equal(dashboardIndex.healthStatus, "warning");
  assert.equal(dashboardIndex.thresholdStatus, "breached");
  assert.equal(dashboardIndex.operatorRecommendation, "human-review-recommended");

  const dashboardIndexJson = JSON.parse(await fs.readFile(dashboardIndex.indexJsonPath, "utf8"));
  const dashboardIndexReport = await fs.readFile(dashboardIndex.indexReportPath, "utf8");

  assert.equal(dashboardIndexJson.artifact_type, "verification-dashboard-index");
  assert.equal(dashboardIndexJson.health_status, "warning");
  assert.equal(dashboardIndexJson.threshold_status, "breached");
  assert.equal(dashboardIndexJson.operator_recommendation.action, "human-review-recommended");
  assert.equal(dashboardIndexJson.operator_recommendation.urgency, "critical");
  assert.equal(dashboardIndexJson.recommendation_summary.latest_action, "investigate-lineage-drift");
  assert.equal(dashboardIndexJson.recommendation_summary.latest_transition, "stable");
  assert.equal(dashboardIndexJson.monitoring_policy.thresholds.require_latest_health_healthy, true);
  assert.equal(dashboardIndexJson.monitoring_policy.thresholds.require_latest_threshold_within, true);
  assert.ok(
    dashboardIndexJson.alerts.some((alert) => alert.code === "latest-dashboard-threshold-breached")
  );
  assert.ok(
    dashboardIndexJson.alerts.some((alert) => alert.code === "latest-dashboard-health-not-healthy")
  );
  assert.ok(
    dashboardIndexJson.threshold_breaches.some((breach) => breach.code === "latest-dashboard-health-required-healthy")
  );
  assert.ok(
    dashboardIndexJson.threshold_breaches.some((breach) => breach.code === "latest-dashboard-threshold-required-within")
  );
  assert.equal(dashboardIndexJson.latest_dashboard.dashboard_path, secondDashboard.dashboardJsonPath);

  assert.match(dashboardIndexReport, /^# Verification Dashboard Index Report/m);
  assert.match(dashboardIndexReport, /health status: warning/);
  assert.match(dashboardIndexReport, /threshold status: breached/);
  assert.match(dashboardIndexReport, /action: human-review-recommended/);
  assert.match(dashboardIndexReport, /## Monitoring Policy/);
  assert.match(dashboardIndexReport, /## Threshold Breaches/);
});

test("verifyArchiveCommand imports verification runs into the project-local archive and refreshes derived artifacts", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const workspaceRoot = path.dirname(projectRoot);
  const firstArtifactDir = path.join(workspaceRoot, "external-verify-a");
  const secondArtifactDir = path.join(workspaceRoot, "external-verify-b");

  await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const archiveResult = await verifyArchiveCommand({
    project: projectRoot,
    inputs: [firstArtifactDir, secondArtifactDir],
    archiveDir: ""
  });

  assert.equal(archiveResult.ok, true);
  assert.equal(archiveResult.importedCount, 2);
  assert.equal(archiveResult.skippedCount, 0);
  assert.equal(archiveResult.retainedCount, 2);
  assert.equal(archiveResult.prunedCount, 0);
  assert.equal(archiveResult.overallRecommendedAction, "investigate-lineage-drift");
  assert.equal(archiveResult.dashboardIndexRecommendedAction, "human-review-recommended");

  const manifestJson = JSON.parse(await fs.readFile(archiveResult.manifestJsonPath, "utf8"));
  const summaryJson = JSON.parse(await fs.readFile(archiveResult.summaryJsonPath, "utf8"));
  const archiveIndexJson = JSON.parse(await fs.readFile(archiveResult.archiveIndexJsonPath, "utf8"));
  const archiveLogJson = JSON.parse(await fs.readFile(archiveResult.archiveLogJsonPath, "utf8"));
  const archiveDashboardJson = JSON.parse(await fs.readFile(archiveResult.archiveDashboardJsonPath, "utf8"));
  const dashboardIndexJson = JSON.parse(await fs.readFile(archiveResult.dashboardIndexJsonPath, "utf8"));

  assert.equal(manifestJson.artifact_type, "verification-archive-manifest");
  assert.equal(manifestJson.run_count, 2);
  assert.equal(manifestJson.entries.length, 2);
  assert.equal(manifestJson.imported_run_ids.length, 2);
  assert.ok(manifestJson.entries.every((entry) => entry.archived_bundle_path.endsWith("verification-bundle.json")));
  assert.ok(manifestJson.entries.every((entry) => entry.archived_run_dir.includes(`${path.sep}.aof${path.sep}artifacts${path.sep}verification${path.sep}runs${path.sep}`)));

  assert.equal(summaryJson.artifact_type, "verification-archive-summary");
  assert.equal(summaryJson.imported_count, 2);
  assert.equal(summaryJson.skipped_count, 0);
  assert.equal(summaryJson.retained_count, 2);
  assert.equal(summaryJson.pruned_count, 0);
  assert.equal(summaryJson.derived_artifacts.history.json_path, archiveResult.historyJsonPath);
  assert.equal(summaryJson.derived_artifacts.archive_log.json_path, archiveResult.archiveLogJsonPath);
  assert.equal(summaryJson.derived_artifacts.archive_dashboard.json_path, archiveResult.archiveDashboardJsonPath);
  assert.equal(summaryJson.derived_artifacts.dashboard_index.json_path, archiveResult.dashboardIndexJsonPath);
  assert.equal(archiveIndexJson.artifact_type, "verification-archive-index");
  assert.equal(archiveIndexJson.retained_count, 2);
  assert.equal(archiveIndexJson.pruned_count, 0);
  assert.equal(archiveIndexJson.retention_reached, false);
  assert.equal(archiveIndexJson.health_status, "critical");
  assert.equal(archiveIndexJson.threshold_status, "breached");
  assert.equal(archiveIndexJson.operator_recommendation.action, "human-review-recommended");
  assert.equal(archiveIndexJson.overall_operator_recommendation, "investigate-lineage-drift");
  assert.equal(archiveIndexJson.dashboard_index_recommendation, "human-review-recommended");
  assert.equal(archiveIndexJson.provider_mix.find((item) => item.value === "mock")?.count, 2);
  assert.equal(archiveIndexJson.workflow_mix.find((item) => item.value === "aidlc")?.count, 2);
  assert.equal(archiveLogJson.artifact_type, "verification-archive-log");
  assert.equal(archiveLogJson.entry_count, 1);
  assert.equal(archiveLogJson.summary.recommendation.latest_action, "human-review-recommended");
  assert.equal(archiveLogJson.summary.retention.latest_retention_reached, false);
  assert.equal(archiveDashboardJson.artifact_type, "verification-archive-dashboard");
  assert.equal(archiveDashboardJson.overall_health_status, "critical");
  assert.equal(archiveDashboardJson.overall_threshold_status, "breached");
  assert.equal(archiveDashboardJson.overall_operator_recommendation.action, "human-review-recommended");
  assert.equal(archiveDashboardJson.current_state.index.retained_count, 2);
  assert.equal(archiveDashboardJson.trend_summary.retention_transition, "initial");

  assert.equal(dashboardIndexJson.artifact_type, "verification-dashboard-index");
  assert.equal(dashboardIndexJson.health_status, "warning");
  assert.equal(dashboardIndexJson.threshold_status, "breached");
  assert.equal(dashboardIndexJson.operator_recommendation.action, "human-review-recommended");

  const oldestArchivedRunDir = manifestJson.entries[0].archived_run_dir;
  const secondArchiveResult = await verifyArchiveCommand({
    project: projectRoot,
    inputs: [secondArtifactDir],
    archiveDir: "",
    maxRuns: 1
  });

  assert.equal(secondArchiveResult.ok, true);
  assert.equal(secondArchiveResult.importedCount, 0);
  assert.equal(secondArchiveResult.skippedCount, 1);
  assert.equal(secondArchiveResult.retainedCount, 1);
  assert.equal(secondArchiveResult.prunedCount, 1);
  assert.equal(secondArchiveResult.prunedRunIds.length, 1);

  const manifestAfterDedupe = JSON.parse(await fs.readFile(secondArchiveResult.manifestJsonPath, "utf8"));
  const summaryAfterPrune = JSON.parse(await fs.readFile(secondArchiveResult.summaryJsonPath, "utf8"));
  const archiveIndexAfterPrune = JSON.parse(await fs.readFile(secondArchiveResult.archiveIndexJsonPath, "utf8"));
  const archiveLogAfterPrune = JSON.parse(await fs.readFile(secondArchiveResult.archiveLogJsonPath, "utf8"));
  const archiveDashboardAfterPrune = JSON.parse(await fs.readFile(secondArchiveResult.archiveDashboardJsonPath, "utf8"));
  assert.equal(manifestAfterDedupe.run_count, 1);
  assert.equal(manifestAfterDedupe.entries.length, 1);
  assert.equal(manifestAfterDedupe.retention_policy.max_runs, 1);
  assert.equal(manifestAfterDedupe.pruned_count, 1);
  assert.equal(summaryAfterPrune.retained_count, 1);
  assert.equal(summaryAfterPrune.pruned_count, 1);
  assert.equal(archiveIndexAfterPrune.retained_count, 1);
  assert.equal(archiveIndexAfterPrune.pruned_count, 1);
  assert.equal(archiveIndexAfterPrune.retention_reached, true);
  assert.equal(archiveIndexAfterPrune.health_status, "critical");
  assert.equal(archiveIndexAfterPrune.threshold_status, "breached");
  assert.equal(archiveIndexAfterPrune.operator_recommendation.action, "human-review-recommended");
  assert.equal(archiveIndexAfterPrune.latest_archived_run.source_bundle_path, path.join(secondArtifactDir, "verification-bundle.json"));
  assert.equal(archiveLogAfterPrune.entry_count, 2);
  assert.equal(archiveLogAfterPrune.summary.recommendation.latest_action, "human-review-recommended");
  assert.equal(archiveLogAfterPrune.summary.recommendation.latest_transition, "stable");
  assert.equal(archiveLogAfterPrune.summary.retention.latest_retention_reached, true);
  assert.equal(archiveLogAfterPrune.summary.retention.previous_retention_reached, false);
  assert.equal(archiveLogAfterPrune.summary.retention.latest_transition, "reached");
  assert.equal(archiveDashboardAfterPrune.overall_health_status, "critical");
  assert.equal(archiveDashboardAfterPrune.overall_threshold_status, "breached");
  assert.equal(archiveDashboardAfterPrune.overall_operator_recommendation.action, "human-review-recommended");
  assert.equal(archiveDashboardAfterPrune.current_state.log.retention_transition, "reached");
  await assert.rejects(fs.access(oldestArchivedRunDir));

  const dashboardLogJson = JSON.parse(await fs.readFile(path.join(archiveResult.archiveRoot, "dashboard-log", "verification-dashboard-log.json"), "utf8"));
  assert.equal(dashboardLogJson.entry_count, 2);
});

test("verifyArchiveLogCommand accumulates archive index snapshots and summarizes retention transitions", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const workspaceRoot = path.dirname(projectRoot);
  const firstArtifactDir = path.join(workspaceRoot, "archive-log-a");
  const secondArtifactDir = path.join(workspaceRoot, "archive-log-b");
  const archiveLogArtifactDir = path.join(projectRoot, ".aof", "artifacts", "verification", "external-archive-log");

  await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const firstArchive = await verifyArchiveCommand({
    project: projectRoot,
    inputs: [firstArtifactDir, secondArtifactDir],
    archiveDir: ""
  });
  const firstArchiveIndexSnapshotPath = path.join(projectRoot, ".aof", "artifacts", "verification", "archive-index-snapshot-a.json");
  await fs.copyFile(firstArchive.archiveIndexJsonPath, firstArchiveIndexSnapshotPath);
  const secondArchive = await verifyArchiveCommand({
    project: projectRoot,
    inputs: [secondArtifactDir],
    archiveDir: "",
    maxRuns: 1
  });
  const secondArchiveIndexSnapshotPath = path.join(projectRoot, ".aof", "artifacts", "verification", "archive-index-snapshot-b.json");
  await fs.copyFile(secondArchive.archiveIndexJsonPath, secondArchiveIndexSnapshotPath);

  const archiveLogResult = await verifyArchiveLogCommand({
    inputs: [firstArchiveIndexSnapshotPath, secondArchiveIndexSnapshotPath],
    artifactDir: archiveLogArtifactDir
  });

  assert.equal(archiveLogResult.ok, true);
  assert.equal(archiveLogResult.entryCount, 2);
  assert.equal(archiveLogResult.latestRecommendation, "human-review-recommended");

  const archiveLogJson = JSON.parse(await fs.readFile(archiveLogResult.logJsonPath, "utf8"));
  const archiveLogReport = await fs.readFile(archiveLogResult.logReportPath, "utf8");

  assert.equal(archiveLogJson.artifact_type, "verification-archive-log");
  assert.equal(archiveLogJson.entry_count, 2);
  assert.equal(archiveLogJson.summary.health.latest_status, "critical");
  assert.equal(archiveLogJson.summary.health.latest_transition, "stable");
  assert.equal(archiveLogJson.summary.threshold.latest_status, "breached");
  assert.equal(archiveLogJson.summary.threshold.latest_transition, "stable");
  assert.equal(archiveLogJson.summary.recommendation.latest_action, "human-review-recommended");
  assert.equal(archiveLogJson.summary.recommendation.latest_transition, "stable");
  assert.equal(archiveLogJson.summary.retention.latest_retention_reached, true);
  assert.equal(archiveLogJson.summary.retention.previous_retention_reached, false);
  assert.equal(archiveLogJson.summary.retention.latest_transition, "reached");
  assert.deepEqual(
    archiveLogJson.summary.retention.timeline.map((item) => [item.entry_index, item.retention_reached, item.retained_count, item.pruned_count]),
    [
      [0, false, 2, 0],
      [1, true, 1, 1]
    ]
  );
  assert.equal(archiveLogJson.latest_archive_index.retention_reached, true);
  assert.equal(archiveLogJson.latest_archive_index.operator_recommendation.action, "human-review-recommended");
  assert.match(archiveLogReport, /^# Verification Archive Log Report/m);
  assert.match(archiveLogReport, /## Retention Summary/);
  assert.match(archiveLogReport, /latest transition: reached/);
  assert.match(archiveLogReport, /latest action: human-review-recommended/);
});

test("verifyArchiveDashboardCommand summarizes archive current-state and trend in one operator artifact", async (t) => {
  const projectRoot = await createTempProject(t);
  const signalPath = await writeSignalFixture(projectRoot);
  const workspaceRoot = path.dirname(projectRoot);
  const firstArtifactDir = path.join(workspaceRoot, "archive-dashboard-a");
  const secondArtifactDir = path.join(workspaceRoot, "archive-dashboard-b");
  const archiveDashboardArtifactDir = path.join(projectRoot, ".aof", "artifacts", "verification", "external-archive-dashboard");

  await liveVerifyCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ],
    routingMode: null,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: firstArtifactDir,
    includeMiddleStages: true,
    includeApproval: true,
    includeSignalReopen: true,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  await liveVerifyCommand({
    project: projectRoot,
    request: "認証付き onboarding を改善したい",
    responses: [
      "認証付き onboarding 全体",
      "完了率を 3% 改善する",
      "既存のセキュリティ制約は維持する"
    ],
    routingMode: "fast-track",
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    temperature: undefined,
    ping: false,
    artifactDir: secondArtifactDir,
    includeMiddleStages: false,
    includeApproval: true,
    includeSignalReopen: false,
    includeEscalationReopen: false,
    includeEscalationTerminal: false,
    signalPath
  });

  const firstArchive = await verifyArchiveCommand({
    project: projectRoot,
    inputs: [firstArtifactDir, secondArtifactDir],
    archiveDir: ""
  });
  const secondArchive = await verifyArchiveCommand({
    project: projectRoot,
    inputs: [secondArtifactDir],
    archiveDir: "",
    maxRuns: 1
  });

  const archiveDashboardResult = await verifyArchiveDashboardCommand({
    indexInput: secondArchive.archiveIndexJsonPath,
    logInput: secondArchive.archiveLogJsonPath,
    artifactDir: archiveDashboardArtifactDir
  });

  assert.equal(archiveDashboardResult.ok, true);
  assert.equal(archiveDashboardResult.overallHealthStatus, "critical");
  assert.equal(archiveDashboardResult.overallThresholdStatus, "breached");
  assert.equal(archiveDashboardResult.overallRecommendedAction, "human-review-recommended");

  const archiveDashboardJson = JSON.parse(await fs.readFile(archiveDashboardResult.dashboardJsonPath, "utf8"));
  const archiveDashboardReport = await fs.readFile(archiveDashboardResult.dashboardReportPath, "utf8");

  assert.equal(archiveDashboardJson.artifact_type, "verification-archive-dashboard");
  assert.equal(archiveDashboardJson.source_artifacts.archive_index, secondArchive.archiveIndexJsonPath);
  assert.equal(archiveDashboardJson.source_artifacts.archive_log, secondArchive.archiveLogJsonPath);
  assert.equal(archiveDashboardJson.current_state.index.retained_count, 1);
  assert.equal(archiveDashboardJson.current_state.index.retention_reached, true);
  assert.equal(archiveDashboardJson.current_state.log.recommendation_action, "human-review-recommended");
  assert.equal(archiveDashboardJson.current_state.log.retention_transition, "reached");
  assert.equal(archiveDashboardJson.trend_summary.recommendation_transition, "stable");
  assert.equal(archiveDashboardJson.trend_summary.retention_transition, "reached");
  assert.equal(archiveDashboardJson.monitoring_policy.thresholds.require_archive_health_healthy, true);
  assert.equal(archiveDashboardJson.monitoring_policy.thresholds.require_archive_threshold_within, true);
  assert.ok(archiveDashboardJson.alerts.some((item) => item.code === "archive-dashboard-threshold-breached"));
  assert.ok(archiveDashboardJson.alerts.some((item) => item.code === "archive-dashboard-retention-transition-detected"));
  assert.ok(archiveDashboardJson.threshold_breaches.some((item) => item.code === "archive-dashboard-threshold-required-within"));
  assert.match(archiveDashboardReport, /^# Verification Archive Dashboard Report/m);
  assert.match(archiveDashboardReport, /overall health status: critical/);
  assert.match(archiveDashboardReport, /operator recommendation: human-review-recommended \/ urgency=critical/);
  assert.match(archiveDashboardReport, /## Trend Summary/);
  assert.match(archiveDashboardReport, /retention transition: reached/);
  assert.match(archiveDashboardReport, /## Threshold Breaches/);

  assert.ok(firstArchive.ok);
});

test("councilExecCommand surfaces provider config errors with seat/stage context and does not persist partial runs", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  await assert.rejects(
    councilExecCommand({
      session: runResult.sessionPath,
      stage: "planning",
      project: projectRoot,
      role: "",
      includeOptional: false,
      invokeModel: true,
      provider: "openai-compatible",
      model: "gpt-4.1-mini",
      baseUrl: "",
      apiKey: "",
      apiKeyEnv: "",
      mockSeatDecisions: [],
      mockSeatVetos: [],
      temperature: undefined
    }),
    /Model invocation failed for Builder during planning: OpenAI-compatible provider requires a base URL\./
  );

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.last_council_execution_id, undefined);
  assert.equal(session.council_execution_runs?.length ?? 0, 0);
});

test("councilExecCommand surfaces malformed provider responses with seat/stage context and does not persist partial runs", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        { message: { content: " " } }
      ]
    })
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    councilExecCommand({
      session: runResult.sessionPath,
      stage: "planning",
      project: projectRoot,
      role: "",
      includeOptional: false,
      invokeModel: true,
      provider: "openai-compatible",
      model: "gpt-4.1-mini",
      baseUrl: "https://example.test/v1",
      apiKey: "sk-test-12345678",
      apiKeyEnv: "",
      mockSeatDecisions: [],
      mockSeatVetos: [],
      temperature: undefined
    }),
    /Model invocation failed for Builder during planning: Model provider returned no usable text output\./
  );

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.last_council_execution_id, undefined);
  assert.equal(session.council_execution_runs?.length ?? 0, 0);
});

test("councilExecCommand preserves provider response metadata on successful live-style execution", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: {
      get(name) {
        const values = {
          "x-request-id": "req_runtime_123",
          "openai-processing-ms": "287",
          "x-ratelimit-remaining-requests": "4998"
        };
        return values[name] ?? null;
      }
    },
    json: async () => ({
      choices: [
        { message: { content: "DECISION: proceed\nBuilder runtime metadata response." } }
      ]
    })
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "planning",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "openai-compatible",
    model: "gpt-4.1-mini",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-test-12345678",
    apiKeyEnv: "",
    timeoutMs: 30000,
    maxRetries: 0,
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  const metadata = result.execution.steps[0].result.provider_metadata;
  assert.equal(metadata.response_status, 200);
  assert.deepEqual(metadata.response_headers, {
    x_request_id: "req_runtime_123",
    openai_processing_ms: "287",
    x_ratelimit_remaining_requests: "4998"
  });
});

test("councilExecCommand surfaces provider transport failures with seat/stage context and does not persist partial runs", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("request timed out");
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    councilExecCommand({
      session: runResult.sessionPath,
      stage: "planning",
      project: projectRoot,
      role: "",
      includeOptional: false,
      invokeModel: true,
      provider: "openai-compatible",
      model: "gpt-4.1-mini",
      baseUrl: "https://example.test/v1",
      apiKey: "sk-test-12345678",
      apiKeyEnv: "",
      mockSeatDecisions: [],
      mockSeatVetos: [],
      temperature: undefined
    }),
    /Model invocation failed for Builder during planning: Model provider transport failed: request timed out/
  );

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.last_council_execution_id, undefined);
  assert.equal(session.council_execution_runs?.length ?? 0, 0);
});

test("councilExecCommand surfaces invalid JSON provider responses with seat/stage context and does not persist partial runs", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => {
      throw new SyntaxError("Unexpected end of JSON input");
    }
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    councilExecCommand({
      session: runResult.sessionPath,
      stage: "planning",
      project: projectRoot,
      role: "",
      includeOptional: false,
      invokeModel: true,
      provider: "openai-compatible",
      model: "gpt-4.1-mini",
      baseUrl: "https://example.test/v1",
      apiKey: "sk-test-12345678",
      apiKeyEnv: "",
      mockSeatDecisions: [],
      mockSeatVetos: [],
      temperature: undefined
    }),
    /Model invocation failed for Builder during planning: Model provider returned invalid JSON: Unexpected end of JSON input/
  );

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.last_council_execution_id, undefined);
  assert.equal(session.council_execution_runs?.length ?? 0, 0);
});

test("deep-path proposal and review executions cover multiple seats", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const proposalResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "proposal",
    project: projectRoot,
    role: "",
    includeOptional: true,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  const reviewResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "review",
    project: projectRoot,
    role: "",
    includeOptional: true,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  assert.equal(proposalResult.executionStatus, "completed");
  assert.equal(proposalResult.execution.steps.length, 3);
  assert.deepEqual(
    proposalResult.execution.steps.map((step) => step.role),
    ["Builder", "Visionary", "Guardian"]
  );

  assert.equal(reviewResult.executionStatus, "completed");
  assert.equal(reviewResult.execution.steps.length, 3);
  assert.deepEqual(
    reviewResult.execution.steps.map((step) => step.role),
    ["Guardian", "Visionary", "Builder"]
  );

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.council_execution_runs.length, 2);
  assert.deepEqual(
    session.council_execution_runs.map((run) => run.stage),
    ["proposal", "review"]
  );
});

test("fast-track proposal and review executions stay single-seat", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const proposalResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "proposal",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  const reviewResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "review",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  assert.equal(proposalResult.executionStatus, "completed");
  assert.equal(proposalResult.execution.steps.length, 1);
  assert.deepEqual(
    proposalResult.execution.steps.map((step) => step.role),
    ["Builder"]
  );

  assert.equal(reviewResult.executionStatus, "completed");
  assert.equal(reviewResult.execution.steps.length, 1);
  assert.deepEqual(
    reviewResult.execution.steps.map((step) => step.role),
    ["Guardian"]
  );

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.council_execution_runs.length, 2);
  assert.equal(session.council_execution_runs[0].routing_mode, "fast-track");
  assert.equal(session.council_execution_runs[1].routing_mode, "fast-track");
});

test("signalCommand escalates routing mode from fast-track to deep-path when review depth increases", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });
  const signalPath = await writeSignal(projectRoot, "SIG-REOPEN-DEEP.json", {
    signal_id: "SIG-REOPEN-DEEP",
    signal_summary: "認証制約の変更で広い見直しが必要になった",
    required_review_level: "context-and-intent-review",
    affected_scope: "onboarding flow",
    impact_guess: "intent and constraint review required"
  });

  const result = await signalCommand({
    session: runResult.sessionPath,
    signal: signalPath
  });

  assert.equal(result.status, "reopened");
  assert.equal(result.currentStage, "clarification");
  assert.equal(result.routingMode, "deep-path");

  const session = await loadSession(result.sessionPath);
  assert.equal(session.routing_mode, "deep-path");
  assert.equal(session.reopen_context.previous_routing_mode, "fast-track");
  assert.equal(session.reopen_context.next_routing_mode, "deep-path");
  assert.equal(session.reopen_context.routing_escalated, true);
});

test("signalCommand updates context without reopen when the signal only needs context review", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const signalPath = await writeSignal(projectRoot, "SIG-REOPEN-FAST.json", {
    signal_id: "SIG-REOPEN-FAST",
    signal_summary: "軽微な文言制約だけが変わった",
    required_review_level: "context-only",
    affected_scope: "copy",
    impact_guess: "constraint note update"
  });

  const result = await signalCommand({
    session: runResult.sessionPath,
    signal: signalPath
  });

  assert.equal(result.status, "framed");
  assert.equal(result.currentStage, "planning");
  assert.equal(result.routingMode, "fast-track");
  assert.equal(result.signalDisposition, "context-updated");
  assert.deepEqual(result.pendingQuestions, []);
  assert.equal(result.reopenContext, null);
  assert.equal(result.signalContext?.disposition, "context-updated");

  const session = await loadSession(result.sessionPath);
  assert.equal(session.status, "framed");
  assert.equal(session.current_stage, "planning");
  assert.equal(session.routing_mode, "fast-track");
  assert.equal(session.reopen_context, undefined);
  assert.equal(session.signal_context.disposition, "context-updated");
  assert.equal(session.signal_context.routing_escalated, false);
  assert.equal(session.signal_context.next_routing_mode, "fast-track");
  assert.match(session.framing.active_context, /外部 signal を反映:/);
});

test("signalCommand reopens a framed planning session and escalates routing when review depth increases", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const signalPath = await writeSignal(projectRoot, "SIG-REOPEN-PLANNING.json", {
    signal_id: "SIG-REOPEN-PLANNING",
    signal_summary: "認証基盤の変更凍結で制約見直しが必要になった",
    required_review_level: "context-and-intent-review",
    affected_scope: "onboarding flow",
    impact_guess: "constraint review required"
  });

  const result = await signalCommand({
    session: runResult.sessionPath,
    signal: signalPath
  });

  assert.equal(result.status, "reopened");
  assert.equal(result.currentStage, "clarification");
  assert.equal(result.routingMode, "deep-path");
  assert.equal(result.pendingQuestions.length, 1);

  const session = await loadSession(result.sessionPath);
  assert.equal(session.status, "reopened");
  assert.equal(session.current_stage, "clarification");
  assert.equal(session.routing_mode, "deep-path");
  assert.equal(session.context_snapshot_id?.startsWith("CTX-"), true);
  assert.equal(session.reopen_count, 1);
  assert.equal(session.reopen_context.previous_routing_mode, "fast-track");
  assert.equal(session.reopen_context.next_routing_mode, "deep-path");
  assert.equal(session.reopen_context.routing_escalated, true);
  assert.equal(session.stage_transitions.at(-1)?.to_stage, "clarification");
  assert.equal(session.stage_transitions.at(-1)?.to_status, "reopened");
  assert.equal(session.stage_transitions.at(-1)?.reason, "external-signal-reopen");
  assert.equal(session.routing_mode_history.at(-1)?.to_mode, "deep-path");
  assert.equal(session.routing_mode_history.at(-1)?.reason, "external-signal-reopen");
});

test("signalCommand records project-memory confirmation when a signal is applied", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const signalPath = await writeSignal(projectRoot, "SIG-MEMORY.json", {
    signal_id: "SIG-MEMORY",
    signal_summary: "法務レビュー追加で公開前確認が必要になった",
    required_review_level: "context-and-intent-review",
    affected_scope: "launch flow",
    impact_guess: "launch review expansion required"
  });

  const result = await signalCommand({
    session: runResult.sessionPath,
    signal: signalPath
  });

  assert.equal(result.projectMemory.confirmationResult?.ok, true);

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  const latestEntry = confirmationWindow.entries.at(-1);
  assert.match(latestEntry.question, /外部変化/);
  assert.equal(latestEntry.source_session_id, runResult.sessionId);
  assert.equal(latestEntry.mismatch_state, "external signal forced reopen and broader review");
  assert.equal(latestEntry.scale_direction, "re-evaluate current plan before proceeding");
});

test("answerCommand can resume a signal-reopened session back into planning", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const signalPath = await writeSignal(projectRoot, "SIG-REOPEN-RESUME.json", {
    signal_id: "SIG-REOPEN-RESUME",
    signal_summary: "認証基盤の変更凍結で再確認が必要になった",
    required_review_level: "context-and-intent-review",
    affected_scope: "onboarding flow",
    impact_guess: "constraint review required"
  });

  await signalCommand({
    session: runResult.sessionPath,
    signal: signalPath
  });

  const resumed = await answerCommand({
    session: runResult.sessionPath,
    responses: ["認証制約の凍結を前提に onboarding を再設計する"]
  });

  assert.equal(resumed.status, "framed");
  assert.equal(resumed.currentStage, "planning");
  assert.ok(resumed.decisionId);

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.status, "framed");
  assert.equal(session.current_stage, "planning");
  assert.equal(session.routing_mode, "deep-path");
  assert.equal("stop_reason" in session, false);
  assert.equal("recoverability" in session, false);
  assert.equal("suggested_next_action" in session, false);
});

test("answerCommand promotes a fully framed request into planning and emits a planning decision", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率が5%改善",
      "認証基盤は変更しない"
    ]
  });

  assert.equal(answerResult.status, "framed");
  assert.equal(answerResult.currentStage, "planning");
  assert.ok(answerResult.decisionId);

  const session = await loadSession(answerResult.sessionPath);
  assert.equal(session.current_stage, "planning");
  assert.equal(session.status, "framed");
  assert.equal(session.open_decision_ids.length, 1);
  assert.equal(session.closed_decision_ids.length, 1);
  assert.equal(session.context_snapshot_id?.startsWith("CTX-"), true);
  assert.equal(session.stage_transitions.at(-1)?.to_stage, "planning");
  assert.equal(session.stage_transitions.at(-1)?.to_status, "framed");
  assert.equal(session.stage_transitions.at(-1)?.reason, "clarification-complete");

  const planningDecisionText = await fs.readFile(answerResult.decisionJsonPath, "utf8");
  const planningDecision = JSON.parse(planningDecisionText);
  assert.equal(planningDecision.stage, "planning");
  assert.equal(planningDecision.need, "新規登録導線全体");
  assert.equal(planningDecision.context_snapshot_id, session.context_snapshot_id);
  assert.equal(planningDecision.forecast_required, false);
  assert.match(session.context_snapshot_id, /^CTX-[A-Z0-9]+-[A-Z0-9]+$/);
});

test("answerCommand records clarification answers in the recent confirmation window and refines the operating goal", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率が5%改善",
      "認証基盤は変更しない"
    ]
  });

  assert.equal(answerResult.projectMemory.confirmationResults.length, 3);
  assert.equal(answerResult.projectMemory.confirmationResults.every((item) => item.ok), true);
  assert.equal(answerResult.projectMemory.operatingGoalProjection?.ok, true);

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  assert.equal(confirmationWindow.window_type, "recent-confirmation-window");
  assert.equal(confirmationWindow.entries.length, 3);
  assert.equal(confirmationWindow.entries[2].answer, "認証基盤は変更しない");
  assert.equal(confirmationWindow.entries.every((entry) => entry.scale_direction === "advance toward planning"), true);

  const session = await loadSession(answerResult.sessionPath);
  const goalProjectionPath = path.join(projectRoot, ".aof", "goals", "operating-goal.json");
  const goalProjection = JSON.parse(await fs.readFile(goalProjectionPath, "utf8"));
  assert.equal(goalProjection.content, session.framing.need);
  assert.equal(goalProjection.source_session_id, runResult.sessionId);
});

test("answerCommand keeps the session in clarification when answers are too weak", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses: ["未定", "TBD", "なし"]
  });

  assert.equal(answerResult.status, "waiting_user");
  assert.equal(answerResult.currentStage, "clarification");
  assert.equal(answerResult.decisionId, null);
  assert.equal(answerResult.remainingQuestions.length > 0, true);

  const session = await loadSession(answerResult.sessionPath);
  assert.equal(session.clarification.round_count, 2);
  assert.equal(session.clarification.pending_questions.length > 0, true);
  assert.equal(session.open_decision_ids.length, 1);
  assert.equal(session.closed_decision_ids.length, 0);
  assert.equal(session.stage_transitions.length, 1);
});

test("outcomeReportCommand appends outcome writeback to the session", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率が5%改善",
      "認証基盤は変更しない"
    ]
  });

  const reportResult = await outcomeReportCommand({
    session: runResult.sessionPath,
    result: "success",
    note: "登録導線の KPI が改善した",
    signalRef: "SIG-001"
  });

  assert.equal(reportResult.ok, true);
  assert.equal(reportResult.outcomeReportCount, 1);
  assert.equal(reportResult.latestOutcomeReport.result, "success");
  assert.equal(reportResult.latestOutcomeReport.note, "登録導線の KPI が改善した");
  assert.equal(reportResult.latestOutcomeReport.signal_ref, "SIG-001");
  assert.equal(reportResult.projectMemory.nextValueSliceProjection?.ok, true);

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.outcome_reports.length, 1);
  assert.equal(session.outcome_reports[0].result, "success");
  assert.equal(session.outcome_reports[0].note, "登録導線の KPI が改善した");
  assert.equal(session.outcome_reports[0].signal_ref, "SIG-001");

  const goalProjectionPath = path.join(projectRoot, ".aof", "goals", "next-value-slice.json");
  const goalProjection = JSON.parse(await fs.readFile(goalProjectionPath, "utf8"));
  assert.equal(goalProjection.goal_type, "next-value-slice");
  assert.equal(goalProjection.content.length > 0, true);
  assert.equal(typeof goalProjection.declared_complete_at, "string");
});

test("signalCommand rejects same-session mutation while a lock file exists", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });
  const signalPath = await writeSignal(projectRoot, "SIG-LOCKED.json", {
    signal_id: "SIG-LOCKED",
    signal_summary: "並列更新を避けたい",
    required_review_level: "context-only",
    affected_scope: "copy"
  });
  const lockPath = `${runResult.sessionPath}.lock`;
  await fs.writeFile(lockPath, "locked\n", "utf8");
  t.after(async () => {
    await fs.rm(lockPath, { force: true });
  });

  await assert.rejects(
    () =>
      signalCommand({
        session: runResult.sessionPath,
        signal: signalPath
      }),
    /Concurrent mutation is not allowed for this session/
  );
});

test("councilExecCommand records approval-stage confirmation into project memory", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const approvalResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  assert.equal(approvalResult.execution.approval_outcome.status, "approved");
  assert.equal(approvalResult.projectMemory.confirmationResult?.ok, true);

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  const latestEntry = confirmationWindow.entries.at(-1);
  assert.equal(latestEntry.question, "council approval で何が決まったか");
  assert.equal(latestEntry.expectation_state, "approved");
  assert.equal(latestEntry.scale_direction, "proceed to outcome tracking or release closure");
});

test("alignmentPulseCommand writes a cadence artifact, refreshes triage timestamps, and records confirmation memory", async (t) => {
  const projectRoot = await createTempProjectFrom(t, genericExampleProjectRoot);
  const firstTask = await taskOpenCommand({
    project: projectRoot,
    title: "Refresh cadence state",
    triageNotes: "pre-pulse"
  });
  const secondTask = await taskOpenCommand({
    project: projectRoot,
    title: "Review stale task handling",
    triageNotes: "pre-pulse"
  });
  const initialFirstTriagedAt = firstTask.payload.last_triaged_at;
  const initialSecondTriagedAt = secondTask.payload.last_triaged_at;

  const result = await alignmentPulseCommand({
    project: projectRoot,
    question: "まだ解くべき問題は同じか",
    answer: "はい。cadence-level self-hosting を次に強化する",
    expectationState: "command-level sync is already credible after v1.9.0",
    mismatchState: "task triage and self-audit cadence are still mostly note-driven",
    scaleDirection: "move from command coverage to operating cadence coverage",
    prioritizedTaskIds: [firstTask.taskId],
    staleTaskIds: [secondTask.taskId],
    retireCandidateTaskIds: [secondTask.taskId],
    triageNote: "alignment pulse after v1.9.0 release"
  });

  assert.equal(result.ok, true);
  assert.equal(result.triagedTasks.length, 2);
  assert.equal(result.confirmationResult?.ok, true);
  assert.equal(result.guidanceRefreshResult?.ok, true);

  const pulsePath = path.join(projectRoot, ".aof", "context", "active", "alignment-pulse.json");
  const pulse = JSON.parse(await fs.readFile(pulsePath, "utf8"));
  assert.equal(pulse.pulse_type, "alignment-pulse");
  assert.deepEqual(pulse.prioritized_task_ids, [firstTask.taskId]);
  assert.deepEqual(pulse.stale_task_ids, [secondTask.taskId]);
  assert.deepEqual(pulse.retire_candidate_task_ids, [secondTask.taskId]);
  assert.equal(pulse.open_task_ids.length, 2);

  const guidancePath = path.join(projectRoot, ".aof", "context", "active", "cadence-trigger-guidance.json");
  const guidancePayload = JSON.parse(await fs.readFile(guidancePath, "utf8"));
  assert.equal(guidancePayload.recommended_actions.includes("run retire-candidate-review"), true);
  assert.equal(guidancePayload.retire_review_candidate_ids.includes(secondTask.taskId), true);

  const firstTaskPath = path.join(projectRoot, ".aof", "tasks", "open", `${firstTask.taskId}.json`);
  const secondTaskPath = path.join(projectRoot, ".aof", "tasks", "open", `${secondTask.taskId}.json`);
  const firstTaskPayload = JSON.parse(await fs.readFile(firstTaskPath, "utf8"));
  const secondTaskPayload = JSON.parse(await fs.readFile(secondTaskPath, "utf8"));
  assert.equal(firstTaskPayload.triage_notes, "alignment pulse after v1.9.0 release [prioritized]");
  assert.equal(secondTaskPayload.triage_notes, "alignment pulse after v1.9.0 release [stale, retire-candidate]");
  assert.equal(typeof firstTaskPayload.last_triaged_at, "string");
  assert.equal(typeof secondTaskPayload.last_triaged_at, "string");
  assert.notEqual(firstTaskPayload.last_triaged_at, initialFirstTriagedAt);
  assert.notEqual(secondTaskPayload.last_triaged_at, initialSecondTriagedAt);
  assert.equal(firstTaskPayload.stale_candidate_at, null);
  assert.equal(firstTaskPayload.retire_candidate_at, null);
  assert.equal(typeof secondTaskPayload.stale_candidate_at, "string");
  assert.equal(typeof secondTaskPayload.retire_candidate_at, "string");

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  const latestEntry = confirmationWindow.entries.at(-1);
  assert.equal(latestEntry.question, "まだ解くべき問題は同じか");
  assert.equal(latestEntry.answer, "はい。cadence-level self-hosting を次に強化する");
  assert.equal(latestEntry.scale_direction, "move from command coverage to operating cadence coverage");
});

test("cadenceTriggerGuideCommand writes an active guidance artifact and summarizes recommended cadence actions", async (t) => {
  const projectRoot = await createTempProject(t);

  const taskResult = await taskOpenCommand({
    project: projectRoot,
    title: "Review cadence ergonomics",
    origin: "orchestrator",
    orchestratorSessionId: "SESS-ORCH-001",
    operatingGoalRef: "cadence-runtime-gap"
  });

  await alignmentPulseCommand({
    project: projectRoot,
    question: "cadence surfaces は次に何を要するか",
    answer: `${taskResult.taskId} は retire review 候補として残す`,
    retireCandidateTaskIds: [taskResult.taskId],
    triageNote: "mark the task for retire review",
    sourceSessionId: "SESS-ORCH-001",
    sourceDecisionRecordId: "DEC-020"
  });

  const result = await cadenceTriggerGuideCommand({
    project: projectRoot,
    sourceSessionId: "SESS-ORCH-001",
    sourceDecisionRecordId: "DEC-021",
    maxEntries: 3
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.guidance_type, "cadence-trigger-guidance");
  assert.deepEqual(result.payload.retire_review_candidate_ids, [taskResult.taskId]);
  assert.equal(result.payload.trigger_state, "follow-through-recommended");
  assert.equal(result.payload.batching_mode, "single-action");
  assert.equal(result.payload.recommended_actions.includes("run retire-candidate-review"), true);
  assert.equal(result.payload.suggested_commands.some((entry) => entry.action === "run retire-candidate-review"), true);

  const guidancePath = path.join(projectRoot, ".aof", "context", "active", "cadence-trigger-guidance.json");
  const guidancePayload = JSON.parse(await fs.readFile(guidancePath, "utf8"));
  assert.equal(guidancePayload.source_decision_record_id, "DEC-021");
  assert.equal(guidancePayload.suggested_commands[0].command.includes(taskResult.taskId), true);

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  assert.equal(confirmationWindow.entries.at(-1).question, "cadence guidance では次に何をすべきか");
  assert.equal(confirmationWindow.entries.at(-1).answer.includes("Retire review is recommended"), true);
});

test("cadenceTriggerGuideCommand marks batched follow-through when multiple cadence actions are simultaneously recommended", async (t) => {
  const projectRoot = await createTempProject(t);
  const taskResult = await taskOpenCommand({
    project: projectRoot,
    title: "Review cadence batching",
    origin: "orchestrator",
    orchestratorSessionId: "SESS-ORCH-001",
    operatingGoalRef: "cadence-runtime-gap"
  });

  await taskUpdateCommand({
    project: projectRoot,
    taskId: taskResult.taskId,
    triageNotes: "prepared for batched follow-through",
    status: "open"
  });

  const taskPath = path.join(projectRoot, ".aof", "tasks", "open", `${taskResult.taskId}.json`);
  const taskPayload = JSON.parse(await fs.readFile(taskPath, "utf8"));
  taskPayload.retire_candidate_at = "2026-06-03T00:00:00.000Z";
  await fs.writeFile(taskPath, JSON.stringify(taskPayload, null, 2) + "\n", "utf8");

  const result = await cadenceTriggerGuideCommand({
    project: projectRoot,
    sourceSessionId: "SESS-ORCH-001",
    sourceDecisionRecordId: "DEC-030",
    maxEntries: 3
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.trigger_state, "follow-through-recommended");
  assert.equal(result.payload.batching_mode, "batched-follow-through");
  assert.equal(result.payload.recommended_actions.includes("run alignment-pulse"), true);
  assert.equal(result.payload.recommended_actions.includes("run self-audit-record"), true);
  assert.equal(result.payload.recommended_actions.includes("run retire-candidate-review"), true);
  assert.equal(result.payload.policy_reason.includes("Multiple cadence actions"), true);
});

test("cadenceFollowThroughCommand executes single-action retire review from current guidance", async (t) => {
  const projectRoot = await createTempProject(t);
  const taskResult = await taskOpenCommand({
    project: projectRoot,
    title: "Guided retire review",
    origin: "orchestrator",
    orchestratorSessionId: "SESS-ORCH-001",
    operatingGoalRef: "cadence-runtime-gap"
  });

  await alignmentPulseCommand({
    project: projectRoot,
    question: "何を retire candidate にするか",
    answer: `${taskResult.taskId} を retire review に進める`,
    staleTaskIds: [taskResult.taskId],
    retireCandidateTaskIds: [taskResult.taskId],
    triageNote: "prepare guided retire review",
    sourceSessionId: "SESS-ORCH-001",
    sourceDecisionRecordId: "DEC-040"
  });

  const result = await cadenceFollowThroughCommand({
    project: projectRoot,
    resolution: "keep-open",
    note: "Retain the task after guided follow-through",
    sourceSessionId: "SESS-ORCH-001",
    sourceDecisionRecordId: "DEC-041",
    maxEntries: 3
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.executed_action, "run retire-candidate-review");
  assert.equal(result.executionResult?.ok, true);

  const followThroughPath = path.join(projectRoot, ".aof", "context", "active", "cadence-follow-through.json");
  const followThroughPayload = JSON.parse(await fs.readFile(followThroughPath, "utf8"));
  assert.equal(followThroughPayload.guidance_batching_mode, "single-action");
  assert.deepEqual(followThroughPayload.task_ids, [taskResult.taskId]);

  const taskPath = path.join(projectRoot, ".aof", "tasks", "open", `${taskResult.taskId}.json`);
  const taskPayload = JSON.parse(await fs.readFile(taskPath, "utf8"));
  assert.equal(taskPayload.retire_candidate_at, null);
  assert.equal(taskPayload.triage_notes, "Retain the task after guided follow-through [kept-open]");

  const guidancePath = path.join(projectRoot, ".aof", "context", "active", "cadence-trigger-guidance.json");
  const guidancePayload = JSON.parse(await fs.readFile(guidancePath, "utf8"));
  assert.equal(guidancePayload.trigger_state, "idle");
  assert.equal(guidancePayload.batching_mode, "none");
  assert.deepEqual(guidancePayload.retire_review_candidate_ids, []);
});

test("selfAuditRecordCommand writes an active self-audit artifact, refreshes confirmation memory, and can update next value slice", async (t) => {
  const projectRoot = await createTempProjectFrom(t, genericExampleProjectRoot);
  const task = await taskOpenCommand({
    project: projectRoot,
    title: "Close cadence gap",
    triageNotes: "awaiting self-audit cadence"
  });

  const result = await selfAuditRecordCommand({
    project: projectRoot,
    auditId: "FSA-007",
    scope: "post-pulse cadence review",
    summary: "task triage cadence is runtime-backed after the latest alignment-pulse slice",
    detectedGap: "self-audit cadence is still weaker than pulse-backed task triage",
    resultState: "active",
    nextAction: "make self-audit cadence refresh through the same operating loop",
    relatedTaskIds: [task.taskId],
    nextValueSliceContent: "Extend TASK-004 into runtime-backed self-audit cadence"
  });

  assert.equal(result.ok, true);
  assert.equal(result.confirmationResult?.ok, true);
  assert.equal(result.nextValueSliceResult?.ok, true);
  assert.equal(result.guidanceRefreshResult?.ok, true);

  const auditPath = path.join(projectRoot, ".aof", "context", "active", "framework-self-audit.json");
  const auditPayload = JSON.parse(await fs.readFile(auditPath, "utf8"));
  assert.equal(auditPayload.audit_type, "framework-self-audit");
  assert.equal(auditPayload.audit_id, "FSA-007");
  assert.equal(auditPayload.detected_gap, "self-audit cadence is still weaker than pulse-backed task triage");
  assert.deepEqual(auditPayload.related_task_ids, [task.taskId]);

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  const latestEntry = confirmationWindow.entries.at(-1);
  assert.equal(latestEntry.question, "framework self-audit で次に残る gap は何か");
  assert.equal(latestEntry.answer, "self-audit cadence is still weaker than pulse-backed task triage");
  assert.equal(latestEntry.scale_direction, "make self-audit cadence refresh through the same operating loop");

  const nextValueSlicePath = path.join(projectRoot, ".aof", "goals", "next-value-slice.json");
  const nextValueSlice = JSON.parse(await fs.readFile(nextValueSlicePath, "utf8"));
  assert.equal(nextValueSlice.content, "Extend TASK-004 into runtime-backed self-audit cadence");

  const guidancePath = path.join(projectRoot, ".aof", "context", "active", "cadence-trigger-guidance.json");
  const guidancePayload = JSON.parse(await fs.readFile(guidancePath, "utf8"));
  assert.equal(guidancePayload.recommended_actions.includes("run alignment-pulse"), true);
});

test("retireCandidateReviewCommand can retire a reviewed task and record the decision in runtime memory", async (t) => {
  const projectRoot = await createTempProjectFrom(t, genericExampleProjectRoot);
  const task = await taskOpenCommand({
    project: projectRoot,
    title: "Retire a stale direction",
    triageNotes: "candidate for retirement"
  });

  await alignmentPulseCommand({
    project: projectRoot,
    question: "何を retire candidate にするか",
    answer: "この task は retire review に進める",
    prioritizedTaskIds: [],
    staleTaskIds: [task.taskId],
    retireCandidateTaskIds: [task.taskId],
    triageNote: "alignment pulse before retire review"
  });

  const result = await retireCandidateReviewCommand({
    project: projectRoot,
    resolution: "retire",
    taskIds: [task.taskId],
    note: "Human-approved retirement after cadence review"
  });

  assert.equal(result.ok, true);
  assert.equal(result.updatedTasks.length, 1);
  assert.equal(result.guidanceRefreshResult?.ok, true);

  const reviewPath = path.join(projectRoot, ".aof", "context", "active", "retire-candidate-review.json");
  const reviewPayload = JSON.parse(await fs.readFile(reviewPath, "utf8"));
  assert.equal(reviewPayload.review_type, "retire-candidate-review");
  assert.equal(reviewPayload.resolution, "retire");
  assert.deepEqual(reviewPayload.reviewed_task_ids, [task.taskId]);

  const retiredTaskPath = path.join(projectRoot, ".aof", "tasks", "retired", `${task.taskId}.json`);
  const retiredTask = JSON.parse(await fs.readFile(retiredTaskPath, "utf8"));
  assert.equal(retiredTask.status, "retired");
  assert.equal(retiredTask.triage_notes, "Human-approved retirement after cadence review [retired]");
  assert.equal(typeof retiredTask.retired_at, "string");
  assert.equal(typeof retiredTask.retire_candidate_at, "string");

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  const latestEntry = confirmationWindow.entries.at(-1);
  assert.equal(latestEntry.question, "retire candidate review で何を決めたか");
  assert.equal(latestEntry.answer, "Human-approved retirement after cadence review");
  assert.equal(latestEntry.expectation_state, "retire-candidate task was retired through runtime-backed review");

  const guidancePath = path.join(projectRoot, ".aof", "context", "active", "cadence-trigger-guidance.json");
  const guidancePayload = JSON.parse(await fs.readFile(guidancePath, "utf8"));
  assert.deepEqual(guidancePayload.retire_review_candidate_ids, []);
  assert.equal(guidancePayload.recommended_actions.includes("run self-audit-record"), true);
});

test("outcomeReportCommand rejects same-session mutation while a lock file exists", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });
  const lockPath = `${runResult.sessionPath}.lock`;
  await fs.writeFile(lockPath, "locked\n", "utf8");
  t.after(async () => {
    await fs.rm(lockPath, { force: true });
  });

  await assert.rejects(
    () =>
      outcomeReportCommand({
        session: runResult.sessionPath,
        result: "partial",
        note: "Still waiting for downstream KPI confirmation"
      }),
    /Concurrent mutation is not allowed for this session/
  );
});

test("weak English clarification answers generate English follow-up questions", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  const englishOrg = [
    "organization_id: product-team",
    "name: Product Team",
    "language: en",
    "mission: Deliver software outcomes through AIDLC",
    "governance_scopes:",
    "  - requirements-approval",
    "  - design-approval",
    "  - release-approval",
    ""
  ].join("\n");
  await fs.writeFile(organizationPath, englishOrg, "utf8");

  const runResult = await runCommand({
    project: projectRoot,
    request: "Improve the onboarding flow"
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses: ["unclear", "unknown", "none"]
  });

  const session = await loadSession(answerResult.sessionPath);
  assert.equal(session.status, "waiting_user");
  assert.match(
    session.clarification.pending_questions[0].question,
    /^The earlier answer still lacks enough decision-making detail\./
  );
  assert.match(session.clarification.clarification_summary, /requires a follow-up round/);
});

test("answerCommand respects clarification max_rounds when weak answers persist", async (t) => {
  const projectRoot = await createTempProject(t);
  const organizationPath = path.join(projectRoot, ".aof", "organization.yaml");
  await fs.writeFile(
    organizationPath,
    [
      "organization_id: product-team",
      "name: Product Team",
      "language: en",
      "mission: Deliver software outcomes through AIDLC",
      "governance_scopes:",
      "  - requirements-approval",
      "clarification:",
      "  question_policy:",
      "    followup_budget: 2",
      "    max_rounds: 1",
      ""
    ].join("\n"),
    "utf8"
  );

  const runResult = await runCommand({
    project: projectRoot,
    request: "Improve the onboarding flow"
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses: ["unclear", "unknown", "none"]
  });

  const session = await loadSession(answerResult.sessionPath);
  assert.equal(session.status, "framed");
  assert.equal(session.current_stage, "planning");
  assert.equal(session.clarification.pending_questions.length, 0);
  assert.equal(session.clarification.round_count, 1);
  assert.equal(answerResult.remainingQuestions.length, 0);
});

test("decision record escalation updates remain schema-valid under strict properties", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい"
  });

  const escalated = await updateDecisionRecordForEscalation({
    projectRoot,
    template,
    decisionId: runResult.decisionId,
    execution: {
      approval_outcome: {
        status: "rejected",
        guardian_veto_used: true
      }
    },
    escalation: {
      status: "awaiting-human-review",
      summary: "Guardian veto triggered human escalation",
      target: "maintainer"
    }
  });

  assert.equal(escalated.escalation_status, "awaiting-human-review");
  assert.equal(escalated.guardian_veto_used, "Yes");

  const resolved = await updateDecisionRecordForEscalationResolution({
    projectRoot,
    template,
    decisionId: runResult.decisionId,
    escalation: {
      status: "resolved",
      resolution: "reopen",
      resolution_note: "Need revised scope before approval"
    }
  });

  assert.equal(resolved.escalation_status, "resolved");
  assert.equal(resolved.escalation_resolution, "reopen");
});

test("approval rejection escalates to human review and can be resolved into reopen", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  const approvalResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: ["Guardian=yes"],
    temperature: undefined
  });

  assert.equal(approvalResult.execution.approval_outcome.status, "rejected");
  assert.equal(approvalResult.escalation?.status, "awaiting-human-review");
  assert.equal(approvalResult.projectMemory.confirmationResult?.ok, true);

  const escalatedSession = await loadSession(runResult.sessionPath);
  assert.equal(escalatedSession.status, "waiting_user");
  assert.equal(escalatedSession.current_stage, "approval");
  assert.equal(escalatedSession.stop_reason, "approval-failed-needs-human-escalation");

  const afterApprovalWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const afterApprovalWindow = JSON.parse(await fs.readFile(afterApprovalWindowPath, "utf8"));
  const approvalEntry = afterApprovalWindow.entries.at(-1);
  assert.equal(approvalEntry.question, "council approval で何が決まったか");
  assert.equal(approvalEntry.expectation_state, "rejected");
  assert.equal(approvalEntry.mismatch_state, "council approval rejected the current slice and opened human escalation");
  assert.equal(approvalEntry.scale_direction, "wait for human escalation resolution before continuing");

  const resolutionResult = await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "reopen",
    note: "Need broader clarification after veto"
  });

  assert.equal(resolutionResult.status, "reopened");
  assert.equal(resolutionResult.currentStage, "clarification");
  assert.equal(resolutionResult.escalation.status, "resolved");
  assert.equal(resolutionResult.escalation.resolution, "reopen");

  const reopenedSession = await loadSession(runResult.sessionPath);
  assert.equal(reopenedSession.status, "reopened");
  assert.equal(reopenedSession.current_stage, "clarification");
  assert.equal(reopenedSession.reopen_count, 1);
  assert.equal(reopenedSession.escalation.status, "resolved");
  assert.equal(reopenedSession.escalation.resolution_note, "Need broader clarification after veto");
  assert.equal(reopenedSession.stage_transitions.at(-1)?.reason, "human-escalation-reopen");
});

test("answerCommand can resume an escalation-reopened session back into planning", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: ["Guardian=yes"],
    temperature: undefined
  });

  await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "reopen",
    note: "Need broader clarification after veto"
  });

  const resumed = await answerCommand({
    session: runResult.sessionPath,
    responses: ["Guardian 指摘を踏まえて認証制約を維持したまま段階導入する"]
  });

  assert.equal(resumed.status, "framed");
  assert.equal(resumed.currentStage, "planning");
  assert.ok(resumed.decisionId);

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.status, "framed");
  assert.equal(session.current_stage, "planning");
  assert.equal(session.routing_mode, "fast-track");
  assert.equal(session.escalation.status, "resolved");
  assert.equal("stop_reason" in session, false);
  assert.equal("recoverability" in session, false);
  assert.equal("suggested_next_action" in session, false);
});

test("escalation-reopened fast-track session can continue into proposal and review", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: ["Guardian=yes"],
    temperature: undefined
  });

  await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "reopen",
    note: "Need broader clarification after veto"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: ["Guardian 指摘を踏まえて認証制約を維持したまま段階導入する"]
  });

  const proposalResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "proposal",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  const reviewResult = await councilExecCommand({
    session: runResult.sessionPath,
    stage: "review",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: [],
    temperature: undefined
  });

  assert.equal(proposalResult.executionStatus, "completed");
  assert.equal(proposalResult.execution.steps.length, 1);
  assert.deepEqual(proposalResult.execution.steps.map((step) => step.role), ["Builder"]);

  assert.equal(reviewResult.executionStatus, "completed");
  assert.equal(reviewResult.execution.steps.length, 1);
  assert.deepEqual(reviewResult.execution.steps.map((step) => step.role), ["Guardian"]);

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.status, "framed");
  assert.equal(session.current_stage, "planning");
  assert.equal(session.routing_mode, "fast-track");
  assert.equal(session.council_execution_runs.length, 3);
  assert.deepEqual(
    session.council_execution_runs.map((run) => run.stage),
    ["approval", "proposal", "review"]
  );
});

test("approval rejection can be resolved into human approve", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: ["Guardian=yes"],
    temperature: undefined
  });

  const resolutionResult = await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "approve",
    note: "Human approver accepted the exception"
  });

  assert.equal(resolutionResult.status, "closed");
  assert.equal(resolutionResult.currentStage, "approval");
  assert.equal(resolutionResult.stopReason, "human-escalation-approved");
  assert.equal(resolutionResult.escalation.status, "resolved");
  assert.equal(resolutionResult.escalation.resolution, "approve");
  assert.equal(resolutionResult.projectMemory.confirmationResult?.ok, true);

  const closedSession = await loadSession(runResult.sessionPath);
  assert.equal(closedSession.status, "closed");
  assert.equal(closedSession.current_stage, "approval");
  assert.equal(closedSession.suggested_next_action, "record final approval outcome and proceed to closure");

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  const latestEntry = confirmationWindow.entries.at(-1);
  assert.equal(latestEntry.question, "human escalation で何を決めたか");
  assert.equal(latestEntry.answer, "Human approver accepted the exception");
  assert.equal(latestEntry.scale_direction, "close the current slice and proceed to outcome tracking");
});

test("approval rejection can be resolved into stop", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
  });

  await answerCommand({
    session: runResult.sessionPath,
    responses: [
      "新規登録導線全体",
      "登録完了率を 5% 改善する",
      "認証基盤は変更しない"
    ]
  });

  await councilExecCommand({
    session: runResult.sessionPath,
    stage: "approval",
    project: projectRoot,
    role: "",
    includeOptional: false,
    invokeModel: true,
    provider: "mock",
    model: "",
    baseUrl: "",
    apiKey: "",
    apiKeyEnv: "",
    mockSeatDecisions: [],
    mockSeatVetos: ["Guardian=yes"],
    temperature: undefined
  });

  const resolutionResult = await escalationResolveCommand({
    session: runResult.sessionPath,
    resolution: "stop",
    note: "Human approver chose to stop the work"
  });

  assert.equal(resolutionResult.status, "stopped");
  assert.equal(resolutionResult.currentStage, "approval");
  assert.equal(resolutionResult.stopReason, "human-escalation-stopped");
  assert.equal(resolutionResult.escalation.status, "resolved");
  assert.equal(resolutionResult.escalation.resolution, "stop");

  const stoppedSession = await loadSession(runResult.sessionPath);
  assert.equal(stoppedSession.status, "stopped");
  assert.equal(stoppedSession.current_stage, "approval");
  assert.equal(stoppedSession.suggested_next_action, "stop work and wait for a new trigger");
});
