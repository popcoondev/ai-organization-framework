import path from "node:path";
import { nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";
import { readJson, resolveBundlePath } from "./verify-history.js";

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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildLayerSnapshots(historyArtifact, logArtifact, indexArtifact) {
  return {
    history: {
      latest_action: historyArtifact.summary?.recommendation?.latest_action ?? null,
      latest_urgency: historyArtifact.summary?.recommendation?.latest_urgency ?? null,
      latest_transition: historyArtifact.summary?.recommendation?.latest_transition ?? null,
      distinct_actions: historyArtifact.summary?.recommendation?.distinct_actions ?? []
    },
    log: {
      latest_action: logArtifact.operator_recommendation?.action ?? null,
      latest_urgency: logArtifact.operator_recommendation?.urgency ?? null,
      latest_transition: logArtifact.recommendation_trend?.latest_transition ?? null,
      distinct_actions: unique((logArtifact.recommendation_trend?.timeline ?? []).map((item) => item.action))
    },
    index: {
      latest_action: indexArtifact.operator_recommendation?.action ?? null,
      latest_urgency: indexArtifact.operator_recommendation?.urgency ?? null,
      latest_transition: indexArtifact.recommendation_summary?.latest_transition ?? null,
      previous_action: indexArtifact.recommendation_summary?.previous_action ?? null
    }
  };
}

function buildLineageTimeline(historyArtifact, logArtifact, indexArtifact) {
  const historyTimeline = (historyArtifact.summary?.recommendation?.timeline ?? []).map((item) => ({
    layer: "history",
    generated_at: item.generated_at ?? null,
    action: item.action ?? null,
    urgency: item.urgency ?? null
  }));
  const logTimeline = (logArtifact.recommendation_trend?.timeline ?? []).map((item) => ({
    layer: "log",
    generated_at: item.source_generated_at ?? null,
    action: item.action ?? null,
    urgency: item.urgency ?? null
  }));
  const indexTimeline = [{
    layer: "index",
    generated_at: indexArtifact.recommendation_summary?.latest_generated_at ?? null,
    action: indexArtifact.recommendation_summary?.latest_action ?? null,
    urgency: indexArtifact.recommendation_summary?.latest_urgency ?? null
  }];

  return [...historyTimeline, ...logTimeline, ...indexTimeline].filter((item) => item.action);
}

function buildLineageSummary(historyArtifact, logArtifact, indexArtifact, layerSnapshots, timeline) {
  return {
    current_action: indexArtifact.operator_recommendation?.action ?? null,
    current_urgency: indexArtifact.operator_recommendation?.urgency ?? null,
    current_transition: indexArtifact.recommendation_summary?.latest_transition ?? null,
    history_transition: historyArtifact.summary?.recommendation?.latest_transition ?? null,
    log_transition: logArtifact.recommendation_trend?.latest_transition ?? null,
    distinct_actions: unique([
      ...(historyArtifact.summary?.recommendation?.distinct_actions ?? []),
      ...(logArtifact.recommendation_trend?.timeline ?? []).map((item) => item.action),
      indexArtifact.recommendation_summary?.latest_action ?? null,
      indexArtifact.recommendation_summary?.previous_action ?? null
    ]),
    distinct_urgencies: unique([
      ...(historyArtifact.summary?.recommendation?.distinct_urgencies ?? []),
      ...(logArtifact.recommendation_trend?.timeline ?? []).map((item) => item.urgency),
      indexArtifact.recommendation_summary?.latest_urgency ?? null,
      indexArtifact.recommendation_summary?.previous_urgency ?? null
    ]),
    layer_snapshots: layerSnapshots,
    timeline_entry_count: timeline.length
  };
}

function buildLineageAlerts(summary) {
  const alerts = [];

  if ((summary.timeline_entry_count ?? 0) === 0) {
    alerts.push({
      code: "no-lineage-timeline",
      severity: "critical",
      message: "No recommendation lineage entries are available."
    });
    return alerts;
  }

  const historyLatestAction = summary.layer_snapshots?.history?.latest_action ?? null;
  const logLatestAction = summary.layer_snapshots?.log?.latest_action ?? null;
  const indexLatestAction = summary.layer_snapshots?.index?.latest_action ?? null;
  const historyTransition = summary.layer_snapshots?.history?.latest_transition ?? null;
  const logTransition = summary.layer_snapshots?.log?.latest_transition ?? null;
  const indexTransition = summary.layer_snapshots?.index?.latest_transition ?? null;

  if (historyLatestAction && indexLatestAction && historyLatestAction !== indexLatestAction) {
    alerts.push({
      code: "history-index-action-divergence",
      severity: "warning",
      message: `History latest action (${historyLatestAction}) differs from current index action (${indexLatestAction}).`
    });
  }

  if (logLatestAction && indexLatestAction && logLatestAction !== indexLatestAction) {
    alerts.push({
      code: "log-index-action-divergence",
      severity: "warning",
      message: `Log latest action (${logLatestAction}) differs from current index action (${indexLatestAction}).`
    });
  }

  if (historyTransition && indexTransition && historyTransition !== indexTransition) {
    alerts.push({
      code: "history-index-transition-divergence",
      severity: "warning",
      message: `History latest transition (${historyTransition}) differs from current index transition (${indexTransition}).`
    });
  }

  if (logTransition && indexTransition && logTransition !== indexTransition) {
    alerts.push({
      code: "log-index-transition-divergence",
      severity: "warning",
      message: `Log latest transition (${logTransition}) differs from current index transition (${indexTransition}).`
    });
  }

  return alerts;
}

function deriveLineageHealthStatus(alerts) {
  if (alerts.some((alert) => alert.severity === "critical")) {
    return "critical";
  }
  if (alerts.some((alert) => alert.severity === "warning")) {
    return "warning";
  }
  return "healthy";
}

function buildLineageMonitoringPolicy() {
  return {
    field_severity: {
      critical: [
        "timeline_entry_count"
      ],
      warning: [
        "current_action",
        "current_transition",
        "history_transition",
        "log_transition",
        "distinct_actions",
        "distinct_urgencies",
        "operator_recommendation_action",
        "operator_recommendation_urgency",
        "recommendation_direction",
        "health_direction",
        "alert_direction"
      ]
    },
    thresholds: {
      max_critical_alerts: 0,
      max_warning_alerts: 0,
      allow_recommendation_worsened: false,
      require_healthy_for_continue_monitoring: true
    }
  };
}

function buildLineageAlertSeverityCounts(alerts) {
  return alerts.reduce((counts, alert) => {
    const key = alert.severity ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {
    critical: 0,
    warning: 0,
    info: 0
  });
}

function deriveLineageOperatorRecommendation(summary, alerts, healthStatus) {
  const sourceSignals = (alerts ?? []).map((alert) => alert.code);

  if (healthStatus === "critical") {
    return {
      action: "human-review-recommended",
      urgency: "critical",
      rationale: "Critical lineage alerts indicate recommendation state is too inconsistent to trust without human review.",
      source_signals: sourceSignals
    };
  }

  if (healthStatus === "warning") {
    return {
      action: "investigate-lineage-drift",
      urgency: "warning",
      rationale: "Cross-layer recommendation divergence was detected and should be investigated before treating the lineage as stable.",
      source_signals: sourceSignals
    };
  }

  return {
    action: "continue-monitoring",
    urgency: "healthy",
    rationale: "No lineage divergence alerts are active.",
    source_signals: sourceSignals
  };
}

function classifyRecommendationDirection(historyTransition, currentTransition) {
  if (!historyTransition && !currentTransition) {
    return "unknown";
  }
  if (historyTransition === currentTransition) {
    return "stable";
  }
  if (currentTransition === "escalated") {
    return "worsened";
  }
  if (currentTransition === "de-escalated") {
    return "improved";
  }
  return "unknown";
}

function classifyHealthDirection(healthStatus, recommendationDirection) {
  if (recommendationDirection === "worsened") {
    return "worsened";
  }
  if (recommendationDirection === "improved") {
    return healthStatus === "healthy" ? "improved" : "improving";
  }
  if (recommendationDirection === "stable") {
    return healthStatus === "healthy" ? "stable-healthy" : "stable";
  }
  return "unknown";
}

function classifyAlertDirection(alertCount, recommendationDirection) {
  if (alertCount === 0) {
    return "cleared";
  }
  if (recommendationDirection === "worsened") {
    return "increased";
  }
  if (recommendationDirection === "improved") {
    return "decreased";
  }
  if (recommendationDirection === "stable") {
    return "stable";
  }
  return "unknown";
}

function buildLineageTrendSummary(summary, alerts, healthStatus) {
  const recommendationDirection = classifyRecommendationDirection(
    summary.history_transition,
    summary.current_transition
  );
  const healthDirection = classifyHealthDirection(
    healthStatus,
    recommendationDirection
  );
  const alertDirection = classifyAlertDirection(
    Array.isArray(alerts) ? alerts.length : 0,
    recommendationDirection
  );

  return {
    health_direction: healthDirection,
    recommendation_direction: recommendationDirection,
    alert_direction: alertDirection,
    rationale:
      recommendationDirection === "worsened"
        ? "Current lineage recommends a more escalated action than the historical snapshot."
        : recommendationDirection === "improved"
          ? "Current lineage recommends a less escalated action than the historical snapshot."
          : recommendationDirection === "stable"
            ? "Current lineage recommendation is directionally consistent with the historical snapshot."
            : "Lineage direction could not be derived confidently from the available snapshots.",
    source_snapshots: {
      history_transition: summary.history_transition ?? null,
      current_transition: summary.current_transition ?? null,
      current_health_status: healthStatus,
      alert_count: Array.isArray(alerts) ? alerts.length : 0
    }
  };
}

function buildLineageThresholdBreaches(lineage, monitoringPolicy, alertSeverityCounts) {
  const thresholds = monitoringPolicy.thresholds ?? {};
  const breaches = [];

  if ((alertSeverityCounts.critical ?? 0) > (thresholds.max_critical_alerts ?? 0)) {
    breaches.push({
      code: "critical-alert-threshold-exceeded",
      severity: "critical",
      threshold: thresholds.max_critical_alerts ?? 0,
      observed: alertSeverityCounts.critical ?? 0,
      message: `Critical lineage alert count exceeded threshold: observed=${alertSeverityCounts.critical ?? 0}, threshold=${thresholds.max_critical_alerts ?? 0}.`
    });
  }

  if ((alertSeverityCounts.warning ?? 0) > (thresholds.max_warning_alerts ?? 0)) {
    breaches.push({
      code: "warning-alert-threshold-exceeded",
      severity: "warning",
      threshold: thresholds.max_warning_alerts ?? 0,
      observed: alertSeverityCounts.warning ?? 0,
      message: `Warning lineage alert count exceeded threshold: observed=${alertSeverityCounts.warning ?? 0}, threshold=${thresholds.max_warning_alerts ?? 0}.`
    });
  }

  if (
    thresholds.allow_recommendation_worsened === false &&
    lineage.trend_summary?.recommendation_direction === "worsened"
  ) {
    breaches.push({
      code: "recommendation-worsened-not-allowed",
      severity: "warning",
      threshold: "not-worsened",
      observed: lineage.trend_summary?.recommendation_direction ?? null,
      message: "Lineage recommendation direction worsened relative to history."
    });
  }

  if (
    thresholds.require_healthy_for_continue_monitoring &&
    lineage.operator_recommendation?.action === "continue-monitoring" &&
    lineage.health_status !== "healthy"
  ) {
    breaches.push({
      code: "continue-monitoring-requires-healthy-lineage",
      severity: "warning",
      threshold: "healthy",
      observed: lineage.health_status ?? null,
      message: `Continue-monitoring recommendation requires healthy lineage: observed=${lineage.health_status ?? "unknown"}.`
    });
  }

  return breaches;
}

function formatLineageReport(lineage) {
  const lines = [
    "# Verification Recommendation Lineage Report",
    "",
    `- generated at: ${formatValue(lineage.generated_at)}`,
    `- health status: ${formatValue(lineage.health_status)}`,
    `- current action: ${formatValue(lineage.summary?.current_action)}`,
    `- current urgency: ${formatValue(lineage.summary?.current_urgency)}`,
    `- current transition: ${formatValue(lineage.summary?.current_transition)}`,
    `- history transition: ${formatValue(lineage.summary?.history_transition)}`,
    `- log transition: ${formatValue(lineage.summary?.log_transition)}`,
    `- distinct actions: ${formatValue(lineage.summary?.distinct_actions)}`,
    `- distinct urgencies: ${formatValue(lineage.summary?.distinct_urgencies)}`,
    ""
  ];

  lines.push("## Operator Recommendation");
  if (!lineage.operator_recommendation) {
    lines.push("- none", "");
  } else {
    lines.push(`- action: ${formatValue(lineage.operator_recommendation.action)}`);
    lines.push(`- urgency: ${formatValue(lineage.operator_recommendation.urgency)}`);
    lines.push(`- rationale: ${formatValue(lineage.operator_recommendation.rationale)}`);
    lines.push(`- source signals: ${formatValue(lineage.operator_recommendation.source_signals)}`);
    lines.push("");
  }

  lines.push("## Trend Summary");
  if (!lineage.trend_summary) {
    lines.push("- none", "");
  } else {
    lines.push(`- health direction: ${formatValue(lineage.trend_summary.health_direction)}`);
    lines.push(`- recommendation direction: ${formatValue(lineage.trend_summary.recommendation_direction)}`);
    lines.push(`- alert direction: ${formatValue(lineage.trend_summary.alert_direction)}`);
    lines.push(`- rationale: ${formatValue(lineage.trend_summary.rationale)}`);
    lines.push(`- source snapshots: ${formatValue(lineage.trend_summary.source_snapshots ? Object.entries(lineage.trend_summary.source_snapshots).map(([key, value]) => `${key}=${formatValue(value)}`) : null)}`);
    lines.push("");
  }

  lines.push("## Monitoring Policy");
  lines.push(`- critical fields: ${formatValue(lineage.monitoring_policy?.field_severity?.critical)}`);
  lines.push(`- warning fields: ${formatValue(lineage.monitoring_policy?.field_severity?.warning)}`);
  lines.push(`- max critical alerts: ${formatValue(lineage.monitoring_policy?.thresholds?.max_critical_alerts)}`);
  lines.push(`- max warning alerts: ${formatValue(lineage.monitoring_policy?.thresholds?.max_warning_alerts)}`);
  lines.push(`- allow recommendation worsened: ${formatValue(lineage.monitoring_policy?.thresholds?.allow_recommendation_worsened)}`);
  lines.push(`- require healthy for continue-monitoring: ${formatValue(lineage.monitoring_policy?.thresholds?.require_healthy_for_continue_monitoring)}`);
  lines.push("");

  lines.push("## Alerts");
  if (!Array.isArray(lineage.alerts) || lineage.alerts.length === 0) {
    lines.push("- none", "");
  } else {
    for (const alert of lineage.alerts) {
      lines.push(`- [${formatValue(alert.severity)}] ${formatValue(alert.code)}: ${formatValue(alert.message)}`);
    }
    lines.push("");
  }

  lines.push("## Threshold Breaches");
  if (!Array.isArray(lineage.threshold_breaches) || lineage.threshold_breaches.length === 0) {
    lines.push("- none", "");
  } else {
    for (const breach of lineage.threshold_breaches) {
      lines.push(`- [${formatValue(breach.severity)}] ${formatValue(breach.code)}: ${formatValue(breach.message)} (observed=${formatValue(breach.observed)}, threshold=${formatValue(breach.threshold)})`);
    }
    lines.push("");
  }

  lines.push("## Layer Snapshots");
  for (const [layer, snapshot] of Object.entries(lineage.summary?.layer_snapshots ?? {})) {
    lines.push(`- ${layer}: action=${formatValue(snapshot.latest_action)}, urgency=${formatValue(snapshot.latest_urgency)}, transition=${formatValue(snapshot.latest_transition)}, distinct_actions=${formatValue(snapshot.distinct_actions)}, previous_action=${formatValue(snapshot.previous_action)}`);
  }
  lines.push("");

  lines.push("## Timeline");
  for (const item of lineage.timeline ?? []) {
    lines.push(`- ${item.layer}: generated_at=${formatValue(item.generated_at)}, action=${formatValue(item.action)}, urgency=${formatValue(item.urgency)}`);
  }
  lines.push("");

  lines.push("## Sources");
  lines.push(`- history: ${formatValue(lineage.sources?.history)}`);
  lines.push(`- log: ${formatValue(lineage.sources?.log)}`);
  lines.push(`- index: ${formatValue(lineage.sources?.index)}`);
  lines.push("");

  return lines.join("\n");
}

export async function verifyLineageCommand(options) {
  if (!options.historyInput || !options.logInput || !options.indexInput) {
    throw new Error("Missing --history-input, --log-input, or --index-input for `verify-lineage`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-lineage`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const historyPath = await resolveBundlePath(options.historyInput).catch(() => path.resolve(options.historyInput));
  const logPath = await resolveBundlePath(options.logInput).catch(() => path.resolve(options.logInput));
  const indexPath = await resolveBundlePath(options.indexInput).catch(() => path.resolve(options.indexInput));

  const historyArtifact = await readJson(historyPath, "verification history artifact");
  const logArtifact = await readJson(logPath, "verification log artifact");
  const indexArtifact = await readJson(indexPath, "verification index artifact");

  const layerSnapshots = buildLayerSnapshots(historyArtifact, logArtifact, indexArtifact);
  const timeline = buildLineageTimeline(historyArtifact, logArtifact, indexArtifact);
  const summary = buildLineageSummary(historyArtifact, logArtifact, indexArtifact, layerSnapshots, timeline);
  const alerts = buildLineageAlerts(summary);
  const healthStatus = deriveLineageHealthStatus(alerts);
  const operatorRecommendation = deriveLineageOperatorRecommendation(summary, alerts, healthStatus);
  const trendSummary = buildLineageTrendSummary(summary, alerts, healthStatus);
  const monitoringPolicy = buildLineageMonitoringPolicy();

  const lineage = {
    artifact_type: "verification-lineage",
    generated_at: nowIso(),
    health_status: healthStatus,
    alerts,
    operator_recommendation: operatorRecommendation,
    trend_summary: trendSummary,
    monitoring_policy: monitoringPolicy,
    sources: {
      history: historyPath,
      log: logPath,
      index: indexPath
    },
    summary,
    timeline
  };
  const alertSeverityCounts = buildLineageAlertSeverityCounts(alerts);
  const thresholdBreaches = buildLineageThresholdBreaches(lineage, monitoringPolicy, alertSeverityCounts);
  lineage.threshold_status = thresholdBreaches.length > 0 ? "breached" : "within-threshold";
  lineage.threshold_breaches = thresholdBreaches;
  lineage.summary.alert_count = alerts.length;
  lineage.summary.alert_severity_counts = alertSeverityCounts;
  lineage.summary.threshold_breach_count = thresholdBreaches.length;

  const lineageJsonPath = await writeJsonArtifact(path.join(artifactDir, "verification-lineage.json"), lineage);
  const lineageReportPath = await writeTextArtifact(path.join(artifactDir, "verification-lineage.md"), formatLineageReport(lineage));

  return {
    ok: true,
    status: "completed",
    artifactDir,
    lineageJsonPath,
    lineageReportPath,
    currentAction: summary.current_action,
    currentTransition: summary.current_transition,
    healthStatus,
    thresholdStatus: lineage.threshold_status,
    operatorRecommendation: operatorRecommendation.action,
    distinctActions: summary.distinct_actions
  };
}
