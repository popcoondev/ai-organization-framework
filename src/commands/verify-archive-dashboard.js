import path from "node:path";
import { nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";
import { readJson } from "./verify-history.js";

function healthRank(status) {
  if (status === "critical") {
    return 3;
  }
  if (status === "warning") {
    return 2;
  }
  if (status === "info") {
    return 1;
  }
  return 0;
}

function recommendationRank(action) {
  if (action === "human-review-recommended") {
    return 5;
  }
  if (action === "investigate-archive-capacity") {
    return 4;
  }
  if (action === "investigate-archive-drift") {
    return 3;
  }
  if (action === "continue-monitoring") {
    return 1;
  }
  return 0;
}

function buildMonitoringPolicy() {
  return {
    field_severity: {
      critical: [
        "archive_health_status",
        "archive_threshold_status",
        "archive_index_recommendation"
      ],
      warning: [
        "archive_recommendation_transition",
        "archive_retention_transition",
        "archive_health_transition",
        "archive_threshold_transition"
      ]
    },
    thresholds: {
      require_archive_health_healthy: true,
      require_archive_threshold_within: true,
      warn_when_retention_reached: true
    }
  };
}

function buildCurrentState(indexArtifact, logArtifact) {
  return {
    index: {
      health_status: indexArtifact.health_status ?? null,
      threshold_status: indexArtifact.threshold_status ?? null,
      recommendation_action: indexArtifact.operator_recommendation?.action ?? null,
      recommendation_urgency: indexArtifact.operator_recommendation?.urgency ?? null,
      retention_reached: indexArtifact.retention_reached ?? false,
      retained_count: indexArtifact.retained_count ?? 0,
      pruned_count: indexArtifact.pruned_count ?? 0
    },
    log: {
      latest_timestamp: logArtifact.latest_timestamp ?? null,
      entry_count: logArtifact.entry_count ?? 0,
      health_transition: logArtifact.summary?.health?.latest_transition ?? null,
      threshold_transition: logArtifact.summary?.threshold?.latest_transition ?? null,
      recommendation_action: logArtifact.summary?.recommendation?.latest_action ?? null,
      recommendation_urgency: logArtifact.summary?.recommendation?.latest_urgency ?? null,
      recommendation_transition: logArtifact.summary?.recommendation?.latest_transition ?? null,
      retention_reached: logArtifact.summary?.retention?.latest_retention_reached ?? false,
      retention_transition: logArtifact.summary?.retention?.latest_transition ?? null
    }
  };
}

function buildTrendSummary(logArtifact) {
  return {
    health_transition: logArtifact.summary?.health?.latest_transition ?? null,
    threshold_transition: logArtifact.summary?.threshold?.latest_transition ?? null,
    recommendation_transition: logArtifact.summary?.recommendation?.latest_transition ?? null,
    retention_transition: logArtifact.summary?.retention?.latest_transition ?? null
  };
}

function buildAlerts(indexArtifact, logArtifact, monitoringPolicy) {
  const alerts = [];
  const trendSummary = buildTrendSummary(logArtifact);

  if (indexArtifact.health_status && indexArtifact.health_status !== "healthy") {
    alerts.push({
      code: "archive-dashboard-health-not-healthy",
      severity: indexArtifact.health_status === "critical" ? "critical" : "warning",
      message: `Archive current health is ${indexArtifact.health_status}.`
    });
  }

  if (indexArtifact.threshold_status === "breached") {
    alerts.push({
      code: "archive-dashboard-threshold-breached",
      severity: "critical",
      message: "Archive current threshold status is breached."
    });
  }

  if (trendSummary.recommendation_transition && !["stable", "initial"].includes(trendSummary.recommendation_transition)) {
    alerts.push({
      code: "archive-dashboard-recommendation-transition-detected",
      severity: "warning",
      message: `Archive recommendation transition is ${trendSummary.recommendation_transition}.`
    });
  }

  if (trendSummary.retention_transition && !["stable", "initial"].includes(trendSummary.retention_transition)) {
    alerts.push({
      code: "archive-dashboard-retention-transition-detected",
      severity: "warning",
      message: `Archive retention transition is ${trendSummary.retention_transition}.`
    });
  }

  if (trendSummary.health_transition && !["stable", "initial"].includes(trendSummary.health_transition)) {
    alerts.push({
      code: "archive-dashboard-health-transition-detected",
      severity: "warning",
      message: `Archive health transition is ${trendSummary.health_transition}.`
    });
  }

  if (trendSummary.threshold_transition && !["stable", "initial"].includes(trendSummary.threshold_transition)) {
    alerts.push({
      code: "archive-dashboard-threshold-transition-detected",
      severity: "warning",
      message: `Archive threshold transition is ${trendSummary.threshold_transition}.`
    });
  }

  if (monitoringPolicy.thresholds?.warn_when_retention_reached && indexArtifact.retention_reached) {
    alerts.push({
      code: "archive-dashboard-retention-capacity-reached",
      severity: "warning",
      message: "Archive retention capacity has been reached."
    });
  }

  return alerts;
}

function buildThresholdBreaches(indexArtifact, monitoringPolicy) {
  const breaches = [];

  if (monitoringPolicy.thresholds?.require_archive_health_healthy && indexArtifact.health_status !== "healthy") {
    breaches.push({
      code: "archive-dashboard-health-required-healthy",
      severity: indexArtifact.health_status === "critical" ? "critical" : "warning",
      threshold: "healthy",
      observed: indexArtifact.health_status ?? null,
      message: `Archive health did not meet the required threshold: observed=${indexArtifact.health_status ?? "unknown"}.`
    });
  }

  if (monitoringPolicy.thresholds?.require_archive_threshold_within && indexArtifact.threshold_status !== "within-threshold") {
    breaches.push({
      code: "archive-dashboard-threshold-required-within",
      severity: "critical",
      threshold: "within-threshold",
      observed: indexArtifact.threshold_status ?? null,
      message: `Archive threshold did not meet the required threshold: observed=${indexArtifact.threshold_status ?? "unknown"}.`
    });
  }

  return breaches;
}

function deriveOperatorRecommendation(indexArtifact, logArtifact, alerts, thresholdBreaches) {
  const sourceSignals = [
    ...thresholdBreaches.map((breach) => breach.code),
    ...alerts.map((alert) => alert.code)
  ];

  if (thresholdBreaches.some((breach) => breach.severity === "critical")) {
    return {
      action: "human-review-recommended",
      urgency: "critical",
      rationale: "Archive-level threshold breaches indicate the retained verification archive is not operationally healthy.",
      source_signals: sourceSignals
    };
  }

  const currentAction = indexArtifact.operator_recommendation?.action ?? null;
  const trendAction = logArtifact.summary?.recommendation?.latest_action ?? null;
  const strongestAction = [currentAction, trendAction]
    .filter(Boolean)
    .sort((left, right) => recommendationRank(right) - recommendationRank(left))[0] ?? "continue-monitoring";

  if (alerts.some((alert) => alert.code === "archive-dashboard-retention-capacity-reached")) {
    return {
      action: "investigate-archive-capacity",
      urgency: "warning",
      rationale: "Archive retention has reached capacity and future imports will require pruning older runs.",
      source_signals: sourceSignals
    };
  }

  if (alerts.some((alert) => alert.severity === "warning")) {
    return {
      action: strongestAction === "continue-monitoring" ? "investigate-archive-drift" : strongestAction,
      urgency: "warning",
      rationale: "Archive-level trend or drift signals should be investigated before treating the archive state as stable.",
      source_signals: sourceSignals
    };
  }

  return {
    action: "continue-monitoring",
    urgency: "healthy",
    rationale: "Archive current-state and trend are stable.",
    source_signals: sourceSignals
  };
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }
  return String(value);
}

function formatArchiveDashboardReport(artifact) {
  const lines = [
    "# Verification Archive Dashboard Report",
    "",
    `- generated at: ${formatValue(artifact.generated_at)}`,
    `- overall health status: ${formatValue(artifact.overall_health_status)}`,
    `- overall threshold status: ${formatValue(artifact.overall_threshold_status)}`,
    `- operator recommendation: ${formatValue(artifact.overall_operator_recommendation?.action)} / urgency=${formatValue(artifact.overall_operator_recommendation?.urgency)}`,
    ""
  ];

  lines.push("## Overall Operator Recommendation");
  lines.push(`- action: ${formatValue(artifact.overall_operator_recommendation?.action)}`);
  lines.push(`- urgency: ${formatValue(artifact.overall_operator_recommendation?.urgency)}`);
  lines.push(`- rationale: ${formatValue(artifact.overall_operator_recommendation?.rationale)}`);
  lines.push(`- source signals: ${formatValue(artifact.overall_operator_recommendation?.source_signals)}`);
  lines.push("");

  lines.push("## Current State");
  for (const [layer, snapshot] of Object.entries(artifact.current_state ?? {})) {
    lines.push(`- ${layer}: ${formatValue(Object.entries(snapshot ?? {}).map(([key, value]) => `${key}=${formatValue(value)}`))}`);
  }
  lines.push("");

  lines.push("## Trend Summary");
  lines.push(`- health transition: ${formatValue(artifact.trend_summary?.health_transition)}`);
  lines.push(`- threshold transition: ${formatValue(artifact.trend_summary?.threshold_transition)}`);
  lines.push(`- recommendation transition: ${formatValue(artifact.trend_summary?.recommendation_transition)}`);
  lines.push(`- retention transition: ${formatValue(artifact.trend_summary?.retention_transition)}`);
  lines.push("");

  lines.push("## Monitoring Policy");
  lines.push(`- critical fields: ${formatValue(artifact.monitoring_policy?.field_severity?.critical)}`);
  lines.push(`- warning fields: ${formatValue(artifact.monitoring_policy?.field_severity?.warning)}`);
  lines.push(`- require archive health healthy: ${formatValue(artifact.monitoring_policy?.thresholds?.require_archive_health_healthy)}`);
  lines.push(`- require archive threshold within: ${formatValue(artifact.monitoring_policy?.thresholds?.require_archive_threshold_within)}`);
  lines.push(`- warn when retention reached: ${formatValue(artifact.monitoring_policy?.thresholds?.warn_when_retention_reached)}`);
  lines.push("");

  lines.push("## Alerts");
  if (!Array.isArray(artifact.alerts) || artifact.alerts.length === 0) {
    lines.push("- none");
  } else {
    for (const alert of artifact.alerts) {
      lines.push(`- [${formatValue(alert.severity)}] ${formatValue(alert.code)}: ${formatValue(alert.message)}`);
    }
  }
  lines.push("");

  lines.push("## Threshold Breaches");
  if (!Array.isArray(artifact.threshold_breaches) || artifact.threshold_breaches.length === 0) {
    lines.push("- none");
  } else {
    for (const breach of artifact.threshold_breaches) {
      lines.push(`- [${formatValue(breach.severity)}] ${formatValue(breach.code)}: ${formatValue(breach.message)} (observed=${formatValue(breach.observed)}, threshold=${formatValue(breach.threshold)})`);
    }
  }
  lines.push("");

  lines.push("## Source Artifacts");
  lines.push(`- archive index: ${formatValue(artifact.source_artifacts?.archive_index)}`);
  lines.push(`- archive log: ${formatValue(artifact.source_artifacts?.archive_log)}`);
  lines.push("");

  return lines.join("\n");
}

export async function verifyArchiveDashboardCommand(options) {
  if (!options.indexInput || !options.logInput) {
    throw new Error("Missing --index-input or --log-input for `verify-archive-dashboard`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-archive-dashboard`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const indexPath = path.resolve(options.indexInput);
  const logPath = path.resolve(options.logInput);
  const indexArtifact = await readJson(indexPath, "verification archive index");
  const logArtifact = await readJson(logPath, "verification archive log");
  const monitoringPolicy = buildMonitoringPolicy();
  const alerts = buildAlerts(indexArtifact, logArtifact, monitoringPolicy);
  const thresholdBreaches = buildThresholdBreaches(indexArtifact, monitoringPolicy);
  const dashboardArtifact = {
    artifact_type: "verification-archive-dashboard",
    generated_at: nowIso(),
    source_artifacts: {
      archive_index: indexPath,
      archive_log: logPath
    },
    overall_health_status: thresholdBreaches.some((item) => item.severity === "critical") || alerts.some((item) => item.severity === "critical")
      ? "critical"
      : indexArtifact.health_status === "warning" || alerts.some((item) => item.severity === "warning")
        ? "warning"
        : "healthy",
    overall_threshold_status: indexArtifact.threshold_status ?? "within-threshold",
    monitoring_policy: monitoringPolicy,
    alerts,
    threshold_breaches: thresholdBreaches,
    overall_operator_recommendation: null,
    current_state: buildCurrentState(indexArtifact, logArtifact),
    trend_summary: buildTrendSummary(logArtifact)
  };
  dashboardArtifact.overall_operator_recommendation = deriveOperatorRecommendation(indexArtifact, logArtifact, alerts, thresholdBreaches);

  const dashboardJsonPath = await writeJsonArtifact(path.join(artifactDir, "verification-archive-dashboard.json"), dashboardArtifact);
  const dashboardReportPath = await writeTextArtifact(path.join(artifactDir, "verification-archive-dashboard.md"), formatArchiveDashboardReport(dashboardArtifact));

  return {
    ok: true,
    status: "completed",
    artifactDir,
    dashboardJsonPath,
    dashboardReportPath,
    overallHealthStatus: dashboardArtifact.overall_health_status,
    overallThresholdStatus: dashboardArtifact.overall_threshold_status,
    overallRecommendedAction: dashboardArtifact.overall_operator_recommendation?.action ?? null
  };
}
