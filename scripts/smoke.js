import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(rootDir, "examples", "aidlc-template");
const cliPath = path.join(rootDir, "src", "cli.js");

function runCli(args, label) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: rootDir,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${label} failed.\n${output}`);
  }

  const stdout = result.stdout.trim();
  return stdout ? JSON.parse(stdout) : {};
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-smoke-"));
  const projectRoot = path.join(tempRoot, "project");

  try {
    await fs.cp(fixtureDir, projectRoot, { recursive: true });

    const runResult = runCli([
      "run",
      "Smoke-test the local AOF runtime",
      "--project",
      projectRoot,
      "--fast-track"
    ], "run");

    const answerResult = runCli([
      "answer",
      "--session",
      runResult.sessionPath,
      "--response",
      "新規登録導線全体",
      "--response",
      "登録完了率を 5% 改善する",
      "--response",
      "認証基盤は変更しない"
    ], "answer");

    const planningExecution = runCli([
      "council-exec",
      "--session",
      runResult.sessionPath,
      "--stage",
      "planning",
      "--invoke-model",
      "--provider",
      "mock"
    ], "planning council execution");

    const approvalExecution = runCli([
      "council-exec",
      "--session",
      runResult.sessionPath,
      "--stage",
      "approval",
      "--invoke-model",
      "--provider",
      "mock"
    ], "approval council execution");

    if (answerResult.status !== "framed" || answerResult.currentStage !== "planning") {
      throw new Error("Smoke answer flow did not advance the session into planning.");
    }

    if (planningExecution.executionStatus !== "completed") {
      throw new Error("Planning council execution did not complete.");
    }

    if (approvalExecution.executionStatus !== "completed" || !approvalExecution.execution?.approval_outcome) {
      throw new Error("Approval council execution did not return an approval outcome.");
    }

    console.log(JSON.stringify({
      ok: true,
      sessionId: runResult.sessionId,
      routingMode: runResult.routingMode,
      planningExecutionId: planningExecution.executionId,
      approvalStatus: approvalExecution.execution.approval_outcome.status
    }, null, 2));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
