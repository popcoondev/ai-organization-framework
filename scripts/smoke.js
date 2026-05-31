import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(rootDir, "examples", "aidlc-template");
const cliPath = path.join(rootDir, "src", "cli.js");

function shouldRetryCliResult(result) {
  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
  return /SyntaxError:/.test(combined) || result.error?.code === "ETIMEDOUT";
}

function runCli(args, label) {
  let result;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    result = spawnSync(process.execPath, [cliPath, ...args], {
      cwd: rootDir,
      encoding: "utf8",
      timeout: 15000
    });
    if (result.status === 0 || !shouldRetryCliResult(result)) {
      break;
    }
  }

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

    const liveVerifyArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-smoke");
    const liveVerifyResult = runCli([
      "live-verify",
      "--project",
      projectRoot,
      "--provider",
      "mock",
      "--artifact-dir",
      liveVerifyArtifactDir,
      "--include-middle-stages",
      "--include-signal-reopen",
      "--include-escalation-reopen",
      "--include-escalation-terminal",
      "--include-approval",
      "--archive"
    ], "live-verify");
    const liveVerifyBundle = JSON.parse(
      await fs.readFile(liveVerifyResult.liveVerifyBundlePath ?? liveVerifyResult.bundlePath, "utf8")
    );
    const liveVerifyReport = await fs.readFile(liveVerifyResult.reportPath, "utf8");
    const liveVerifyHistoryArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-history");
    const liveVerifyLogArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-log");
    const liveVerifyFirstHistoryArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-first-history");
    const liveVerifyFirstLogArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-first-log");
    const liveVerifyFirstLineageArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-first-lineage");
    const liveVerifyFirstDashboardArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-first-dashboard");
    const liveVerifySecondArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-second");
    const secondLiveVerifyResult = runCli([
      "live-verify",
      "--project",
      projectRoot,
      "--provider",
      "mock",
      "--artifact-dir",
      liveVerifySecondArtifactDir,
      "--fast-track",
      "--include-approval"
    ], "second live-verify");
    const verifyHistoryResult = runCli([
      "verify-history",
      "--input",
      liveVerifyArtifactDir,
      "--input",
      secondLiveVerifyResult.bundlePath,
      "--artifact-dir",
      liveVerifyHistoryArtifactDir
    ], "verify-history");
    const verifyHistoryBundle = JSON.parse(
      await fs.readFile(verifyHistoryResult.historyJsonPath, "utf8")
    );
    const verifyHistoryReport = await fs.readFile(verifyHistoryResult.historyReportPath, "utf8");
    const verifyFirstHistoryResult = runCli([
      "verify-history",
      "--input",
      liveVerifyArtifactDir,
      "--artifact-dir",
      liveVerifyFirstHistoryArtifactDir
    ], "verify-history first snapshot");
    const verifyLogFirstResult = runCli([
      "verify-log",
      "--input",
      liveVerifyArtifactDir,
      "--artifact-dir",
      liveVerifyLogArtifactDir
    ], "verify-log first append");
    const verifyFirstLogBundle = JSON.parse(
      await fs.readFile(verifyLogFirstResult.logJsonPath, "utf8")
    );
    const verifyLogSecondResult = runCli([
      "verify-log",
      "--input",
      liveVerifyArtifactDir,
      "--input",
      secondLiveVerifyResult.bundlePath,
      "--artifact-dir",
      liveVerifyLogArtifactDir
    ], "verify-log second append");
    const verifyLogBundle = JSON.parse(
      await fs.readFile(verifyLogSecondResult.logJsonPath, "utf8")
    );
    const verifyLogReport = await fs.readFile(verifyLogSecondResult.logReportPath, "utf8");
    const verifyIndexBundle = JSON.parse(
      await fs.readFile(verifyLogSecondResult.indexJsonPath, "utf8")
    );
    const verifyIndexReport = await fs.readFile(verifyLogSecondResult.indexReportPath, "utf8");
    const verifyFirstLineageResult = runCli([
      "verify-lineage",
      "--history-input",
      verifyFirstHistoryResult.historyJsonPath,
      "--log-input",
      verifyLogFirstResult.logJsonPath,
      "--index-input",
      verifyLogFirstResult.indexJsonPath,
      "--artifact-dir",
      liveVerifyFirstLineageArtifactDir
    ], "verify-lineage first snapshot");
    const liveVerifyLineageArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-lineage");
    const verifyLineageResult = runCli([
      "verify-lineage",
      "--history-input",
      verifyHistoryResult.historyJsonPath,
      "--log-input",
      verifyLogSecondResult.logJsonPath,
      "--index-input",
      verifyLogSecondResult.indexJsonPath,
      "--artifact-dir",
      liveVerifyLineageArtifactDir
    ], "verify-lineage");
    const verifyLineageBundle = JSON.parse(
      await fs.readFile(verifyLineageResult.lineageJsonPath, "utf8")
    );
    const verifyLineageReport = await fs.readFile(verifyLineageResult.lineageReportPath, "utf8");
    const verifyFirstDashboardResult = runCli([
      "verify-dashboard",
      "--history-input",
      verifyFirstHistoryResult.historyJsonPath,
      "--log-input",
      verifyLogFirstResult.logJsonPath,
      "--index-input",
      verifyLogFirstResult.indexJsonPath,
      "--lineage-input",
      verifyFirstLineageResult.lineageJsonPath,
      "--artifact-dir",
      liveVerifyFirstDashboardArtifactDir
    ], "verify-dashboard first snapshot");
    const liveVerifyDashboardArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-dashboard");
    const verifyDashboardResult = runCli([
      "verify-dashboard",
      "--history-input",
      verifyHistoryResult.historyJsonPath,
      "--log-input",
      verifyLogSecondResult.logJsonPath,
      "--index-input",
      verifyLogSecondResult.indexJsonPath,
      "--lineage-input",
      verifyLineageResult.lineageJsonPath,
      "--artifact-dir",
      liveVerifyDashboardArtifactDir
    ], "verify-dashboard");
    const verifyDashboardBundle = JSON.parse(
      await fs.readFile(verifyDashboardResult.dashboardJsonPath, "utf8")
    );
    const verifyDashboardReport = await fs.readFile(verifyDashboardResult.dashboardReportPath, "utf8");
    const liveVerifyDashboardLogArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-dashboard-log");
    const verifyDashboardLogFirstResult = runCli([
      "verify-dashboard-log",
      "--input",
      verifyFirstDashboardResult.dashboardJsonPath,
      "--artifact-dir",
      liveVerifyDashboardLogArtifactDir
    ], "verify-dashboard-log first append");
    const verifyDashboardLogSecondResult = runCli([
      "verify-dashboard-log",
      "--input",
      verifyFirstDashboardResult.dashboardJsonPath,
      "--input",
      verifyDashboardResult.dashboardJsonPath,
      "--artifact-dir",
      liveVerifyDashboardLogArtifactDir
    ], "verify-dashboard-log second append");
    const verifyDashboardLogBundle = JSON.parse(
      await fs.readFile(verifyDashboardLogSecondResult.logJsonPath, "utf8")
    );
    const verifyDashboardLogReport = await fs.readFile(verifyDashboardLogSecondResult.logReportPath, "utf8");
    const liveVerifyDashboardIndexArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-dashboard-index");
    const verifyDashboardIndexResult = runCli([
      "verify-dashboard-index",
      "--log-input",
      verifyDashboardLogSecondResult.logJsonPath,
      "--artifact-dir",
      liveVerifyDashboardIndexArtifactDir
    ], "verify-dashboard-index");
    const verifyDashboardIndexBundle = JSON.parse(
      await fs.readFile(verifyDashboardIndexResult.indexJsonPath, "utf8")
    );
    const verifyDashboardIndexReport = await fs.readFile(verifyDashboardIndexResult.indexReportPath, "utf8");
    const verifyArchiveResult = runCli([
      "verify-archive",
      "--project",
      projectRoot,
      "--input",
      liveVerifyArtifactDir,
      "--input",
      secondLiveVerifyResult.bundlePath
    ], "verify-archive");
    const verifyArchiveManifest = JSON.parse(
      await fs.readFile(verifyArchiveResult.manifestJsonPath, "utf8")
    );
    const verifyArchiveSummary = JSON.parse(
      await fs.readFile(verifyArchiveResult.summaryJsonPath, "utf8")
    );
    const verifyArchiveIndex = JSON.parse(
      await fs.readFile(verifyArchiveResult.archiveIndexJsonPath, "utf8")
    );
    const verifyArchiveLog = JSON.parse(
      await fs.readFile(verifyArchiveResult.archiveLogJsonPath, "utf8")
    );
    const verifyArchiveDashboardIndex = JSON.parse(
      await fs.readFile(verifyArchiveResult.dashboardIndexJsonPath, "utf8")
    );
    const verifyArchiveIndexSnapshotA = path.join(projectRoot, ".aof", "artifacts", "verification", "archive-index-snapshot-a.json");
    await fs.copyFile(verifyArchiveResult.archiveIndexJsonPath, verifyArchiveIndexSnapshotA);
    const oldestArchivedRunDir = verifyArchiveManifest.entries[0]?.archived_run_dir;
    const verifyArchivePruneResult = runCli([
      "verify-archive",
      "--project",
      projectRoot,
      "--input",
      secondLiveVerifyResult.bundlePath,
      "--max-runs",
      "1"
    ], "verify-archive prune");
    const verifyArchivePruneManifest = JSON.parse(
      await fs.readFile(verifyArchivePruneResult.manifestJsonPath, "utf8")
    );
    const verifyArchivePruneSummary = JSON.parse(
      await fs.readFile(verifyArchivePruneResult.summaryJsonPath, "utf8")
    );
    const verifyArchivePruneIndex = JSON.parse(
      await fs.readFile(verifyArchivePruneResult.archiveIndexJsonPath, "utf8")
    );
    const verifyArchiveIndexSnapshotB = path.join(projectRoot, ".aof", "artifacts", "verification", "archive-index-snapshot-b.json");
    await fs.copyFile(verifyArchivePruneResult.archiveIndexJsonPath, verifyArchiveIndexSnapshotB);
    const verifyArchiveLogResult = runCli([
      "verify-archive-log",
      "--input",
      verifyArchiveIndexSnapshotA,
      "--input",
      verifyArchiveIndexSnapshotB,
      "--artifact-dir",
      path.join(projectRoot, ".aof", "artifacts", "verification-archive-log")
    ], "verify-archive-log");
    const verifyArchiveLogAfterPrune = JSON.parse(
      await fs.readFile(verifyArchiveLogResult.logJsonPath, "utf8")
    );
    const verifyArchiveDashboardResult = runCli([
      "verify-archive-dashboard",
      "--index-input",
      verifyArchivePruneResult.archiveIndexJsonPath,
      "--log-input",
      verifyArchivePruneResult.archiveLogJsonPath,
      "--artifact-dir",
      path.join(projectRoot, ".aof", "artifacts", "verification-archive-dashboard")
    ], "verify-archive-dashboard");
    const verifyArchiveDashboard = JSON.parse(
      await fs.readFile(verifyArchiveDashboardResult.dashboardJsonPath, "utf8")
    );

    const deepPathRun = runCli([
      "run",
      "Smoke-test proposal and review stages",
      "--project",
      projectRoot
    ], "deep-path run");

    const deepPathAnswer = runCli([
      "answer",
      "--session",
      deepPathRun.sessionPath,
      "--response",
      "新規登録導線全体",
      "--response",
      "登録完了率を 6% 改善する",
      "--response",
      "認証基盤は変更しない"
    ], "deep-path answer");

    const proposalExecution = runCli([
      "council-exec",
      "--session",
      deepPathRun.sessionPath,
      "--stage",
      "proposal",
      "--include-optional",
      "--invoke-model",
      "--provider",
      "mock"
    ], "proposal council execution");

    const reviewExecution = runCli([
      "council-exec",
      "--session",
      deepPathRun.sessionPath,
      "--stage",
      "review",
      "--include-optional",
      "--invoke-model",
      "--provider",
      "mock"
    ], "review council execution");

    const fastTrackMiddleRun = runCli([
      "run",
      "Smoke-test fast-track proposal and review stages",
      "--project",
      projectRoot,
      "--fast-track"
    ], "fast-track middle-stage run");

    const fastTrackMiddleAnswer = runCli([
      "answer",
      "--session",
      fastTrackMiddleRun.sessionPath,
      "--response",
      "登録導線全体",
      "--response",
      "登録完了率を 3% 改善する",
      "--response",
      "認証基盤は変更しない"
    ], "fast-track middle-stage answer");

    const fastTrackProposalExecution = runCli([
      "council-exec",
      "--session",
      fastTrackMiddleRun.sessionPath,
      "--stage",
      "proposal",
      "--invoke-model",
      "--provider",
      "mock"
    ], "fast-track proposal council execution");

    const fastTrackReviewExecution = runCli([
      "council-exec",
      "--session",
      fastTrackMiddleRun.sessionPath,
      "--stage",
      "review",
      "--invoke-model",
      "--provider",
      "mock"
    ], "fast-track review council execution");

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

    const escalationResumeAnswer = runCli([
      "answer",
      "--session",
      escalationRun.sessionPath,
      "--response",
      "Guardian 指摘を踏まえて認証制約を維持したまま段階導入する"
    ], "escalation resume answer");

    const escalationResumeProposal = runCli([
      "council-exec",
      "--session",
      escalationRun.sessionPath,
      "--stage",
      "proposal",
      "--invoke-model",
      "--provider",
      "mock"
    ], "escalation resume proposal");

    const escalationResumeReview = runCli([
      "council-exec",
      "--session",
      escalationRun.sessionPath,
      "--stage",
      "review",
      "--invoke-model",
      "--provider",
      "mock"
    ], "escalation resume review");

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

    const signalResumeAnswer = runCli([
      "answer",
      "--session",
      signalRun.sessionPath,
      "--response",
      "認証制約の凍結を前提に onboarding を再設計する"
    ], "signal resume answer");

    const signalResumeProposal = runCli([
      "council-exec",
      "--session",
      signalRun.sessionPath,
      "--stage",
      "proposal",
      "--include-optional",
      "--invoke-model",
      "--provider",
      "mock"
    ], "signal resume proposal");

    const signalResumeReview = runCli([
      "council-exec",
      "--session",
      signalRun.sessionPath,
      "--stage",
      "review",
      "--include-optional",
      "--invoke-model",
      "--provider",
      "mock"
    ], "signal resume review");

    const contextOnlySignalPath = path.join(projectRoot, ".aof", "signals", "SIG-CONTEXT-ONLY.json");
    await fs.writeFile(contextOnlySignalPath, `${JSON.stringify({
      signal_id: "SIG-CONTEXT-ONLY",
      signal_class: "Constraint Change",
      signal_summary: "軽微な文言制約だけが変わった",
      affected_scope: "copy",
      impact_guess: "constraint note update",
      required_review_level: "context-only",
      source: "content team"
    }, null, 2)}\n`, "utf8");

    const contextOnlySignalRun = runCli([
      "run",
      "Smoke-test context-only external signal flow",
      "--project",
      projectRoot,
      "--fast-track"
    ], "context-only signal run");

    const contextOnlySignalAnswer = runCli([
      "answer",
      "--session",
      contextOnlySignalRun.sessionPath,
      "--response",
      "新規登録導線全体",
      "--response",
      "登録完了率を 4% 改善する",
      "--response",
      "認証制約は維持する"
    ], "context-only signal answer");

    const contextOnlySignalResult = runCli([
      "signal",
      "--session",
      contextOnlySignalRun.sessionPath,
      "--signal",
      contextOnlySignalPath
    ], "context-only signal update");

    if (answerResult.status !== "framed" || answerResult.currentStage !== "planning") {
      throw new Error("Smoke answer flow did not advance the session into planning.");
    }

    if (planningExecution.executionStatus !== "completed") {
      throw new Error("Planning council execution did not complete.");
    }

    if (liveVerifyResult.proposalExecution?.executionStatus !== "completed") {
      throw new Error("Live-verify proposal execution did not complete.");
    }

    if (liveVerifyResult.reviewExecution?.executionStatus !== "completed") {
      throw new Error("Live-verify review execution did not complete.");
    }

    if (liveVerifyResult.signalReopen?.status !== "reopened") {
      throw new Error("Live-verify signal reopen did not reopen the session.");
    }

    if (liveVerifyResult.signalResumeAnswer?.status !== "framed") {
      throw new Error("Live-verify signal resume answer did not return the session to planning.");
    }

    if (liveVerifyResult.signalResumeProposalExecution?.executionStatus !== "completed") {
      throw new Error("Live-verify signal resume proposal execution did not complete.");
    }

    if (liveVerifyResult.signalResumeReviewExecution?.executionStatus !== "completed") {
      throw new Error("Live-verify signal resume review execution did not complete.");
    }

    if (liveVerifyResult.escalationReopen?.status !== "reopened") {
      throw new Error("Live-verify escalation reopen did not reopen the session.");
    }

    if (liveVerifyResult.escalationResumeAnswer?.status !== "framed") {
      throw new Error("Live-verify escalation resume answer did not return the session to planning.");
    }

    if (liveVerifyResult.escalationResumeProposalExecution?.executionStatus !== "completed") {
      throw new Error("Live-verify escalation resume proposal execution did not complete.");
    }

    if (liveVerifyResult.escalationResumeReviewExecution?.executionStatus !== "completed") {
      throw new Error("Live-verify escalation resume review execution did not complete.");
    }

    if (liveVerifyResult.escalationApproveResolution?.status !== "closed") {
      throw new Error("Live-verify escalation approve resolution did not close the session.");
    }

    if (liveVerifyResult.escalationStopResolution?.status !== "stopped") {
      throw new Error("Live-verify escalation stop resolution did not stop the session.");
    }

    if (liveVerifyBundle.branch_outcomes?.happy_path?.approval_status !== "approved") {
      throw new Error("Live-verify bundle did not record the happy-path approval outcome.");
    }

    if (liveVerifyBundle.branch_outcomes?.signal_reopen?.resolution_status !== undefined) {
      throw new Error("Live-verify signal branch summary shape is invalid.");
    }

    if (liveVerifyBundle.branch_outcomes?.signal_reopen?.reopen_status !== "reopened") {
      throw new Error("Live-verify bundle did not record the signal reopen outcome.");
    }

    if (liveVerifyBundle.branch_outcomes?.escalation_reopen?.resolution_status !== "reopened") {
      throw new Error("Live-verify bundle did not record the escalation reopen outcome.");
    }

    if (liveVerifyBundle.branch_outcomes?.escalation_approve?.resolution_status !== "closed") {
      throw new Error("Live-verify bundle did not record the escalation approve outcome.");
    }

    if (liveVerifyBundle.branch_outcomes?.escalation_stop?.resolution_status !== "stopped") {
      throw new Error("Live-verify bundle did not record the escalation stop outcome.");
    }

    if (liveVerifyBundle.verification_context?.workflow?.workflow_id !== "aidlc") {
      throw new Error("Live-verify bundle did not record the workflow context.");
    }

    if (liveVerifyBundle.verification_context?.governance?.escalation_target !== "human-maintainer") {
      throw new Error("Live-verify bundle did not record the governance escalation target.");
    }

    if (liveVerifyBundle.branch_policies?.happy_path?.routing_mode !== "deep-path") {
      throw new Error("Live-verify bundle did not record the happy-path routing policy.");
    }

    if (liveVerifyBundle.branch_policies?.signal_reopen?.post_reopen_routing_mode !== "deep-path") {
      throw new Error("Live-verify bundle did not record the signal reopen routing policy.");
    }

    if (liveVerifyBundle.branch_policies?.escalation_stop?.resolution !== "stop") {
      throw new Error("Live-verify bundle did not record the escalation stop policy.");
    }

    if (!/^# Live Verification Report/m.test(liveVerifyReport)) {
      throw new Error("Live-verify report did not render the report heading.");
    }

    if (!/happy path approval: approved/.test(liveVerifyReport)) {
      throw new Error("Live-verify report did not summarize the happy-path approval outcome.");
    }

    if (!/signal reopen status: reopened/.test(liveVerifyReport)) {
      throw new Error("Live-verify report did not summarize the signal reopen outcome.");
    }

    if (!/escalation stop resolution: stopped/.test(liveVerifyReport)) {
      throw new Error("Live-verify report did not summarize the escalation stop outcome.");
    }

    if (verifyHistoryResult.entryCount !== 2) {
      throw new Error("Verify-history did not aggregate the expected number of verification bundles.");
    }

    if (!Array.isArray(verifyHistoryBundle.summary?.providers) || !verifyHistoryBundle.summary.providers.includes("mock")) {
      throw new Error("Verify-history did not summarize provider usage.");
    }

    if (verifyHistoryBundle.summary?.statuses?.completed !== 2) {
      throw new Error("Verify-history did not summarize completed bundle count.");
    }

    if (
      verifyHistoryBundle.summary?.recommendation?.first_action !== "investigate-drift" ||
      verifyHistoryBundle.summary?.recommendation?.latest_action !== "continue-monitoring" ||
      verifyHistoryBundle.summary?.recommendation?.latest_transition !== "de-escalated"
    ) {
      throw new Error("Verify-history did not summarize recommendation transitions.");
    }

    if (verifyHistoryBundle.summary?.drift?.has_drift !== true) {
      throw new Error("Verify-history did not mark drift across runs.");
    }

    if (!Array.isArray(verifyHistoryBundle.summary?.drift?.fields_with_drift) || !verifyHistoryBundle.summary.drift.fields_with_drift.includes("routing_mode")) {
      throw new Error("Verify-history did not surface routing drift.");
    }

    if (
      !verifyHistoryBundle.summary.drift.fields_with_drift.includes("verification_recommendation_action") ||
      !Array.isArray(verifyHistoryBundle.summary?.latest_comparison?.changed_fields) ||
      !verifyHistoryBundle.summary.latest_comparison.changed_fields.includes("verification_recommendation_action")
    ) {
      throw new Error("Verify-history did not surface recommendation drift.");
    }

    if (!Array.isArray(verifyHistoryBundle.summary?.latest_comparison?.changed_fields) || !verifyHistoryBundle.summary.latest_comparison.changed_fields.includes("routing_mode")) {
      throw new Error("Verify-history did not surface latest-comparison routing changes.");
    }

    if (!/^# Verification History Report/m.test(verifyHistoryReport)) {
      throw new Error("Verify-history report did not render the report heading.");
    }

    if (!/routing mode: fast-track/.test(verifyHistoryReport)) {
      throw new Error("Verify-history report did not include the fast-track entry summary.");
    }

    if (!/fields with drift: routing_mode, verification_recommendation_action, verification_recommendation_urgency, signal_reopen_status/.test(verifyHistoryReport)) {
      throw new Error("Verify-history report did not summarize drift fields.");
    }

    if (!/routing_mode: from=deep-path, to=fast-track, changed=true/.test(verifyHistoryReport)) {
      throw new Error("Verify-history report did not summarize latest-comparison routing changes.");
    }

    if (!/verification_recommendation_action: from=investigate-drift, to=continue-monitoring, changed=true/.test(verifyHistoryReport)) {
      throw new Error("Verify-history report did not summarize recommendation changes.");
    }

    if (!/## Recommendation Summary/.test(verifyHistoryReport) || !/latest transition: de-escalated/.test(verifyHistoryReport)) {
      throw new Error("Verify-history report did not summarize recommendation transitions.");
    }

    if (
      verifyLineageBundle.summary?.current_action !== "investigate-drift" ||
      verifyLineageBundle.summary?.current_transition !== "escalated" ||
      verifyLineageBundle.summary?.history_transition !== "de-escalated"
    ) {
      throw new Error("Verify-lineage did not summarize the expected current and historical recommendation state.");
    }

    if (!Array.isArray(verifyLineageBundle.summary?.distinct_actions) || !verifyLineageBundle.summary.distinct_actions.includes("continue-monitoring")) {
      throw new Error("Verify-lineage did not expose distinct recommendation actions.");
    }

    if (
      verifyLineageBundle.health_status !== "warning" ||
      !Array.isArray(verifyLineageBundle.alerts) ||
      !verifyLineageBundle.alerts.some((alert) => alert.code === "history-index-action-divergence")
    ) {
      throw new Error("Verify-lineage did not expose the expected lineage alerts.");
    }

    if (verifyLineageBundle.operator_recommendation?.action !== "investigate-lineage-drift" || verifyLineageBundle.operator_recommendation?.urgency !== "warning") {
      throw new Error("Verify-lineage did not derive the expected operator recommendation.");
    }

    if (
      verifyLineageBundle.trend_summary?.health_direction !== "worsened" ||
      verifyLineageBundle.trend_summary?.recommendation_direction !== "worsened" ||
      verifyLineageBundle.trend_summary?.alert_direction !== "increased"
    ) {
      throw new Error("Verify-lineage did not summarize the expected lineage trend direction.");
    }

    if (
      verifyLineageBundle.threshold_status !== "breached" ||
      !Array.isArray(verifyLineageBundle.threshold_breaches) ||
      !verifyLineageBundle.threshold_breaches.some((breach) => breach.code === "warning-alert-threshold-exceeded") ||
      !verifyLineageBundle.threshold_breaches.some((breach) => breach.code === "recommendation-worsened-not-allowed")
    ) {
      throw new Error("Verify-lineage did not expose the expected threshold summary.");
    }

    if (
      verifyLineageBundle.monitoring_policy?.thresholds?.max_warning_alerts !== 0 ||
      verifyLineageBundle.monitoring_policy?.thresholds?.allow_recommendation_worsened !== false
    ) {
      throw new Error("Verify-lineage did not expose the expected monitoring policy.");
    }

    if (!/^# Verification Recommendation Lineage Report/m.test(verifyLineageReport) || !/history transition: de-escalated/.test(verifyLineageReport)) {
      throw new Error("Verify-lineage report did not summarize recommendation lineage.");
    }

    if (!/health status: warning/.test(verifyLineageReport) || !/\[warning\] history-index-action-divergence:/.test(verifyLineageReport) || !/action: investigate-lineage-drift/.test(verifyLineageReport) || !/recommendation direction: worsened/.test(verifyLineageReport) || !/## Threshold Breaches/.test(verifyLineageReport)) {
      throw new Error("Verify-lineage report did not summarize lineage alerts.");
    }

    if (
      verifyDashboardBundle.overall_health_status !== "warning" ||
      verifyDashboardBundle.overall_threshold_status !== "breached" ||
      verifyDashboardBundle.overall_operator_recommendation?.action !== "investigate-lineage-drift"
    ) {
      throw new Error("Verify-dashboard did not summarize the expected overall operator state.");
    }

    if (
      verifyDashboardBundle.current_state?.history?.latest_action !== "continue-monitoring" ||
      verifyDashboardBundle.current_state?.lineage?.recommendation_direction !== "worsened"
    ) {
      throw new Error("Verify-dashboard did not expose the expected current-state snapshots.");
    }

    if (
      !Array.isArray(verifyDashboardBundle.alerts) ||
      !verifyDashboardBundle.alerts.some((alert) => alert.source === "index" && alert.code === "verification-drift-detected") ||
      !verifyDashboardBundle.alerts.some((alert) => alert.source === "lineage" && alert.code === "history-index-action-divergence")
    ) {
      throw new Error("Verify-dashboard did not expose the expected aggregated alerts.");
    }

    if (
      !Array.isArray(verifyDashboardBundle.threshold_breaches) ||
      !verifyDashboardBundle.threshold_breaches.some((breach) => breach.source === "index" && breach.code === "warning-alert-threshold-exceeded") ||
      !verifyDashboardBundle.threshold_breaches.some((breach) => breach.source === "lineage" && breach.code === "recommendation-worsened-not-allowed")
    ) {
      throw new Error("Verify-dashboard did not expose the expected aggregated threshold breaches.");
    }

    if (
      !/^# Verification Dashboard Report/m.test(verifyDashboardReport) ||
      !/overall recommendation action: investigate-lineage-drift/.test(verifyDashboardReport) ||
      !/## Threshold Breaches/.test(verifyDashboardReport)
    ) {
      throw new Error("Verify-dashboard report did not summarize the expected dashboard state.");
    }

    if (verifyDashboardLogFirstResult.entryCount !== 1 || verifyDashboardLogSecondResult.entryCount !== 2) {
      throw new Error("Verify-dashboard-log did not append and deduplicate entries as expected.");
    }

    if (
      verifyDashboardLogBundle.entry_count !== 2 ||
      verifyDashboardLogBundle.summary?.health?.latest_status !== "warning" ||
      verifyDashboardLogBundle.summary?.threshold?.latest_status !== "breached" ||
      verifyDashboardLogBundle.summary?.recommendation?.latest_action !== "investigate-lineage-drift" ||
      verifyDashboardLogBundle.summary?.recommendation?.previous_action !== "investigate-lineage-drift" ||
      verifyDashboardLogBundle.summary?.recommendation?.latest_transition !== "stable"
    ) {
      throw new Error("Verify-dashboard-log did not summarize the expected accumulated dashboard state.");
    }

    if (
      !/^# Verification Dashboard Log Report/m.test(verifyDashboardLogReport) ||
      !/latest action: investigate-lineage-drift/.test(verifyDashboardLogReport) ||
      !/previous action: investigate-lineage-drift/.test(verifyDashboardLogReport) ||
      !/latest transition: stable/.test(verifyDashboardLogReport)
    ) {
      throw new Error("Verify-dashboard-log report did not summarize the expected dashboard transitions.");
    }

    if (
      verifyDashboardIndexBundle.health_status !== "warning" ||
      verifyDashboardIndexBundle.threshold_status !== "breached" ||
      verifyDashboardIndexBundle.operator_recommendation?.action !== "human-review-recommended" ||
      verifyDashboardIndexBundle.recommendation_summary?.latest_action !== "investigate-lineage-drift" ||
      verifyDashboardIndexBundle.recommendation_summary?.latest_transition !== "stable"
    ) {
      throw new Error("Verify-dashboard-index did not summarize the expected current dashboard operator state.");
    }

    if (
      verifyDashboardIndexBundle.monitoring_policy?.thresholds?.require_latest_health_healthy !== true ||
      verifyDashboardIndexBundle.monitoring_policy?.thresholds?.require_latest_threshold_within !== true
    ) {
      throw new Error("Verify-dashboard-index did not expose the expected monitoring policy thresholds.");
    }

    if (
      !Array.isArray(verifyDashboardIndexBundle.alerts) ||
      !verifyDashboardIndexBundle.alerts.some((alert) => alert.code === "latest-dashboard-threshold-breached") ||
      !verifyDashboardIndexBundle.alerts.some((alert) => alert.code === "latest-dashboard-health-not-healthy")
    ) {
      throw new Error("Verify-dashboard-index did not expose the expected dashboard alerts.");
    }

    if (
      !Array.isArray(verifyDashboardIndexBundle.threshold_breaches) ||
      !verifyDashboardIndexBundle.threshold_breaches.some((breach) => breach.code === "latest-dashboard-health-required-healthy") ||
      !verifyDashboardIndexBundle.threshold_breaches.some((breach) => breach.code === "latest-dashboard-threshold-required-within")
    ) {
      throw new Error("Verify-dashboard-index did not expose the expected threshold breaches.");
    }

    if (
      !/^# Verification Dashboard Index Report/m.test(verifyDashboardIndexReport) ||
      !/action: human-review-recommended/.test(verifyDashboardIndexReport) ||
      !/## Monitoring Policy/.test(verifyDashboardIndexReport) ||
      !/## Threshold Breaches/.test(verifyDashboardIndexReport)
    ) {
      throw new Error("Verify-dashboard-index report did not summarize the expected dashboard index state.");
    }

    if (
      !liveVerifyResult.archiveResult ||
      liveVerifyResult.archiveResult.importedCount !== 1 ||
      liveVerifyResult.archiveResult.skippedCount !== 0 ||
      liveVerifyResult.archiveResult.dashboardIndexRecommendedAction !== "human-review-recommended"
    ) {
      throw new Error("Live-verify did not archive its own verification result as expected.");
    }

    if (verifyArchiveResult.importedCount !== 1 || verifyArchiveResult.skippedCount !== 1) {
      throw new Error("Verify-archive did not import the expected verification runs.");
    }

    if (verifyArchiveResult.overallRecommendedAction !== "investigate-lineage-drift") {
      throw new Error("Verify-archive did not expose the expected dashboard recommendation.");
    }

    if (verifyArchiveResult.dashboardIndexRecommendedAction !== "human-review-recommended") {
      throw new Error("Verify-archive did not expose the expected dashboard-index recommendation.");
    }

    if (verifyArchiveManifest.artifact_type !== "verification-archive-manifest" || verifyArchiveManifest.run_count !== 2) {
      throw new Error("Verify-archive manifest did not summarize the expected run count.");
    }

    if (!Array.isArray(verifyArchiveManifest.entries) || verifyArchiveManifest.entries.length !== 2) {
      throw new Error("Verify-archive manifest did not persist the expected entries.");
    }

    if (!verifyArchiveManifest.entries.every((entry) => /[\\/]verification[\\/]runs[\\/]/.test(entry.archived_run_dir))) {
      throw new Error("Verify-archive manifest did not archive runs under the canonical verification root.");
    }

    if (
      verifyArchiveSummary.artifact_type !== "verification-archive-summary" ||
      verifyArchiveSummary.imported_count !== 1 ||
      verifyArchiveSummary.skipped_count !== 1
    ) {
      throw new Error("Verify-archive summary did not summarize the expected import result.");
    }

    if (verifyArchiveSummary.derived_artifacts?.history?.json_path !== verifyArchiveResult.historyJsonPath) {
      throw new Error("Verify-archive summary did not record the derived history artifact path.");
    }

    if (
      verifyArchiveIndex.artifact_type !== "verification-archive-index" ||
      verifyArchiveIndex.retained_count !== 2 ||
      verifyArchiveIndex.pruned_count !== 0 ||
      verifyArchiveIndex.health_status !== "critical" ||
      verifyArchiveIndex.threshold_status !== "breached" ||
      verifyArchiveIndex.operator_recommendation?.action !== "human-review-recommended" ||
      verifyArchiveIndex.overall_operator_recommendation !== "investigate-lineage-drift" ||
      verifyArchiveIndex.dashboard_index_recommendation !== "human-review-recommended"
    ) {
      throw new Error("Verify-archive index did not summarize the expected current archive state.");
    }

    if (
      verifyArchiveLog.artifact_type !== "verification-archive-log" ||
      verifyArchiveLog.entry_count < 1 ||
      verifyArchiveLog.summary?.recommendation?.latest_action !== "human-review-recommended" ||
      verifyArchiveLog.summary?.retention?.latest_retention_reached !== false
    ) {
      throw new Error("Verify-archive did not refresh the expected archive-log state.");
    }

    if (
      verifyArchivePruneResult.importedCount !== 0 ||
      verifyArchivePruneResult.skippedCount !== 1 ||
      verifyArchivePruneResult.retainedCount !== 1 ||
      verifyArchivePruneResult.prunedCount !== 1
    ) {
      throw new Error("Verify-archive prune run did not expose the expected retention result.");
    }

    if (
      verifyArchivePruneManifest.run_count !== 1 ||
      verifyArchivePruneManifest.retention_policy?.max_runs !== 1 ||
      verifyArchivePruneManifest.pruned_count !== 1
    ) {
      throw new Error("Verify-archive prune manifest did not summarize the expected retention state.");
    }

    if (
      verifyArchivePruneSummary.retained_count !== 1 ||
      verifyArchivePruneSummary.pruned_count !== 1 ||
      verifyArchivePruneSummary.retention_policy?.max_runs !== 1
    ) {
      throw new Error("Verify-archive prune summary did not summarize the expected retention state.");
    }

    if (
      verifyArchivePruneIndex.retained_count !== 1 ||
      verifyArchivePruneIndex.pruned_count !== 1 ||
      verifyArchivePruneIndex.retention_reached !== true ||
      verifyArchivePruneIndex.health_status !== "critical" ||
      verifyArchivePruneIndex.threshold_status !== "breached"
    ) {
      throw new Error("Verify-archive prune index did not summarize the expected retention state.");
    }

    if (
      verifyArchiveLogResult.entryCount !== 2 ||
      verifyArchiveLogAfterPrune.summary?.recommendation?.latest_action !== "human-review-recommended" ||
      verifyArchiveLogAfterPrune.summary?.recommendation?.latest_transition !== "stable" ||
      verifyArchiveLogAfterPrune.summary?.retention?.latest_retention_reached !== true ||
      verifyArchiveLogAfterPrune.summary?.retention?.previous_retention_reached !== false ||
      verifyArchiveLogAfterPrune.summary?.retention?.latest_transition !== "reached"
    ) {
      throw new Error("Verify-archive-log did not summarize the expected retention transition.");
    }

    if (
      verifyArchiveDashboard.artifact_type !== "verification-archive-dashboard" ||
      verifyArchiveDashboard.overall_health_status !== "critical" ||
      verifyArchiveDashboard.overall_threshold_status !== "breached" ||
      verifyArchiveDashboard.overall_operator_recommendation?.action !== "human-review-recommended" ||
      verifyArchiveDashboard.current_state?.log?.retention_transition !== "reached" ||
      verifyArchiveDashboard.trend_summary?.recommendation_transition !== "stable"
    ) {
      throw new Error("Verify-archive-dashboard did not summarize the expected archive operator state.");
    }

    if (oldestArchivedRunDir) {
      try {
        await fs.access(oldestArchivedRunDir);
        throw new Error("Verify-archive prune did not remove the oldest archived run directory.");
      } catch (error) {
        if (error && error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    if (
      verifyArchiveDashboardIndex.artifact_type !== "verification-dashboard-index" ||
      verifyArchiveDashboardIndex.health_status !== "warning" ||
      verifyArchiveDashboardIndex.threshold_status !== "breached" ||
      verifyArchiveDashboardIndex.operator_recommendation?.action !== "human-review-recommended"
    ) {
      throw new Error("Verify-archive did not refresh the expected dashboard-index state.");
    }

    if (verifyLogFirstResult.entryCount !== 1 || verifyLogSecondResult.entryCount !== 2) {
      throw new Error("Verify-log did not append and deduplicate entries as expected.");
    }

    if (verifyLogBundle.entry_count !== 2 || verifyLogBundle.entries.length !== 2) {
      throw new Error("Verify-log did not persist the expected number of entries.");
    }

    if (verifyLogBundle.threshold_trend?.latest_trend !== "worsened" || verifyLogBundle.threshold_trend?.consecutive_breached_run_count !== 1) {
      throw new Error("Verify-log did not summarize the expected threshold trend.");
    }

    if (verifyLogBundle.operator_recommendation?.action !== "investigate-drift" || verifyLogBundle.operator_recommendation?.urgency !== "warning") {
      throw new Error("Verify-log did not summarize the expected operator recommendation.");
    }

    if (verifyLogBundle.recommendation_trend?.latest_transition !== "escalated" || verifyLogBundle.recommendation_trend?.latest_action !== "investigate-drift") {
      throw new Error("Verify-log did not summarize the expected recommendation trend.");
    }

    if (
      verifyIndexBundle.recommendation_summary?.latest_transition !== "escalated" ||
      verifyIndexBundle.recommendation_summary?.previous_action !== "continue-monitoring"
    ) {
      throw new Error("Verify-index did not summarize the expected recommendation transition context.");
    }

    if (!/^# Verification Log Report/m.test(verifyLogReport)) {
      throw new Error("Verify-log report did not render the report heading.");
    }

    if (!/routing_mode: from=deep-path, to=fast-track, changed=true/.test(verifyLogReport)) {
      throw new Error("Verify-log report did not summarize latest routing changes.");
    }

    if (!/## Operator Recommendation/.test(verifyLogReport) || !/action: investigate-drift/.test(verifyLogReport)) {
      throw new Error("Verify-log report did not summarize the operator recommendation.");
    }

    if (!/## Recommendation Trend/.test(verifyLogReport) || !/latest transition: escalated/.test(verifyLogReport)) {
      throw new Error("Verify-log report did not summarize the recommendation trend.");
    }

    if (!/## Recommendation Summary/.test(verifyIndexReport) || !/previous action: continue-monitoring/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not summarize the recommendation transition context.");
    }

    if (!/## Threshold Trend/.test(verifyLogReport) || !/latest trend: worsened/.test(verifyLogReport)) {
      throw new Error("Verify-log report did not summarize the threshold trend.");
    }

    if (verifyIndexBundle.entry_count !== 2 || verifyIndexBundle.latest_entry?.routing_mode !== "fast-track") {
      throw new Error("Verify-index did not summarize the latest accumulated state.");
    }

    if (verifyIndexBundle.health_status !== "warning") {
      throw new Error("Verify-index did not derive the expected warning health status.");
    }

    if (verifyIndexBundle.threshold_status !== "breached") {
      throw new Error("Verify-index did not derive the expected threshold status.");
    }

    if (verifyIndexBundle.operator_recommendation?.action !== "investigate-drift" || verifyIndexBundle.operator_recommendation?.urgency !== "warning") {
      throw new Error("Verify-index did not derive the expected operator recommendation.");
    }

    if (!Array.isArray(verifyIndexBundle.summary?.latest_changed_fields) || !verifyIndexBundle.summary.latest_changed_fields.includes("routing_mode")) {
      throw new Error("Verify-index did not expose latest changed fields.");
    }

    if (verifyIndexBundle.summary?.alert_count !== 2) {
      throw new Error("Verify-index did not expose the expected alert count.");
    }

    if (verifyIndexBundle.summary?.alert_severity_counts?.warning !== 2) {
      throw new Error("Verify-index did not expose the expected warning alert count.");
    }

    if (verifyIndexBundle.summary?.threshold_breach_count !== 1 || verifyIndexBundle.summary?.threshold_breach_severity_counts?.warning !== 1) {
      throw new Error("Verify-index did not expose the expected threshold breach summary.");
    }

    if (!Array.isArray(verifyIndexBundle.monitoring_policy?.field_severity?.warning) || !verifyIndexBundle.monitoring_policy.field_severity.warning.includes("routing_mode")) {
      throw new Error("Verify-index did not expose the expected monitoring policy.");
    }

    if (verifyIndexBundle.monitoring_policy?.thresholds?.max_warning_alerts !== 1) {
      throw new Error("Verify-index did not expose the expected threshold policy.");
    }

    if (!Array.isArray(verifyIndexBundle.alerts) || !verifyIndexBundle.alerts.some((alert) => alert.code === "verification-drift-detected")) {
      throw new Error("Verify-index did not expose the expected drift alert.");
    }

    if (!Array.isArray(verifyIndexBundle.threshold_breaches) || !verifyIndexBundle.threshold_breaches.some((breach) => breach.code === "warning-alert-threshold-exceeded")) {
      throw new Error("Verify-index did not expose the expected threshold breach.");
    }

    if (!/^# Verification Index Report/m.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not render the report heading.");
    }

    if (!/health status: warning/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not summarize the health status.");
    }

    if (!/threshold status: breached/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not summarize the threshold status.");
    }

    if (!/action: investigate-drift/.test(verifyIndexReport) || !/urgency: warning/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not summarize the operator recommendation.");
    }

    if (!/alert severity counts: critical=0, warning=2, info=0/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not summarize severity counts.");
    }

    if (!/threshold breach severity counts: critical=0, warning=1, info=0/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not summarize threshold breach severity counts.");
    }

    if (!/warning fields: routing_mode, verification_recommendation_action, verification_recommendation_urgency, signal_reopen_status, escalation_reopen_status, escalation_approve_status, escalation_stop_status/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not render the monitoring policy.");
    }

    if (!/max warning alerts: 1/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not render the threshold policy.");
    }

    if (!/\[warning\] verification-drift-detected:/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not render the drift alert.");
    }

    if (!/\[warning\] latest-comparison-changes-detected:/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not render the latest-comparison alert with the expected severity.");
    }

    if (!/\[warning\] warning-alert-threshold-exceeded:/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not render the threshold breach.");
    }

    if (!/routing mode: fast-track/.test(verifyIndexReport)) {
      throw new Error("Verify-index report did not summarize the latest routing mode.");
    }

    if (approvalExecution.executionStatus !== "completed" || !approvalExecution.execution?.approval_outcome) {
      throw new Error("Approval council execution did not return an approval outcome.");
    }

    if (deepPathAnswer.status !== "framed" || deepPathAnswer.currentStage !== "planning") {
      throw new Error("Deep-path answer flow did not advance the session into planning.");
    }

    if (proposalExecution.executionStatus !== "completed" || proposalExecution.execution?.steps?.length < 2) {
      throw new Error("Proposal council execution did not complete with multi-seat coverage.");
    }

    if (reviewExecution.executionStatus !== "completed" || reviewExecution.execution?.steps?.length < 2) {
      throw new Error("Review council execution did not complete with multi-seat coverage.");
    }

    if (fastTrackMiddleAnswer.status !== "framed" || fastTrackMiddleAnswer.currentStage !== "planning") {
      throw new Error("Fast-track middle-stage answer flow did not advance the session into planning.");
    }

    if (fastTrackProposalExecution.executionStatus !== "completed" || fastTrackProposalExecution.execution?.steps?.length !== 1) {
      throw new Error("Fast-track proposal execution did not stay single-seat.");
    }

    if (fastTrackReviewExecution.executionStatus !== "completed" || fastTrackReviewExecution.execution?.steps?.length !== 1) {
      throw new Error("Fast-track review execution did not stay single-seat.");
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

    if (escalationResumeAnswer.status !== "framed" || escalationResumeAnswer.currentStage !== "planning") {
      throw new Error("Escalation resume answer did not return the session to planning.");
    }

    if (escalationResumeProposal.executionStatus !== "completed" || escalationResumeProposal.execution?.steps?.length !== 1) {
      throw new Error("Escalation resume proposal execution did not complete with fast-track coverage.");
    }

    if (escalationResumeReview.executionStatus !== "completed" || escalationResumeReview.execution?.steps?.length !== 1) {
      throw new Error("Escalation resume review execution did not complete with fast-track coverage.");
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

    if (signalResumeAnswer.status !== "framed" || signalResumeAnswer.currentStage !== "planning") {
      throw new Error("Signal resume answer did not return the session to planning.");
    }

    if (signalResumeProposal.executionStatus !== "completed" || signalResumeProposal.execution?.steps?.length < 2) {
      throw new Error("Signal resume proposal execution did not complete with deep-path coverage.");
    }

    if (signalResumeReview.executionStatus !== "completed" || signalResumeReview.execution?.steps?.length < 2) {
      throw new Error("Signal resume review execution did not complete with deep-path coverage.");
    }

    if (contextOnlySignalAnswer.status !== "framed" || contextOnlySignalAnswer.currentStage !== "planning") {
      throw new Error("Context-only signal answer flow did not advance the session into planning.");
    }

    if (contextOnlySignalResult.status !== "framed" || contextOnlySignalResult.currentStage !== "planning") {
      throw new Error("Context-only signal flow should keep the session in planning instead of reopening.");
    }

    if (contextOnlySignalResult.routingMode !== "fast-track" || contextOnlySignalResult.signalDisposition !== "context-updated") {
      throw new Error("Context-only signal flow did not preserve routing or expose the expected disposition.");
    }

    if ((contextOnlySignalResult.pendingQuestions ?? []).length !== 0 || contextOnlySignalResult.reopenContext !== null) {
      throw new Error("Context-only signal flow should not generate reopen clarification questions.");
    }

    console.log(JSON.stringify({
      ok: true,
      sessionId: runResult.sessionId,
      routingMode: runResult.routingMode,
      liveVerifyStatus: liveVerifyResult.status,
      liveVerifyBundlePath: liveVerifyResult.bundlePath,
      liveVerifyReportPath: liveVerifyResult.reportPath,
      liveVerifyArchiveImportedCount: liveVerifyResult.archiveResult?.importedCount ?? 0,
      liveVerifyArchiveRecommendedAction: liveVerifyResult.archiveResult?.overallRecommendedAction ?? null,
      verifyHistoryJsonPath: verifyHistoryResult.historyJsonPath,
      verifyHistoryReportPath: verifyHistoryResult.historyReportPath,
      verifyLogJsonPath: verifyLogSecondResult.logJsonPath,
      verifyLogReportPath: verifyLogSecondResult.logReportPath,
      verifyIndexJsonPath: verifyLogSecondResult.indexJsonPath,
      verifyIndexReportPath: verifyLogSecondResult.indexReportPath,
      liveVerifyProposalExecutionId: liveVerifyResult.proposalExecution?.executionId ?? null,
      liveVerifyReviewExecutionId: liveVerifyResult.reviewExecution?.executionId ?? null,
      liveVerifySignalResumeProposalExecutionId: liveVerifyResult.signalResumeProposalExecution?.executionId ?? null,
      liveVerifySignalResumeReviewExecutionId: liveVerifyResult.signalResumeReviewExecution?.executionId ?? null,
      liveVerifyEscalationResumeProposalExecutionId: liveVerifyResult.escalationResumeProposalExecution?.executionId ?? null,
      liveVerifyEscalationResumeReviewExecutionId: liveVerifyResult.escalationResumeReviewExecution?.executionId ?? null,
      liveVerifyEscalationApproveApprovalExecutionId: liveVerifyResult.escalationApproveApprovalExecution?.executionId ?? null,
      liveVerifyEscalationStopApprovalExecutionId: liveVerifyResult.escalationStopApprovalExecution?.executionId ?? null,
      liveVerifyApprovalStatus: liveVerifyResult.approvalExecution?.execution?.approval_outcome?.status ?? null,
      liveVerifyEscalationApproveResolution: liveVerifyResult.escalationApproveResolution?.status ?? null,
      liveVerifyEscalationStopResolution: liveVerifyResult.escalationStopResolution?.status ?? null,
      liveVerifyHappyPathBundleApprovalStatus: liveVerifyBundle.branch_outcomes?.happy_path?.approval_status ?? null,
      liveVerifyWorkflowId: liveVerifyBundle.verification_context?.workflow?.workflow_id ?? null,
      liveVerifyHappyPathRoutingPolicy: liveVerifyBundle.branch_policies?.happy_path?.routing_mode ?? null,
      verifyHistoryEntryCount: verifyHistoryBundle.entry_count,
      verifyHistoryDriftFields: verifyHistoryBundle.summary?.drift?.fields_with_drift ?? [],
      verifyHistoryChangedFields: verifyHistoryBundle.summary?.latest_comparison?.changed_fields ?? [],
      verifyHistoryRecommendationTransition: verifyHistoryBundle.summary?.recommendation?.latest_transition ?? null,
      verifyLineageCurrentAction: verifyLineageBundle.summary?.current_action ?? null,
      verifyLineageHistoryTransition: verifyLineageBundle.summary?.history_transition ?? null,
      verifyLineageHealthStatus: verifyLineageBundle.health_status ?? null,
      verifyLineageThresholdStatus: verifyLineageBundle.threshold_status ?? null,
      verifyLineageRecommendedAction: verifyLineageBundle.operator_recommendation?.action ?? null,
      verifyLineageRecommendationDirection: verifyLineageBundle.trend_summary?.recommendation_direction ?? null,
      verifyDashboardHealthStatus: verifyDashboardBundle.overall_health_status ?? null,
      verifyDashboardThresholdStatus: verifyDashboardBundle.overall_threshold_status ?? null,
      verifyDashboardRecommendedAction: verifyDashboardBundle.overall_operator_recommendation?.action ?? null,
      verifyDashboardLogEntryCount: verifyDashboardLogBundle.entry_count ?? 0,
      verifyDashboardLogRecommendedAction: verifyDashboardLogBundle.summary?.recommendation?.latest_action ?? null,
      verifyDashboardLogRecommendationTransition: verifyDashboardLogBundle.summary?.recommendation?.latest_transition ?? null,
      verifyDashboardIndexHealthStatus: verifyDashboardIndexBundle.health_status ?? null,
      verifyDashboardIndexThresholdStatus: verifyDashboardIndexBundle.threshold_status ?? null,
      verifyDashboardIndexRecommendedAction: verifyDashboardIndexBundle.operator_recommendation?.action ?? null,
      verifyArchiveImportedCount: verifyArchiveResult.importedCount ?? 0,
      verifyArchiveSkippedCount: verifyArchiveResult.skippedCount ?? 0,
      verifyArchiveRunCount: verifyArchiveManifest.run_count ?? 0,
      verifyArchiveRecommendedAction: verifyArchiveResult.overallRecommendedAction ?? null,
      verifyArchiveDashboardIndexRecommendedAction: verifyArchiveResult.dashboardIndexRecommendedAction ?? null,
      verifyArchiveIndexRetainedCount: verifyArchiveIndex.retained_count ?? null,
      verifyArchiveIndexHealthStatus: verifyArchiveIndex.health_status ?? null,
      verifyArchiveIndexThresholdStatus: verifyArchiveIndex.threshold_status ?? null,
      verifyArchiveIndexRecommendedAction: verifyArchiveIndex.operator_recommendation?.action ?? null,
      verifyArchiveLogEntryCount: verifyArchiveLogAfterPrune.entry_count ?? 0,
      verifyArchiveLogRecommendedAction: verifyArchiveLogAfterPrune.summary?.recommendation?.latest_action ?? null,
      verifyArchiveLogRecommendationTransition: verifyArchiveLogAfterPrune.summary?.recommendation?.latest_transition ?? null,
      verifyArchiveLogRetentionTransition: verifyArchiveLogAfterPrune.summary?.retention?.latest_transition ?? null,
      verifyArchiveDashboardHealthStatus: verifyArchiveDashboard.overall_health_status ?? null,
      verifyArchiveDashboardThresholdStatus: verifyArchiveDashboard.overall_threshold_status ?? null,
      verifyArchiveDashboardRecommendedAction: verifyArchiveDashboard.overall_operator_recommendation?.action ?? null,
      verifyArchivePrunedCount: verifyArchivePruneResult.prunedCount ?? 0,
      verifyLogEntryCount: verifyLogBundle.entry_count,
      verifyLogLatestTrend: verifyLogBundle.threshold_trend?.latest_trend ?? null,
      verifyLogRecommendedAction: verifyLogBundle.operator_recommendation?.action ?? null,
      verifyLogRecommendationTransition: verifyLogBundle.recommendation_trend?.latest_transition ?? null,
      verifyIndexHealthStatus: verifyIndexBundle.health_status ?? null,
      verifyIndexThresholdStatus: verifyIndexBundle.threshold_status ?? null,
      verifyIndexRecommendedAction: verifyIndexBundle.operator_recommendation?.action ?? null,
      verifyIndexRecommendationTransition: verifyIndexBundle.recommendation_summary?.latest_transition ?? null,
      verifyIndexAlertCount: verifyIndexBundle.summary?.alert_count ?? 0,
      verifyIndexWarningAlertCount: verifyIndexBundle.summary?.alert_severity_counts?.warning ?? 0,
      verifyIndexThresholdBreachCount: verifyIndexBundle.summary?.threshold_breach_count ?? 0,
      verifyIndexLatestChangedFields: verifyIndexBundle.summary?.latest_changed_fields ?? [],
      planningExecutionId: planningExecution.executionId,
      approvalStatus: approvalExecution.execution.approval_outcome.status,
      proposalExecutionId: proposalExecution.executionId,
      reviewExecutionId: reviewExecution.executionId,
      fastTrackProposalExecutionId: fastTrackProposalExecution.executionId,
      fastTrackReviewExecutionId: fastTrackReviewExecution.executionId,
      escalationSessionId: escalationRun.sessionId,
      escalationStatus: escalationApproval.execution.approval_outcome.status,
      escalationResolution: escalationResolution.status,
      escalationResumeProposalExecutionId: escalationResumeProposal.executionId,
      escalationResumeReviewExecutionId: escalationResumeReview.executionId,
      escalationApproveResolution: escalationApproveResolution.status,
      escalationStopResolution: escalationStopResolution.status,
      signalSessionId: signalRun.sessionId,
      signalRoutingMode: signalResult.routingMode,
      signalContextOnlyDisposition: contextOnlySignalResult.signalDisposition,
      signalResumeProposalExecutionId: signalResumeProposal.executionId,
      signalResumeReviewExecutionId: signalResumeReview.executionId
    }, null, 2));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
