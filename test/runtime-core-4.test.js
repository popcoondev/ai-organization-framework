import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { answerCommand } from "../src/commands/answer.js";
import { alignmentPulseCommand } from "../src/commands/alignment-pulse.js";
import { cadenceFollowThroughCommand } from "../src/commands/cadence-follow-through.js";
import { cadenceTriggerGuideCommand } from "../src/commands/cadence-trigger-guide.js";
import { councilExecCommand } from "../src/commands/council-exec.js";
import { liveVerifyCommand } from "../src/commands/live-verify.js";
import { outcomeReportCommand } from "../src/commands/outcome-report.js";
import { retireCandidateReviewCommand } from "../src/commands/retire-candidate-review.js";
import { runCommand } from "../src/commands/run.js";
import { selfAuditRecordCommand } from "../src/commands/self-audit-record.js";
import { taskOpenCommand } from "../src/commands/task-open.js";
import { taskUpdateCommand } from "../src/commands/task-update.js";
import { verifyHistoryCommand } from "../src/commands/verify-history.js";
import { verifyDashboardCommand } from "../src/commands/verify-dashboard.js";
import { verifyDashboardIndexCommand } from "../src/commands/verify-dashboard-index.js";
import { verifyDashboardLogCommand } from "../src/commands/verify-dashboard-log.js";
import { verifyArchiveCommand } from "../src/commands/verify-archive.js";
import { verifyArchiveDashboardCommand } from "../src/commands/verify-archive-dashboard.js";
import { verifyArchiveLogCommand } from "../src/commands/verify-archive-log.js";
import { verifyLineageCommand } from "../src/commands/verify-lineage.js";
import { verifyLogCommand } from "../src/commands/verify-log.js";
import {
  updateDecisionRecordForEscalation,
  updateDecisionRecordForEscalationResolution
} from "../src/runtime/decision.js";
import { loadSession } from "../src/runtime/session.js";
import { signalCommand } from "../src/commands/signal.js";
import { loadTemplate } from "../src/runtime/template-loader.js";
import { genericExampleProjectRoot, createTempProject, createTempProjectFrom, advanceSessionToPlanning, writeSignalFixture, writeSignal } from "./runtime-test-helpers.js";

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
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

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
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

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
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

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
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

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
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

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
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

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
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

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
  assert.equal(result.currentStage, "need-validation");
  assert.equal(result.routingMode, "fast-track");
  assert.equal(result.signalDisposition, "context-updated");
  assert.deepEqual(result.pendingQuestions, []);
  assert.equal(result.reopenContext, null);
  assert.equal(result.signalContext?.disposition, "context-updated");

  const session = await loadSession(result.sessionPath);
  assert.equal(session.status, "framed");
  assert.equal(session.current_stage, "need-validation");
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
  assert.equal(resumed.currentStage, "need-validation");
  assert.ok(resumed.decisionId);

  const session = await loadSession(runResult.sessionPath);
  assert.equal(session.status, "framed");
  assert.equal(session.current_stage, "need-validation");
  assert.equal(session.routing_mode, "deep-path");
  assert.equal("stop_reason" in session, false);
  assert.equal("recoverability" in session, false);
  assert.equal("suggested_next_action" in session, false);
});

test("answerCommand promotes a fully framed request into need validation and emits a gate decision", async (t) => {
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
  assert.equal(answerResult.currentStage, "need-validation");
  assert.ok(answerResult.decisionId);

  const session = await loadSession(answerResult.sessionPath);
  assert.equal(session.current_stage, "need-validation");
  assert.equal(session.status, "framed");
  assert.equal(session.open_decision_ids.length, 1);
  assert.equal(session.closed_decision_ids.length, 1);
  assert.equal(session.context_snapshot_id?.startsWith("CTX-"), true);
  assert.equal(session.stage_transitions.at(-1)?.to_stage, "need-validation");
  assert.equal(session.stage_transitions.at(-1)?.to_status, "framed");
  assert.equal(session.stage_transitions.at(-1)?.reason, "clarification-complete");

  const gateDecisionText = await fs.readFile(answerResult.decisionJsonPath, "utf8");
  const gateDecision = JSON.parse(gateDecisionText);
  assert.equal(gateDecision.need, "新規登録導線全体");
  assert.equal(gateDecision.context_snapshot_id, session.context_snapshot_id);
  assert.equal(gateDecision.forecast_required, false);
  assert.match(gateDecision.decision_summary, /need validation/i);
  assert.match(session.context_snapshot_id, /^CTX-[A-Z0-9]+-[A-Z0-9]+$/);
});

test("answerCommand records clarification answers in the recent confirmation window and defers the operating goal until planning", async (t) => {
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
  assert.equal(answerResult.projectMemory.operatingGoalProjection, null);

  const confirmationWindowPath = path.join(projectRoot, ".aof", "context", "active", "recent-confirmation-window.json");
  const confirmationWindow = JSON.parse(await fs.readFile(confirmationWindowPath, "utf8"));
  assert.equal(confirmationWindow.window_type, "recent-confirmation-window");
  assert.equal(confirmationWindow.entries.length, 3);
  assert.equal(confirmationWindow.entries[2].answer, "認証基盤は変更しない");
  assert.equal(confirmationWindow.entries.every((entry) => entry.scale_direction === "complete need validation before planning"), true);
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
  await advanceSessionToPlanning(projectRoot, runResult.sessionPath);

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
  assert.match(latestEntry.question, /framework self-audit/u);
  assert.match(latestEntry.question, /gap/u);
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
  assert.equal(session.current_stage, "need-validation");
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
