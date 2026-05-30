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
      "--include-approval"
    ], "live-verify");
    const liveVerifyBundle = JSON.parse(
      await fs.readFile(liveVerifyResult.liveVerifyBundlePath ?? liveVerifyResult.bundlePath, "utf8")
    );
    const liveVerifyReport = await fs.readFile(liveVerifyResult.reportPath, "utf8");
    const liveVerifyHistoryArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-history");
    const liveVerifyLogArtifactDir = path.join(projectRoot, ".aof", "artifacts", "live-verify-log");
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
    const verifyLogFirstResult = runCli([
      "verify-log",
      "--input",
      liveVerifyArtifactDir,
      "--artifact-dir",
      liveVerifyLogArtifactDir
    ], "verify-log first append");
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

    if (!/warning fields: routing_mode, signal_reopen_status, escalation_reopen_status, escalation_approve_status, escalation_stop_status/.test(verifyIndexReport)) {
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

    console.log(JSON.stringify({
      ok: true,
      sessionId: runResult.sessionId,
      routingMode: runResult.routingMode,
      liveVerifyStatus: liveVerifyResult.status,
      liveVerifyBundlePath: liveVerifyResult.bundlePath,
      liveVerifyReportPath: liveVerifyResult.reportPath,
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
