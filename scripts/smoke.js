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

    const escalationRun = runCli([
      "run",
      "Smoke-test escalation flow",
      "--project",
      projectRoot,
      "--fast-track"
    ], "escalation run");

    const escalationAnswer = runCli([
      "answer",
      "--session",
      escalationRun.sessionPath,
      "--response",
      "認証付き onboarding 全体",
      "--response",
      "完了率を 3% 改善する",
      "--response",
      "既存のセキュリティ制約は維持する"
    ], "escalation answer");

    const escalationApproval = runCli([
      "council-exec",
      "--session",
      escalationRun.sessionPath,
      "--stage",
      "approval",
      "--invoke-model",
      "--provider",
      "mock",
      "--mock-seat-veto",
      "Guardian=yes"
    ], "escalation approval");

    const escalationResolution = runCli([
      "escalation-resolve",
      "--session",
      escalationRun.sessionPath,
      "--resolution",
      "reopen",
      "--note",
      "Need broader clarification after Guardian veto"
    ], "escalation resolve");

    const escalationApproveRun = runCli([
      "run",
      "Smoke-test escalation approve flow",
      "--project",
      projectRoot,
      "--fast-track"
    ], "escalation approve run");

    const escalationApproveAnswer = runCli([
      "answer",
      "--session",
      escalationApproveRun.sessionPath,
      "--response",
      "課金導線全体",
      "--response",
      "CVR を 2% 改善する",
      "--response",
      "既存コンプライアンス制約は維持する"
    ], "escalation approve answer");

    const escalationApproveApproval = runCli([
      "council-exec",
      "--session",
      escalationApproveRun.sessionPath,
      "--stage",
      "approval",
      "--invoke-model",
      "--provider",
      "mock",
      "--mock-seat-veto",
      "Guardian=yes"
    ], "escalation approve approval");

    const escalationApproveResolution = runCli([
      "escalation-resolve",
      "--session",
      escalationApproveRun.sessionPath,
      "--resolution",
      "approve",
      "--note",
      "Human approver accepted the exception"
    ], "escalation approve resolve");

    const escalationStopRun = runCli([
      "run",
      "Smoke-test escalation stop flow",
      "--project",
      projectRoot,
      "--fast-track"
    ], "escalation stop run");

    const escalationStopAnswer = runCli([
      "answer",
      "--session",
      escalationStopRun.sessionPath,
      "--response",
      "通知導線全体",
      "--response",
      "継続率を 2% 改善する",
      "--response",
      "運用リスクが高ければ停止してよい"
    ], "escalation stop answer");

    const escalationStopApproval = runCli([
      "council-exec",
      "--session",
      escalationStopRun.sessionPath,
      "--stage",
      "approval",
      "--invoke-model",
      "--provider",
      "mock",
      "--mock-seat-veto",
      "Guardian=yes"
    ], "escalation stop approval");

    const escalationStopResolution = runCli([
      "escalation-resolve",
      "--session",
      escalationStopRun.sessionPath,
      "--resolution",
      "stop",
      "--note",
      "Human approver chose to stop the work"
    ], "escalation stop resolve");

    const signalRun = runCli([
      "run",
      "Smoke-test external signal reopen flow",
      "--project",
      projectRoot,
      "--fast-track"
    ], "signal run");

    const signalAnswer = runCli([
      "answer",
      "--session",
      signalRun.sessionPath,
      "--response",
      "新規登録導線全体",
      "--response",
      "登録完了率を 4% 改善する",
      "--response",
      "認証制約は維持する"
    ], "signal answer");

    const signalResult = runCli([
      "signal",
      "--session",
      signalRun.sessionPath,
      "--signal",
      path.join(projectRoot, ".aof", "signals", "SIG-001.json")
    ], "signal reopen");

    if (answerResult.status !== "framed" || answerResult.currentStage !== "planning") {
      throw new Error("Smoke answer flow did not advance the session into planning.");
    }

    if (planningExecution.executionStatus !== "completed") {
      throw new Error("Planning council execution did not complete.");
    }

    if (approvalExecution.executionStatus !== "completed" || !approvalExecution.execution?.approval_outcome) {
      throw new Error("Approval council execution did not return an approval outcome.");
    }

    if (escalationAnswer.status !== "framed" || escalationAnswer.currentStage !== "planning") {
      throw new Error("Escalation smoke answer flow did not advance the session into planning.");
    }

    if (escalationApproval.execution?.approval_outcome?.status !== "rejected" || !escalationApproval.escalation) {
      throw new Error("Escalation smoke flow did not enter human escalation after approval rejection.");
    }

    if (escalationResolution.status !== "reopened" || escalationResolution.currentStage !== "clarification") {
      throw new Error("Escalation resolution did not reopen the session into clarification.");
    }

    if (escalationApproveAnswer.status !== "framed" || escalationApproveAnswer.currentStage !== "planning") {
      throw new Error("Escalation approve smoke answer flow did not advance the session into planning.");
    }

    if (escalationApproveApproval.execution?.approval_outcome?.status !== "rejected" || !escalationApproveApproval.escalation) {
      throw new Error("Escalation approve smoke flow did not enter human escalation after approval rejection.");
    }

    if (escalationApproveResolution.status !== "closed" || escalationApproveResolution.currentStage !== "approval") {
      throw new Error("Escalation approve resolution did not close the session.");
    }

    if (escalationStopAnswer.status !== "framed" || escalationStopAnswer.currentStage !== "planning") {
      throw new Error("Escalation stop smoke answer flow did not advance the session into planning.");
    }

    if (escalationStopApproval.execution?.approval_outcome?.status !== "rejected" || !escalationStopApproval.escalation) {
      throw new Error("Escalation stop smoke flow did not enter human escalation after approval rejection.");
    }

    if (escalationStopResolution.status !== "stopped" || escalationStopResolution.currentStage !== "approval") {
      throw new Error("Escalation stop resolution did not stop the session.");
    }

    if (signalAnswer.status !== "framed" || signalAnswer.currentStage !== "planning") {
      throw new Error("Signal smoke answer flow did not advance the session into planning.");
    }

    if (signalResult.status !== "reopened" || signalResult.currentStage !== "clarification") {
      throw new Error("Signal smoke flow did not reopen the session into clarification.");
    }

    if (signalResult.routingMode !== "deep-path" || !signalResult.reopenContext?.routing_escalated) {
      throw new Error("Signal smoke flow did not escalate routing mode for deeper review.");
    }

    console.log(JSON.stringify({
      ok: true,
      sessionId: runResult.sessionId,
      routingMode: runResult.routingMode,
      planningExecutionId: planningExecution.executionId,
      approvalStatus: approvalExecution.execution.approval_outcome.status,
      escalationSessionId: escalationRun.sessionId,
      escalationStatus: escalationApproval.execution.approval_outcome.status,
      escalationResolution: escalationResolution.status,
      escalationApproveResolution: escalationApproveResolution.status,
      escalationStopResolution: escalationStopResolution.status,
      signalSessionId: signalRun.sessionId,
      signalRoutingMode: signalResult.routingMode
    }, null, 2));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
