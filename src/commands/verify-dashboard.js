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
  if (action === "investigate-lineage-drift") {
    return 4;
  }
  if (action === "verification-blocking") {
    return 4;
  }
  if (action === "provider-check-required") {
    return 3;
  }
  if (action === "investigate-drift") {
    return 2;
  }
  if (action === "continue-monitoring") {
    return 1;
  }
  return 0;
}

function combineHealthStatus(indexArtifact, lineageArtifact) {
  const candidates = [
    indexArtifact.health_status ?? "healthy",
    lineageArtifact.health_status ?? "healthy"
  ];
  return candidates.sort((left, right) => healthRank(right) - healthRank(left))[0] ?? "healthy";
}

function combineThresholdStatus(indexArtifact, lineageArtifact) {
  return indexArtifact.threshold_status === "breached" || lineageArtifact.threshold_status === "breached"
    ? "breached"
    : "within-threshold";
}

function buildCurrentState(historyArtifact, logArtifact, indexArtifact, lineageArtifact) {
  return {
    history: {
      latest_action: historyArtifact.summary?.recommendation?.latest_action ?? null,
      latest_urgency: historyArtifact.summary?.recommendation?.latest_urgency ?? null,
      latest_transition: historyArtifact.summary?.recommendation?.latest_transition ?? null
    },
    log: {
      latest_action: logArtifact.operator_recommendation?.action ?? null,
      latest_urgency: logArtifact.operator_recommendation?.urgency ?? null,
      latest_transition: logArtifact.recommendation_trend?.latest_transition ?? null
    },
    index: {
      health_status: indexArtifact.health_status ?? null,
      threshold_status: indexArtifact.threshold_status ?? null,
      latest_action: indexArtifact.operator_recommendation?.action ?? null,
      latest_urgency: indexArtifact.operator_recommendation?.urgency ?? null,
      latest_transition: indexArtifact.recommendation_summary?.latest_transition ?? null
    },
    lineage: {
      health_status: lineageArtifact.health_status ?? null,
      threshold_status: lineageArtifact.threshold_status ?? null,
      latest_action: lineageArtifact.operator_recommendation?.action ?? null,
      latest_urgency: lineageArtifact.operator_recommendation?.urgency ?? null,
      latest_transition: lineageArtifact.summary?.current_transition ?? null,
      recommendation_direction: lineageArtifact.trend_summary?.recommendation_direction ?? null
    }
  };
}

function buildDriftSummary(historyArtifact, indexArtifact, lineageArtifact) {
  return {
    history_drift_fields: historyArtifact.summary?.drift?.fields_with_drift ?? [],
    index_changed_fields: indexArtifact.summary?.latest_changed_fields ?? [],
    lineage_alert_codes: (lineageArtifact.alerts ?? []).map((alert) => alert.code),
    lineage_threshold_breach_codes: (lineageArtifact.threshold_breaches ?? []).map((breach) => breach.code)
  };
}

function buildAlerts(indexArtifact, lineageArtifact) {
  return [
    ...(indexArtifact.alerts ?? []).map((alert) => ({
      source: "index",
      ...alert
    })),
    ...(lineageArtifact.alerts ?? []).map((alert) => ({
      source: "lineage",
      ...alert
    }))
  ];
}

function buildThresholdBreaches(indexArtifact, lineageArtifact) {
  return [
    ...(indexArtifact.threshold_breaches ?? []).map((breach) => ({
      source: "index",
      ...breach
    })),
    ...(lineageArtifact.threshold_breaches ?? []).map((breach) => ({
      source: "lineage",
      ...breach
    }))
  ];
}

function deriveOverallOperatorRecommendation(overallHealthStatus, overallThresholdStatus, currentState, alerts, thresholdBreaches) {
  const sourceSignals = [
    ...(alerts ?? []).map((alert) => `${alert.source}:${alert.code}`),
    ...(thresholdBreaches ?? []).map((breach) => `${breach.source}:${breach.code}`)
  ];

  if (overallHealthStatus === "critical") {
    return {
      action: "human-review-recommended",
      urgency: "critical",
      rationale: "Critical verification health indicates the current operator state should not be trusted without human review.",
      source_signals: sourceSignals
    };
  }

  if (overallThresholdStatus === "breached") {
    const candidates = [
      currentState.index.latest_action,
      currentState.lineage.latest_action
    ].filter(Boolean);
    const chosen = candidates.sort((left, right) => recommendationRank(right) - recommendationRank(left))[0] ?? "investigate-drift";
    return {
      action: chosen,
      urgency: "warning",
      rationale: "At least one verification threshold is breached, so the dashboard escalates to the strongest current operator recommendation.",
      source_signals: sourceSignals
    };
  }

  if (overallHealthStatus === "warning" || overallHealthStatus === "info") {
    return {
      action: "investigate-drift",
      urgency: overallHealthStatus === "warning" ? "warning" : "info",
      rationale: "Verification health is degraded even though thresholds are not breached.",
      source_signals: sourceSignals
    };
  }

  return {
    action: "continue-monitoring",
    urgency: "healthy",
    rationale: "Verification state is healthy and within threshold.",
    source_signals: sourceSignals
  };
}

function formatDashboardReport(dashboard) {
  const lines = [
    "# Verification Dashboard Report",
    "",
    `- generated at: ${formatValue(dashboard.generated_at)}`,
    `- overall health status: ${formatValue(dashboard.overall_health_status)}`,
    `- overall threshold status: ${formatValue(dashboard.overall_threshold_status)}`,
    `- overall recommendation action: ${formatValue(dashboard.overall_operator_recommendation?.action)}`,
    `- overall recommendation urgency: ${formatValue(dashboard.overall_operator_recommendation?.urgency)}`,
    ""
  ];

  lines.push("## Overall Operator Recommendation");
  lines.push(`- action: ${formatValue(dashboard.overall_operator_recommendation?.action)}`);
  lines.push(`- urgency: ${formatValue(dashboard.overall_operator_recommendation?.urgency)}`);
  lines.push(`- rationale: ${formatValue(dashboard.overall_operator_recommendation?.rationale)}`);
  lines.push(`- source signals: ${formatValue(dashboard.overall_operator_recommendation?.source_signals)}`);
  lines.push("");

  lines.push("## Current State");
  for (const [layer, snapshot] of Object.entries(dashboard.current_state ?? {})) {
    lines.push(`- ${layer}: ${formatValue(Object.entries(snapshot ?? {}).map(([key, value]) => `${key}=${formatValue(value)}`))}`);
  }
  lines.push("");

  lines.push("## Drift Summary");
  lines.push(`- history drift fields: ${formatValue(dashboard.drift_summary?.history_drift_fields)}`);
  lines.push(`- index changed fields: ${formatValue(dashboard.drift_summary?.index_changed_fields)}`);
  lines.push(`- lineage alert codes: ${formatValue(dashboard.drift_summary?.lineage_alert_codes)}`);
  lines.push(`- lineage threshold breach codes: ${formatValue(dashboard.drift_summary?.lineage_threshold_breach_codes)}`);
  lines.push("");

  lines.push("## Alerts");
  if (!Array.isArray(dashboard.alerts) || dashboard.alerts.length === 0) {
    lines.push("- none");
  } else {
    for (const alert of dashboard.alerts) {
      lines.push(`- [${formatValue(alert.severity)}] ${formatValue(alert.source)}:${formatValue(alert.code)}: ${formatValue(alert.message)}`);
    }
  }
  lines.push("");

  lines.push("## Threshold Breaches");
  if (!Array.isArray(dashboard.threshold_breaches) || dashboard.threshold_breaches.length === 0) {
    lines.push("- none");
  } else {
    for (const breach of dashboard.threshold_breaches) {
      lines.push(`- [${formatValue(breach.severity)}] ${formatValue(breach.source)}:${formatValue(breach.code)}: ${formatValue(breach.message)} (observed=${formatValue(breach.observed)}, threshold=${formatValue(breach.threshold)})`);
    }
  }
  lines.push("");

  lines.push("## Source Artifacts");
  lines.push(`- history: ${formatValue(dashboard.source_artifacts?.history)}`);
  lines.push(`- log: ${formatValue(dashboard.source_artifacts?.log)}`);
  lines.push(`- index: ${formatValue(dashboard.source_artifacts?.index)}`);
  lines.push(`- lineage: ${formatValue(dashboard.source_artifacts?.lineage)}`);
  lines.push("");

  return lines.join("\n");
}

export async function verifyDashboardCommand(options) {
  if (!options.historyInput || !options.logInput || !options.indexInput || !options.lineageInput) {
    throw new Error("Missing --history-input, --log-input, --index-input, or --lineage-input for `verify-dashboard`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-dashboard`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const historyPath = await resolveBundlePath(options.historyInput).catch(() => path.resolve(options.historyInput));
  const logPath = await resolveBundlePath(options.logInput).catch(() => path.resolve(options.logInput));
  const indexPath = await resolveBundlePath(options.indexInput).catch(() => path.resolve(options.indexInput));
  const lineagePath = await resolveBundlePath(options.lineageInput).catch(() => path.resolve(options.lineageInput));

  const historyArtifact = await readJson(historyPath, "verification history artifact");
  const logArtifact = await readJson(logPath, "verification log artifact");
  const indexArtifact = await readJson(indexPath, "verification index artifact");
  const lineageArtifact = await readJson(lineagePath, "verification lineage artifact");

  const currentState = buildCurrentState(historyArtifact, logArtifact, indexArtifact, lineageArtifact);
  const driftSummary = buildDriftSummary(historyArtifact, indexArtifact, lineageArtifact);
  const alerts = buildAlerts(indexArtifact, lineageArtifact);
  const thresholdBreaches = buildThresholdBreaches(indexArtifact, lineageArtifact);
  const overallHealthStatus = combineHealthStatus(indexArtifact, lineageArtifact);
  const overallThresholdStatus = combineThresholdStatus(indexArtifact, lineageArtifact);
  const overallOperatorRecommendation = deriveOverallOperatorRecommendation(
    overallHealthStatus,
    overallThresholdStatus,
    currentState,
    alerts,
    thresholdBreaches
  );

  const dashboard = {
    artifact_type: "verification-dashboard",
    generated_at: nowIso(),
    overall_health_status: overallHealthStatus,
    overall_threshold_status: overallThresholdStatus,
    overall_operator_recommendation: overallOperatorRecommendation,
    source_artifacts: {
      history: historyPath,
      log: logPath,
      index: indexPath,
      lineage: lineagePath
    },
    current_state: currentState,
    drift_summary: driftSummary,
    alerts,
    threshold_breaches: thresholdBreaches
  };

  const dashboardJsonPath = await writeJsonArtifact(path.join(artifactDir, "verification-dashboard.json"), dashboard);
  const dashboardReportPath = await writeTextArtifact(path.join(artifactDir, "verification-dashboard.md"), formatDashboardReport(dashboard));

  return {
    ok: true,
    status: "completed",
    artifactDir,
    dashboardJsonPath,
    dashboardReportPath,
    overallHealthStatus,
    overallThresholdStatus,
    overallOperatorRecommendation: overallOperatorRecommendation.action
  };
}
