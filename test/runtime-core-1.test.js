import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { answerCommand } from "../src/commands/answer.js";
import { allocationPlanRecordCommand } from "../src/commands/allocation-plan-record.js";
import { alternativeAnalysisRecordCommand } from "../src/commands/alternative-analysis-record.js";
import { anomalyLogRecordCommand } from "../src/commands/anomaly-log-record.js";
import { assumptionMapRecordCommand } from "../src/commands/assumption-map-record.js";
import { breakthroughLibraryRegisterCommand } from "../src/commands/breakthrough-library-register.js";
import { breakthroughPatternRecordCommand } from "../src/commands/breakthrough-pattern-record.js";
import { decisionVerifyCommand } from "../src/commands/decision-verify.js";
import { discoveryHandoffBenchmarkCommand } from "../src/commands/discovery-handoff-benchmark.js";
import { discoveryJudgmentPacketCommand } from "../src/commands/discovery-judgment-packet.js";
import { discoveryHandoffRecordCommand } from "../src/commands/discovery-handoff-record.js";
import { discoveryQuestionSetRecordCommand } from "../src/commands/discovery-question-set-record.js";
import { experimentProposalRecordCommand } from "../src/commands/experiment-proposal-record.js";
import { goalProjectCommand } from "../src/commands/goal-project.js";
import { initProjectCommand } from "../src/commands/init-project.js";
import { metricsSnapshotCommand } from "../src/commands/metrics-snapshot.js";
import { needValidationAdvanceCommand } from "../src/commands/need-validation-advance.js";
import { needValidationBenchmarkCommand } from "../src/commands/need-validation-benchmark.js";
import { organizationVerifyCommand } from "../src/commands/organization-verify.js";
import { policyEvaluationReportCommand } from "../src/commands/policy-evaluation-report.js";
import { problemStatementRecordCommand } from "../src/commands/problem-statement-record.js";
import { projectCharterRecordCommand } from "../src/commands/project-charter-record.js";
import { resourceClaimRecordCommand } from "../src/commands/resource-claim-record.js";
import { upgradeProjectCommand } from "../src/commands/upgrade-project.js";
import { roleResultRecordCommand } from "../src/commands/role-result-record.js";
import { runCommand } from "../src/commands/run.js";
import { taskOpenCommand } from "../src/commands/task-open.js";
import { needValidationRecordCommand } from "../src/commands/need-validation-record.js";
import { valueHypothesisRecordCommand } from "../src/commands/value-hypothesis-record.js";
import { loadSession } from "../src/runtime/session.js";
import { loadTemplate } from "../src/runtime/template-loader.js";
import { packageVersion, exampleProjectRoot, createTempProject, createTempProjectWithDecisions, createInitializedProject } from "./runtime-test-helpers.js";

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
  const commandRegistry = JSON.parse(await fs.readFile(path.join(projectRoot, ".aof", "command-registry.json"), "utf8"));
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
  assert.equal(bootstrap.command_registry_ref, ".aof/command-registry.json");
  assert.equal(bootstrap.skills_ref, ".aof/skills.json");
  assert.equal(bootstrap.capability_registry_ref, ".aof/capability-registry.json");
  assert.equal(bootstrap.resource_inventory_ref, ".aof/resource-inventory.json");
  assert.equal(bootstrap.policy_ref, ".aof/policies.json");
  assert.equal(orientation.orientation_type, "project-orientation");
  assert.equal(orientation.command_registry_ref, ".aof/command-registry.json");
  assert.equal(organization.skills_ref, ".aof/skills.json");
  assert.equal(commandRegistry.artifact_type, "command-registry");
  assert.equal(commandRegistry.commands.some((entry) => entry.command === "organization-status"), true);
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
  const commandRegistry = JSON.parse(await fs.readFile(path.join(aofRoot, "command-registry.json"), "utf8"));
  const skills = JSON.parse(await fs.readFile(path.join(aofRoot, "skills.json"), "utf8"));
  const capabilityRegistry = JSON.parse(await fs.readFile(path.join(aofRoot, "capability-registry.json"), "utf8"));
  const resourceInventory = JSON.parse(await fs.readFile(path.join(aofRoot, "resource-inventory.json"), "utf8"));
  const policySet = JSON.parse(await fs.readFile(path.join(aofRoot, "policies.json"), "utf8"));
  const operatingGoal = JSON.parse(await fs.readFile(path.join(aofRoot, "goals", "operating-goal.json"), "utf8"));
  const confirmationWindow = JSON.parse(await fs.readFile(path.join(aofRoot, "context", "active", "recent-confirmation-window.json"), "utf8"));

  assert.equal(bootstrap.bootstrap_type, "aof-project-bootstrap");
  assert.equal(bootstrap.bootstrap_format_version, 1);
  assert.equal(bootstrap.aof_version, packageVersion);
  assert.equal(bootstrap.command_registry_ref, ".aof/command-registry.json");
  assert.equal(bootstrap.skills_ref, ".aof/skills.json");
  assert.equal(bootstrap.capability_registry_ref, ".aof/capability-registry.json");
  assert.equal(bootstrap.resource_inventory_ref, ".aof/resource-inventory.json");
  assert.equal(bootstrap.policy_ref, ".aof/policies.json");
  assert.equal(orientation.orientation_type, "project-orientation");
  assert.equal(orientation.command_registry_ref, ".aof/command-registry.json");
  assert.equal(organization.skills_ref, ".aof/skills.json");
  assert.equal(commandRegistry.artifact_type, "command-registry");
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
  assert.equal(result.checks.some((entry) => entry.name === "command_registry schema" && entry.status === "pass"), true);
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

test("decisionVerifyCommand reports an empty committed decision inventory when the fixture has no decision JSON artifacts", async () => {
  const result = await decisionVerifyCommand({
    project: exampleProjectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.decisionCount, 0);
  assert.equal(result.summary.failed_checks, 0);
  assert.equal(result.checks.some((entry) => entry.name === "decision inventory" && entry.status === "pass"), true);
});

test("decisionVerifyCommand validates committed decision artifacts", async (t) => {
  const projectRoot = await createTempProjectWithDecisions(t);
  const result = await decisionVerifyCommand({
    project: projectRoot
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

test("CLI discovery-handoff-record accepts need, intent, and context flags", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const artifactPath = path.join(projectRoot, ".aof", "artifacts", "discovery", "handoffs", "DHO-CLI.json");

  const result = spawnSync(process.execPath, [
    "./src/cli.js",
    "discovery-handoff-record",
    "--project", projectRoot,
    "--selected-need", "Reduce activation failure for invited admins",
    "--intended-user-or-segment", "newly invited workspace admins",
    "--context-summary", "analytics and interviews indicate confusion during permission setup",
    "--hypothesis", "clearer permission framing will improve activation completion",
    "--delivery-validation", "validate permission-step comprehension before UI rollout",
    "--need", "Reduce activation failure for invited admins",
    "--intent", "Ship the smallest validated onboarding change",
    "--context", "Discovery narrowed the problem to permission setup confusion",
    "--write-artifact", artifactPath
  ], {
    cwd: path.resolve("."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  assert.equal(payload.need, "Reduce activation failure for invited admins");
  assert.equal(payload.intent, "Ship the smallest validated onboarding change");
  assert.equal(payload.context, "Discovery narrowed the problem to permission setup confusion");
});

test("problemStatementRecordCommand writes a valid problem statement artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await problemStatementRecordCommand({
    project: projectRoot,
    affectedParty: "newly invited workspace admins",
    actualProblem: "activation fails during permission setup",
    whyItMatters: "high-intent admins fail before reaching value",
    whyNow: "activation drop-off is blocking the current onboarding target",
    evidenceRefs: ["docs/research/funnel-notes.md"],
    sourceTaskId: "TASK-021"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.artifact_type, "problem-statement");
  assert.equal(payload.affected_party, "newly invited workspace admins");
});

test("valueHypothesisRecordCommand writes a valid value hypothesis artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await valueHypothesisRecordCommand({
    project: projectRoot,
    expectedValueCreation: "higher activation completion and faster time to first value",
    beneficiary: "newly invited workspace admins and the owning workspace",
    supportingEvidence: ["interviews indicate permission-step confusion"],
    successCriteria: ["activation completion improves", "permission-step comprehension improves"],
    sourceTaskId: "TASK-021"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.artifact_type, "value-hypothesis");
  assert.equal(payload.success_criteria.length, 2);
});

test("alternativeAnalysisRecordCommand writes a valid alternative analysis artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await alternativeAnalysisRecordCommand({
    project: projectRoot,
    subjectNeed: "Reduce activation failure for invited admins",
    alternativeSolutions: ["clarify permission setup in-product"],
    nonSolutionOptions: ["tighten qualification and do nothing in-product"],
    deferOptions: ["wait for more interviews"],
    stopOptions: ["do not create a project if the problem is not reproducible"],
    sourceTaskId: "TASK-021"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.artifact_type, "alternative-analysis");
  assert.equal(payload.stop_options[0], "do not create a project if the problem is not reproducible");
});

test("experimentProposalRecordCommand writes a valid experiment proposal artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await experimentProposalRecordCommand({
    project: projectRoot,
    assumptionToTest: "permission-step confusion is the primary activation blocker",
    smallestTestableValidation: "five moderated walkthroughs with revised permission framing",
    expectedLearning: "whether comprehension improves before UI build",
    expectedCost: "one day of research and lightweight prototype work",
    successThreshold: "at least four of five participants complete setup without help",
    sourceTaskId: "TASK-021"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.artifact_type, "experiment-proposal");
  assert.equal(payload.expected_cost, "one day of research and lightweight prototype work");
});

test("projectCharterRecordCommand writes a valid project charter artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await projectCharterRecordCommand({
    project: projectRoot,
    validatedNeedRef: ".aof/artifacts/need-validation/records/NVR-001.json",
    validatedObjective: "Ship the smallest validated intervention that reduces permission-step activation failure",
    scope: ["permission-step framing", "activation measurement"],
    constraints: ["do not redesign the full onboarding flow"],
    expectedOutcomes: ["higher activation completion", "clearer scope grounded in validated need"],
    sourceTaskId: "TASK-021"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.artifact_type, "project-charter");
  assert.equal(payload.scope[0], "permission-step framing");
});

test("needValidationRecordCommand writes a valid need validation artifact", async (t) => {
  const projectRoot = await createInitializedProject(t);

  const result = await needValidationRecordCommand({
    project: projectRoot,
    rawNeed: "Improve onboarding",
    validationStatus: "validated",
    validatedNeed: "Reduce activation failure caused by permission-step confusion for newly invited admins",
    decisionSummary: "The raw request was too broad; the validated need is narrower and evidence-backed.",
    authorityAction: "approve-project-charter",
    projectCreationRecommendation: "create-project",
    validationQuestionsAnswered: [
      {
        question: "Who is affected?",
        answer: "newly invited workspace admins",
        evidence_state: "sufficient"
      }
    ],
    hiddenAssumptions: ["activation failure was assumed to be motivation-related"],
    evidenceGaps: ["broader quantitative validation is still limited"],
    problemStatementRef: ".aof/artifacts/need-validation/problem-statements/PST-001.json",
    valueHypothesisRef: ".aof/artifacts/need-validation/value-hypotheses/VHY-001.json",
    alternativeAnalysisRef: ".aof/artifacts/need-validation/alternative-analyses/ALT-001.json",
    experimentProposalRef: ".aof/artifacts/need-validation/experiment-proposals/EXP-001.json",
    projectCharterRef: ".aof/artifacts/need-validation/project-charters/PCH-001.json",
    discoveryHandoffRef: ".aof/artifacts/discovery/handoffs/DHO-001.json",
    sourceTaskId: "TASK-021"
  });

  assert.equal(result.ok, true);
  const payload = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(payload.record_type, "need-validation-record");
  assert.equal(payload.project_creation_recommendation, "create-project");
});

test("needValidationAdvanceCommand promotes a need-validation session into planning only with approved artifacts", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    request: "初回離脱率を下げたい",
    project: projectRoot
  });

  const answerResult = await answerCommand({
    session: runResult.sessionPath,
    responses: ["新規登録導線全体", "登録完了率", "認証基盤は変更しない"]
  });

  assert.equal(answerResult.currentStage, "need-validation");

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

  const advanced = await needValidationAdvanceCommand({
    session: answerResult.sessionPath,
    needValidationRecord: validation.artifactPath
  });

  assert.equal(advanced.ok, true);
  assert.equal(advanced.currentStage, "planning");
  const session = await loadSession(answerResult.sessionPath);
  assert.equal(session.current_stage, "planning");
});

test("needValidationBenchmarkCommand evaluates the NV benchmark surface", async (t) => {
  const projectRoot = await createInitializedProject(t);

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
  const experiment = await experimentProposalRecordCommand({
    project: projectRoot,
    assumptionToTest: "permission-step confusion is the blocker",
    smallestTestableValidation: "five moderated walkthroughs",
    expectedLearning: "whether comprehension improves before build",
    expectedCost: "one day of research",
    successThreshold: "four of five complete setup"
  });
  const charter = await projectCharterRecordCommand({
    project: projectRoot,
    validatedNeedRef: ".aof/artifacts/need-validation/records/NVR-001.json",
    validatedObjective: "Ship the smallest validated intervention",
    scope: ["permission-step framing"],
    constraints: ["do not redesign the full onboarding flow"],
    expectedOutcomes: ["higher activation completion"]
  });

  await needValidationRecordCommand({
    project: projectRoot,
    rawNeed: "Improve onboarding",
    validationStatus: "validated",
    validatedNeed: "Reduce activation failure caused by permission-step confusion",
    decisionSummary: "Validated and ready.",
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
    experimentProposalRef: path.relative(projectRoot, experiment.artifactPath).replaceAll("\\", "/"),
    projectCharterRef: path.relative(projectRoot, charter.artifactPath).replaceAll("\\", "/")
  });

  await needValidationRecordCommand({
    project: projectRoot,
    rawNeed: "Build a dashboard because someone asked for it",
    validationStatus: "rejected",
    validatedNeed: null,
    decisionSummary: "The request is solution-first and should not become a project.",
    authorityAction: "reject-need",
    projectCreationRecommendation: "do-not-create-project",
    validationQuestionsAnswered: [
      { question: "What problem actually exists?", answer: "No validated problem was evidenced.", evidence_state: "weak" }
    ],
    hiddenAssumptions: ["a dashboard is the right answer"],
    evidenceGaps: ["no buyer evidence"],
    problemStatementRef: path.relative(projectRoot, problem.artifactPath).replaceAll("\\", "/"),
    valueHypothesisRef: path.relative(projectRoot, value.artifactPath).replaceAll("\\", "/"),
    alternativeAnalysisRef: path.relative(projectRoot, alternatives.artifactPath).replaceAll("\\", "/"),
    experimentProposalRef: path.relative(projectRoot, experiment.artifactPath).replaceAll("\\", "/")
  });

  const result = await needValidationBenchmarkCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.benchmarks["NV-001"].status, "pass");
  assert.equal(result.summary.benchmarks["NV-006"].status, "pass");
});

async function createDiscoveryBenchmarkPassChain(projectRoot) {
  const questionSet = await discoveryQuestionSetRecordCommand({
    project: projectRoot,
    discoveryObjective: "Determine the next release direction",
    keyQuestions: ["Which upstream evidence is still missing before Need Validation?"],
    targetUserOrMarketSlice: "AOF maintainers planning the next release",
    targetAssumptions: ["Need Validation alone is sufficient"],
    targetAnomalies: ["Discovery remains research-track"],
    signals: ["handoff when evidence and judgment are explicit"],
    sourceTaskId: "TASK-DHB-001"
  });
  const assumptionMap = await assumptionMapRecordCommand({
    project: projectRoot,
    subject: "v3.3 discovery direction",
    assumptions: [{
      assumption: "Need Validation alone is enough",
      assumption_type: "technology",
      confidence: 0.5,
      evidence_state: "moderate",
      break_test_question: "What upstream evidence is still assembled manually?"
    }],
    sourceTaskId: "TASK-DHB-001"
  });
  const anomalyLog = await anomalyLogRecordCommand({
    project: projectRoot,
    subject: "v3.3 discovery direction",
    anomalies: [{
      observed_anomaly: "Discovery artifacts exist but remain research-track",
      why_it_matters: "The project-creation story is still incomplete upstream of Need Validation",
      challenged_assumption: "Need Validation can start from consistently governed evidence today",
      follow_up_recommendation: "Promote discovery evidence and handoff into the next release boundary"
    }],
    sourceTaskId: "TASK-DHB-001"
  });
  const judgment = await discoveryJudgmentPacketCommand({
    project: projectRoot,
    councilId: "discovery-council",
    judgmentStatus: "synthesize-handoff",
    decisionSummary: "Discovery evidence is strong enough to hand off.",
    rationale: "The chain is narrow and evidence-bearing.",
    desirabilityAssessment: "It directly improves project-selection quality.",
    feasibilityAssessment: "The required contract is already close to the current runtime.",
    riskAssessment: "The boundary remains honest if Discovery does not authorize projects directly.",
    evidenceQualityState: "sufficient",
    recommendedNextStep: "Create a discovery handoff and run Need Validation.",
    questionSetRefs: [path.relative(projectRoot, questionSet.artifactPath).replaceAll("\\", "/")],
    artifactRefs: [
      path.relative(projectRoot, assumptionMap.artifactPath).replaceAll("\\", "/"),
      path.relative(projectRoot, anomalyLog.artifactPath).replaceAll("\\", "/")
    ],
    promotionReady: true,
    handoffRequired: true,
    sourceTaskId: "TASK-DHB-001"
  });
  const handoff = await discoveryHandoffRecordCommand({
    project: projectRoot,
    selectedNeed: "Standardize discovery evidence before Need Validation",
    intendedUserOrSegment: "AOF maintainers",
    contextSummary: "Need Validation exists, but upstream evidence quality is uneven.",
    hypothesis: "A governed discovery handoff will improve project selection quality.",
    evidenceRefs: ["docs/discovery.md"],
    rejectedAlternatives: ["Broaden execution autonomy first"],
    explicitRisks: ["Discovery could become too broad if the contract is not kept narrow"],
    deliveryValidationRequirements: ["Need Validation must remain the only approval gate"],
    need: "Define the next release direction without weakening pre-project governance",
    intent: "Create a release-grade discovery-to-need-validation contract",
    context: "AOF is self-hosting and backend-neutral",
    sourceTaskId: "TASK-DHB-001"
  });
  const problem = await problemStatementRecordCommand({
    project: projectRoot,
    affectedParty: "AOF maintainers",
    actualProblem: "Upstream discovery evidence is not yet release-grade",
    whyItMatters: "Projects can still start from uneven evidence quality",
    whyNow: "Need Validation became mandatory in v3.2",
    evidenceRefs: ["docs/discovery.md"],
    sourceTaskId: "TASK-DHB-001"
  });
  const value = await valueHypothesisRecordCommand({
    project: projectRoot,
    expectedValueCreation: "Stronger project-selection quality before planning",
    beneficiary: "AOF maintainers",
    supportingEvidence: ["Discovery artifacts already exist in the runtime"],
    successCriteria: ["The chain reaches Need Validation with explicit handoff evidence"],
    sourceTaskId: "TASK-DHB-001"
  });
  const alternatives = await alternativeAnalysisRecordCommand({
    project: projectRoot,
    subjectNeed: "Define the next release direction",
    alternativeSolutions: ["Promote discovery evidence into the release contract"],
    stopOptions: ["Do not create a new release direction if no evidence exists"],
    sourceTaskId: "TASK-DHB-001"
  });
  const charter = await projectCharterRecordCommand({
    project: projectRoot,
    validatedNeedRef: ".aof/artifacts/need-validation/records/NVR-DHB-001.json",
    validatedObjective: "Define the smallest release-grade discovery contract before Need Validation",
    scope: ["discovery evidence", "discovery judgment", "discovery handoff"],
    constraints: ["Discovery does not directly authorize project creation"],
    expectedOutcomes: ["A coherent upstream contract exists"],
    sourceTaskId: "TASK-DHB-001",
    artifactPath: path.join(projectRoot, ".aof", "artifacts", "need-validation", "project-charters", "PCH-DHB-001.json")
  });
  const validation = await needValidationRecordCommand({
    project: projectRoot,
    rawNeed: "Define the next release direction",
    validationStatus: "validated",
    validatedNeed: "Define a narrow discovery-evidence release before Need Validation",
    decisionSummary: "The upstream evidence gap is specific enough to become a project-ready direction.",
    authorityAction: "approve-project-charter",
    projectCreationRecommendation: "create-project",
    validationQuestionsAnswered: [
      { question: "Who is affected?", answer: "AOF maintainers", evidence_state: "sufficient" }
    ],
    hiddenAssumptions: [],
    evidenceGaps: [],
    problemStatementRef: path.relative(projectRoot, problem.artifactPath).replaceAll("\\", "/"),
    valueHypothesisRef: path.relative(projectRoot, value.artifactPath).replaceAll("\\", "/"),
    alternativeAnalysisRef: path.relative(projectRoot, alternatives.artifactPath).replaceAll("\\", "/"),
    projectCharterRef: path.relative(projectRoot, charter.artifactPath).replaceAll("\\", "/"),
    discoveryHandoffRef: path.relative(projectRoot, handoff.artifactPath).replaceAll("\\", "/"),
    sourceTaskId: "TASK-DHB-001",
    artifactPath: path.join(projectRoot, ".aof", "artifacts", "need-validation", "records", "NVR-DHB-001.json")
  });
  await fs.writeFile(charter.artifactPath, JSON.stringify({
    ...JSON.parse(await fs.readFile(charter.artifactPath, "utf8")),
    validated_need_ref: path.relative(projectRoot, validation.artifactPath).replaceAll("\\", "/")
  }, null, 2) + "\n", "utf8");

  await discoveryQuestionSetRecordCommand({
    project: projectRoot,
    discoveryObjective: "Represent a blocked upstream evidence case",
    keyQuestions: ["What evidence is still missing?"],
    targetUserOrMarketSlice: "blocked case",
    targetAssumptions: ["This may not be ready to hand off"],
    targetAnomalies: ["No external evidence is present"],
    signals: ["continue exploration if no evidence appears"],
    sourceTaskId: "TASK-DHB-005"
  });
  const blockedAssumption = await assumptionMapRecordCommand({
    project: projectRoot,
    subject: "blocked discovery case",
    assumptions: [{
      assumption: "The opportunity is already validated enough",
      assumption_type: "market",
      confidence: 0.2,
      evidence_state: "weak",
      break_test_question: "What external evidence supports the opportunity?"
    }],
    sourceTaskId: "TASK-DHB-005"
  });
  const blockedAnomaly = await anomalyLogRecordCommand({
    project: projectRoot,
    subject: "blocked discovery case",
    anomalies: [{
      observed_anomaly: "No external evidence confirms the problem",
      why_it_matters: "The project should remain blocked upstream",
      challenged_assumption: "The opportunity is ready for handoff",
      follow_up_recommendation: "Continue exploration"
    }],
    sourceTaskId: "TASK-DHB-005"
  });
  await discoveryJudgmentPacketCommand({
    project: projectRoot,
    councilId: "discovery-council",
    judgmentStatus: "continue-exploration",
    decisionSummary: "Evidence is too weak for handoff.",
    rationale: "The anomaly is unresolved.",
    desirabilityAssessment: "Potentially useful, but still unproven.",
    feasibilityAssessment: "Too early to judge.",
    riskAssessment: "Project creation would be premature.",
    evidenceQualityState: "weak",
    recommendedNextStep: "Continue exploration until external evidence exists.",
    questionSetRefs: [".aof/artifacts/discovery/question-sets/DQS-001.json"],
    artifactRefs: [
      path.relative(projectRoot, blockedAssumption.artifactPath).replaceAll("\\", "/"),
      path.relative(projectRoot, blockedAnomaly.artifactPath).replaceAll("\\", "/")
    ],
    promotionReady: false,
    handoffRequired: false,
    sourceTaskId: "TASK-DHB-005"
  });

  return { judgment, handoff, validation };
}

test("discoveryHandoffBenchmarkCommand evaluates the DH benchmark surface", async (t) => {
  const projectRoot = await createInitializedProject(t);
  await createDiscoveryBenchmarkPassChain(projectRoot);

  const result = await discoveryHandoffBenchmarkCommand({
    project: projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.benchmarks["DH-001"].status, "pass");
  assert.equal(result.summary.benchmarks["DH-004"].status, "pass");
  assert.equal(result.summary.benchmarks["DH-005"].status, "pass");
});

test("discoveryHandoffBenchmarkCommand fails when a linked chain is missing discovery judgment evidence", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const questionSet = await discoveryQuestionSetRecordCommand({
    project: projectRoot,
    discoveryObjective: "Test missing judgment",
    keyQuestions: ["What is missing?"],
    targetUserOrMarketSlice: "test",
    signals: ["stop when evidence is absent"],
    sourceTaskId: "TASK-DHB-MISS-JDG"
  });
  await assumptionMapRecordCommand({
    project: projectRoot,
    subject: "missing judgment case",
    assumptions: [{
      assumption: "Evidence is probably enough",
      assumption_type: "market",
      confidence: 0.4,
      evidence_state: "weak",
      break_test_question: "What supports this?"
    }],
    sourceTaskId: "TASK-DHB-MISS-JDG"
  });
  await anomalyLogRecordCommand({
    project: projectRoot,
    subject: "missing judgment case",
    anomalies: [{
      observed_anomaly: "No judgment exists",
      why_it_matters: "Handoff would be unaudited",
      challenged_assumption: "The chain is complete",
      follow_up_recommendation: "Require discovery judgment before handoff"
    }],
    sourceTaskId: "TASK-DHB-MISS-JDG"
  });
  const handoff = await discoveryHandoffRecordCommand({
    project: projectRoot,
    selectedNeed: "Test missing judgment",
    intendedUserOrSegment: "test segment",
    contextSummary: "Missing discovery judgment",
    hypothesis: "Benchmark should fail",
    evidenceRefs: ["docs/test.md"],
    rejectedAlternatives: ["skip the benchmark"],
    explicitRisks: ["judgment is absent"],
    deliveryValidationRequirements: ["judgment must exist"],
    need: "Test missing judgment",
    intent: "Fail the benchmark",
    context: "No judgment packet exists",
    sourceTaskId: "TASK-DHB-MISS-JDG"
  });
  const problem = await problemStatementRecordCommand({
    project: projectRoot,
    affectedParty: "test user",
    actualProblem: "Missing discovery judgment",
    whyItMatters: "The chain is incomplete",
    whyNow: "The benchmark should catch it",
    evidenceRefs: ["docs/test.md"]
  });
  const value = await valueHypothesisRecordCommand({
    project: projectRoot,
    expectedValueCreation: "Catch incomplete chains",
    beneficiary: "test user",
    supportingEvidence: ["benchmark expectations"],
    successCriteria: ["DH-001 fails"]
  });
  const alternatives = await alternativeAnalysisRecordCommand({
    project: projectRoot,
    subjectNeed: "Test missing judgment",
    alternativeSolutions: ["add a judgment packet"],
    stopOptions: ["stop the chain"]
  });
  await needValidationRecordCommand({
    project: projectRoot,
    rawNeed: "Test missing judgment",
    validationStatus: "validated",
    validatedNeed: "Test missing judgment",
    decisionSummary: "The benchmark should detect the missing judgment.",
    authorityAction: "approve-project-charter",
    projectCreationRecommendation: "create-project",
    validationQuestionsAnswered: [
      { question: "Who is affected?", answer: "test user", evidence_state: "sufficient" }
    ],
    hiddenAssumptions: [],
    evidenceGaps: [],
    problemStatementRef: path.relative(projectRoot, problem.artifactPath).replaceAll("\\", "/"),
    valueHypothesisRef: path.relative(projectRoot, value.artifactPath).replaceAll("\\", "/"),
    alternativeAnalysisRef: path.relative(projectRoot, alternatives.artifactPath).replaceAll("\\", "/"),
    projectCharterRef: null,
    discoveryHandoffRef: path.relative(projectRoot, handoff.artifactPath).replaceAll("\\", "/"),
    sourceTaskId: "TASK-DHB-MISS-JDG"
  });

  const result = await discoveryHandoffBenchmarkCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.equal(result.summary.benchmarks["DH-001"].status, "fail");
});

test("discoveryHandoffBenchmarkCommand fails when the handoff packet is incomplete", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const { handoff } = await createDiscoveryBenchmarkPassChain(projectRoot);
  const payload = JSON.parse(await fs.readFile(handoff.artifactPath, "utf8"));
  payload.rejected_alternatives = [];
  await fs.writeFile(handoff.artifactPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const result = await discoveryHandoffBenchmarkCommand({
    project: projectRoot
  });

  assert.equal(result.ok, false);
  assert.equal(result.summary.benchmarks["DH-003"].status, "fail");
});
