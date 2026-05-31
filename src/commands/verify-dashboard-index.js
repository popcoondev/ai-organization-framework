import path from "node:path";
import { nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";
import { readJson } from "./verify-history.js";

function buildMonitoringPolicy() {
  return {
    field_severity: {
      critical: [
        "overall_health_status",
        "overall_threshold_status"
      ],
      warning: [
        "recommendation_action",
        "recommendation_urgency",
        "recommendation_transition"
      ]
    },
    thresholds: {
      require_latest_health_healthy: true,
      require_latest_threshold_within: true
    }
  };
}

function buildAlerts(logArtifact, latestDashboard, monitoringPolicy) {
  const alerts = [];
  const healthSummary = logArtifact.summary?.health ?? {};
  const thresholdSummary = logArtifact.summary?.threshold ?? {};
  const recommendationSummary = logArtifact.summary?.recommendation ?? {};

  if (!latestDashboard) {
    alerts.push({
      code: "no-latest-dashboard",
      severity: "critical",
      message: "No dashboard snapshots are available in the current dashboard log."
    });
    return alerts;
  }

  if (latestDashboard.overall_threshold_status === "breached") {
    alerts.push({
      code: "latest-dashboard-threshold-breached",
      severity: "critical",
      message: "Latest dashboard snapshot is in breached threshold state."
    });
  }

  if (latestDashboard.overall_health_status !== "healthy") {
    alerts.push({
      code: "latest-dashboard-health-not-healthy",
      severity: latestDashboard.overall_health_status === "critical" ? "critical" : "warning",
      message: `Latest dashboard health is ${latestDashboard.overall_health_status ?? "unknown"}.`
    });
  }

  if (recommendationSummary.latest_transition && recommendationSummary.latest_transition !== "stable" && recommendationSummary.latest_transition !== "initial") {
    alerts.push({
      code: "dashboard-recommendation-transition-detected",
      severity: "warning",
      message: `Latest dashboard recommendation transition is ${recommendationSummary.latest_transition}.`
    });
  }

  if (thresholdSummary.latest_transition && thresholdSummary.latest_transition !== "stable" && thresholdSummary.latest_transition !== "initial") {
    alerts.push({
      code: "dashboard-threshold-transition-detected",
      severity: "warning",
      message: `Latest dashboard threshold transition is ${thresholdSummary.latest_transition}.`
    });
  }

  if (healthSummary.latest_transition && healthSummary.latest_transition !== "stable" && healthSummary.latest_transition !== "initial") {
    alerts.push({
      code: "dashboard-health-transition-detected",
      severity: "warning",
      message: `Latest dashboard health transition is ${healthSummary.latest_transition}.`
    });
  }

  return alerts;
}

function buildThresholdBreaches(latestDashboard, monitoringPolicy) {
  const thresholds = monitoringPolicy.thresholds ?? {};
  const breaches = [];

  if (thresholds.require_latest_health_healthy && latestDashboard?.overall_health_status !== "healthy") {
    breaches.push({
      code: "latest-dashboard-health-required-healthy",
      severity: latestDashboard?.overall_health_status === "critical" ? "critical" : "warning",
      threshold: "healthy",
      observed: latestDashboard?.overall_health_status ?? null,
      message: `Latest dashboard health did not meet the required threshold: observed=${latestDashboard?.overall_health_status ?? "unknown"}.`
    });
  }

  if (thresholds.require_latest_threshold_within && latestDashboard?.overall_threshold_status !== "within-threshold") {
    breaches.push({
      code: "latest-dashboard-threshold-required-within",
      severity: "critical",
      threshold: "within-threshold",
      observed: latestDashboard?.overall_threshold_status ?? null,
      message: `Latest dashboard threshold status did not meet the required threshold: observed=${latestDashboard?.overall_threshold_status ?? "unknown"}.`
    });
  }

  return breaches;
}

function deriveOperatorRecommendation(indexArtifact) {
  const breaches = indexArtifact.threshold_breaches ?? [];
  const alerts = indexArtifact.alerts ?? [];
  const sourceSignals = [
    ...breaches.map((breach) => breach.code),
    ...alerts.map((alert) => alert.code)
  ];

  if (breaches.some((breach) => breach.severity === "critical")) {
    return {
      action: "human-review-recommended",
      urgency: "critical",
      rationale: "Dashboard-level threshold breaches indicate the overall verification surface should be reviewed by a human operator.",
      source_signals: sourceSignals
    };
  }

  if (alerts.some((alert) => alert.severity === "warning")) {
    return {
      action: "investigate-dashboard-drift",
      urgency: "warning",
      rationale: "Dashboard-level drift or transition signals should be investigated before trusting the current operator state as stable.",
      source_signals: sourceSignals
    };
  }

  return {
    action: "continue-monitoring",
    urgency: "healthy",
    rationale: "Dashboard-level health and thresholds are stable.",
    source_signals: sourceSignals
  };
}

function formatDashboardIndexReport(indexArtifact) {
  const latest = indexArtifact.latest_dashboard;
  const recommendation = indexArtifact.operator_recommendation;
  const recommendationSummary = indexArtifact.recommendation_summary;
  const monitoringPolicy = indexArtifact.monitoring_policy ?? {};

  const lines = [
    "# Verification Dashboard Index Report",
    "",
    `- generated at: ${indexArtifact.generated_at ?? "-"}`,
    `- source log generated at: ${indexArtifact.source_log_generated_at ?? "-"}`,
    `- entry count: ${indexArtifact.entry_count ?? 0}`,
    `- latest timestamp: ${indexArtifact.latest_timestamp ?? "-"}`,
    `- health status: ${indexArtifact.health_status ?? "-"}`,
    `- threshold status: ${indexArtifact.threshold_status ?? "-"}`,
    ""
  ];

  lines.push("## Operator Recommendation");
  lines.push(`- action: ${recommendation?.action ?? "-"}`);
  lines.push(`- urgency: ${recommendation?.urgency ?? "-"}`);
  lines.push(`- rationale: ${recommendation?.rationale ?? "-"}`);
  lines.push(`- source signals: ${(recommendation?.source_signals ?? []).join(", ") || "-"}`);
  lines.push("");

  lines.push("## Recommendation Summary");
  lines.push(`- latest action: ${recommendationSummary?.latest_action ?? "-"}`);
  lines.push(`- latest urgency: ${recommendationSummary?.latest_urgency ?? "-"}`);
  lines.push(`- previous action: ${recommendationSummary?.previous_action ?? "-"}`);
  lines.push(`- previous urgency: ${recommendationSummary?.previous_urgency ?? "-"}`);
  lines.push(`- latest transition: ${recommendationSummary?.latest_transition ?? "-"}`);
  lines.push(`- distinct actions: ${(recommendationSummary?.distinct_actions ?? []).join(", ") || "-"}`);
  lines.push(`- distinct urgencies: ${(recommendationSummary?.distinct_urgencies ?? []).join(", ") || "-"}`);
  lines.push("");

  lines.push("## Monitoring Policy");
  lines.push(`- critical fields: ${(monitoringPolicy.field_severity?.critical ?? []).join(", ") || "-"}`);
  lines.push(`- warning fields: ${(monitoringPolicy.field_severity?.warning ?? []).join(", ") || "-"}`);
  lines.push(`- require latest health healthy: ${monitoringPolicy.thresholds?.require_latest_health_healthy ?? "-"}`);
  lines.push(`- require latest threshold within: ${monitoringPolicy.thresholds?.require_latest_threshold_within ?? "-"}`);
  lines.push("");

  lines.push("## Alerts");
  if (!Array.isArray(indexArtifact.alerts) || indexArtifact.alerts.length === 0) {
    lines.push("- none");
  } else {
    for (const alert of indexArtifact.alerts) {
      lines.push(`- [${alert.severity ?? "unknown"}] ${alert.code ?? "unknown"}: ${alert.message ?? "-"}`);
    }
  }
  lines.push("");

  lines.push("## Threshold Breaches");
  if (!Array.isArray(indexArtifact.threshold_breaches) || indexArtifact.threshold_breaches.length === 0) {
    lines.push("- none");
  } else {
    for (const breach of indexArtifact.threshold_breaches) {
      lines.push(`- [${breach.severity ?? "unknown"}] ${breach.code ?? "unknown"}: ${breach.message ?? "-"} (observed=${breach.observed ?? "-"}, threshold=${breach.threshold ?? "-"})`);
    }
  }
  lines.push("");

  lines.push("## Latest Dashboard");
  if (!latest) {
    lines.push("- none");
  } else {
    lines.push(`- path: ${latest.dashboard_path ?? "-"}`);
    lines.push(`- health status: ${latest.overall_health_status ?? "-"}`);
    lines.push(`- threshold status: ${latest.overall_threshold_status ?? "-"}`);
    lines.push(`- recommendation: ${latest.overall_operator_recommendation?.action ?? "-"} / urgency=${latest.overall_operator_recommendation?.urgency ?? "-"}`);
  }
  lines.push("");

  return lines.join("\n");
}

export async function verifyDashboardIndexCommand(options) {
  if (!options.logInput) {
    throw new Error("Missing --log-input for `verify-dashboard-index`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-dashboard-index`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const logPath = path.resolve(options.logInput);
  const logArtifact = await readJson(logPath, "verification dashboard log");
  const latestDashboard = logArtifact.latest_dashboard ?? null;
  const monitoringPolicy = buildMonitoringPolicy();
  const alerts = buildAlerts(logArtifact, latestDashboard, monitoringPolicy);
  const thresholdBreaches = buildThresholdBreaches(latestDashboard, monitoringPolicy);
  const indexArtifact = {
    artifact_type: "verification-dashboard-index",
    generated_at: nowIso(),
    source_log_generated_at: logArtifact.generated_at ?? null,
    source_log_path: logPath,
    entry_count: logArtifact.entry_count ?? 0,
    latest_timestamp: logArtifact.latest_timestamp ?? null,
    health_status: latestDashboard?.overall_health_status ?? null,
    threshold_status: latestDashboard?.overall_threshold_status ?? null,
    monitoring_policy: monitoringPolicy,
    alerts,
    threshold_breaches: thresholdBreaches,
    operator_recommendation: null,
    recommendation_summary: logArtifact.summary?.recommendation ?? null,
    latest_dashboard: latestDashboard
  };
  indexArtifact.operator_recommendation = deriveOperatorRecommendation(indexArtifact);

  const indexJsonPath = await writeJsonArtifact(path.join(artifactDir, "verification-dashboard-index.json"), indexArtifact);
  const indexReportPath = await writeTextArtifact(path.join(artifactDir, "verification-dashboard-index.md"), formatDashboardIndexReport(indexArtifact));

  return {
    ok: true,
    status: "completed",
    artifactDir,
    indexJsonPath,
    indexReportPath,
    healthStatus: indexArtifact.health_status,
    thresholdStatus: indexArtifact.threshold_status,
    operatorRecommendation: indexArtifact.operator_recommendation?.action ?? null
  };
}
