import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { answerCommand } from "../src/commands/answer.js";
import { councilExecCommand } from "../src/commands/council-exec.js";
import { escalationResolveCommand } from "../src/commands/escalation-resolve.js";
import { buildCouncilExecutionPlan } from "../src/runtime/council.js";
import { runCommand } from "../src/commands/run.js";
import {
  updateDecisionRecordForEscalation,
  updateDecisionRecordForEscalationResolution
} from "../src/runtime/decision.js";
import { loadSession } from "../src/runtime/session.js";
import { signalCommand } from "../src/commands/signal.js";
import { loadTemplate } from "../src/runtime/template-loader.js";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const exampleProjectRoot = path.join(repoRoot, "examples", "aidlc-template");

async function createTempProject(t) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-test-"));
  const projectRoot = path.join(tempRoot, "project");
  await fs.cp(exampleProjectRoot, projectRoot, { recursive: true });
  await resetStateDirectories(projectRoot);
  t.after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });
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

async function countGeneratedFiles(dirPath, extension) {
  const entries = await fs.readdir(dirPath);
  return entries.filter((entry) => entry.endsWith(extension)).length;
}

async function writeSignal(projectRoot, fileName, payload) {
  const signalPath = path.join(projectRoot, ".aof", "signals", fileName);
  await fs.writeFile(signalPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return signalPath;
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

  const sessionsDir = path.join(projectRoot, ".aof", "sessions");
  const decisionsDir = path.join(projectRoot, ".aof", "decisions");
  assert.equal(await countGeneratedFiles(sessionsDir, ".json"), 1);
  assert.equal(await countGeneratedFiles(decisionsDir, ".json"), 1);
  assert.equal(await countGeneratedFiles(decisionsDir, ".md"), 1);
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
  const result = spawnSync(
    process.execPath,
    [cliPath, "run", "初回離脱率を下げたい", "--project", projectRoot],
    { encoding: "utf8" }
  );

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
  const result = spawnSync(
    process.execPath,
    [cliPath, "run", "初回離脱率を下げたい", "--project", projectRoot, "--fast-track"],
    { encoding: "utf8" }
  );

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

test("signalCommand preserves fast-track when the signal only needs context review", async (t) => {
  const projectRoot = await createTempProject(t);
  const runResult = await runCommand({
    project: projectRoot,
    request: "初回離脱率を下げたい",
    routingMode: "fast-track"
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

  assert.equal(result.routingMode, "fast-track");

  const session = await loadSession(result.sessionPath);
  assert.equal(session.routing_mode, "fast-track");
  assert.equal(session.reopen_context.routing_escalated, false);
  assert.equal(session.reopen_context.next_routing_mode, "fast-track");
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
  assert.equal(session.reopen_context.previous_routing_mode, "fast-track");
  assert.equal(session.reopen_context.next_routing_mode, "deep-path");
  assert.equal(session.reopen_context.routing_escalated, true);
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

  const planningDecisionText = await fs.readFile(answerResult.decisionJsonPath, "utf8");
  const planningDecision = JSON.parse(planningDecisionText);
  assert.equal(planningDecision.stage, "planning");
  assert.equal(planningDecision.need, "新規登録導線全体");
  assert.equal(planningDecision.context_snapshot_id, session.context_snapshot_id);
  assert.equal(planningDecision.forecast_required, false);
  assert.match(session.context_snapshot_id, /^CTX-[A-Z0-9]+-[A-Z0-9]+$/);
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

  const escalatedSession = await loadSession(runResult.sessionPath);
  assert.equal(escalatedSession.status, "waiting_user");
  assert.equal(escalatedSession.current_stage, "approval");
  assert.equal(escalatedSession.stop_reason, "approval-failed-needs-human-escalation");

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
  assert.equal(reopenedSession.escalation.status, "resolved");
  assert.equal(reopenedSession.escalation.resolution_note, "Need broader clarification after veto");
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

  const closedSession = await loadSession(runResult.sessionPath);
  assert.equal(closedSession.status, "closed");
  assert.equal(closedSession.current_stage, "approval");
  assert.equal(closedSession.suggested_next_action, "record final approval outcome and proceed to closure");
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
