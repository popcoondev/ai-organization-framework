import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { answerCommand } from "../src/commands/answer.js";
import { runCommand } from "../src/commands/run.js";
import { loadSession } from "../src/runtime/session.js";
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

test("loadTemplate succeeds with the example template", async (t) => {
  const projectRoot = await createTempProject(t);
  const template = await loadTemplate(projectRoot);

  assert.equal(template.organization.organization_id, "product-team");
  assert.equal(template.workflowId, "aidlc");
  assert.equal(template.actors.length, 3);
  assert.deepEqual(
    template.actors.map((actor) => actor.roles[0]),
    ["Visionary", "Builder", "Guardian"]
  );
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
    /actor\.roles must be a non-empty array/
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

  const session = await loadSession(result.sessionPath);
  assert.equal(session.current_stage, "clarification");
  assert.equal(session.open_decision_ids.length, 1);

  const sessionsDir = path.join(projectRoot, ".aof", "sessions");
  const decisionsDir = path.join(projectRoot, ".aof", "decisions");
  assert.equal(await countGeneratedFiles(sessionsDir, ".json"), 1);
  assert.equal(await countGeneratedFiles(decisionsDir, ".json"), 1);
  assert.equal(await countGeneratedFiles(decisionsDir, ".md"), 1);
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
  assert.equal(payload.pendingQuestions.length, 3);
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
