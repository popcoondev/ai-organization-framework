import path from "node:path";
import { nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";
import {
  buildHistorySummary,
  formatHistoryReport,
  readJson,
  resolveBundlePath,
  summarizeBundle
} from "./verify-history.js";

function dedupeEntries(entries) {
  const seen = new Set();
  const result = [];

  for (const entry of entries) {
    const key = entry.bundle_path;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }

  return result;
}

function buildLog(logEntries, inputs) {
  const summary = buildHistorySummary(logEntries);
  const latestTimestamp = logEntries.length > 0
    ? logEntries
        .map((entry) => entry.generated_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null
    : null;

  return {
    artifact_type: "verification-log",
    generated_at: nowIso(),
    latest_timestamp: latestTimestamp,
    updated_from_inputs: inputs,
    entry_count: logEntries.length,
    summary,
    entries: logEntries
  };
}

function healthRank(healthStatus) {
  if (healthStatus === "critical") {
    return 3;
  }
  if (healthStatus === "warning") {
    return 2;
  }
  if (healthStatus === "info") {
    return 1;
  }
  return 0;
}

function buildMonitoringPolicy() {
  return {
    field_severity: {
      critical: [
        "provider",
        "model",
        "workflow_id",
        "happy_path_approval_status"
      ],
      warning: [
        "routing_mode",
        "verification_recommendation_action",
        "verification_recommendation_urgency",
        "signal_reopen_status",
        "escalation_reopen_status",
        "escalation_approve_status",
        "escalation_stop_status"
      ],
      info: [
        "observed_provider_stage_count"
      ]
    },
    thresholds: {
      max_critical_alerts: 0,
      max_warning_alerts: 1,
      require_latest_run_completed: true,
      require_latest_happy_path_approved: true,
      min_observed_provider_stages_non_mock: 1
    }
  };
}

function severityRank(severity) {
  if (severity === "critical") {
    return 3;
  }
  if (severity === "warning") {
    return 2;
  }
  if (severity === "info") {
    return 1;
  }
  return 0;
}

function pickHigherSeverity(left, right) {
  return severityRank(left) >= severityRank(right) ? left : right;
}

function severityForFields(fields, monitoringPolicy, fallbackSeverity = "info") {
  let severity = fallbackSeverity;
  const bySeverity = monitoringPolicy.field_severity ?? {};

  for (const field of fields) {
    for (const [candidateSeverity, watchedFields] of Object.entries(bySeverity)) {
      if (Array.isArray(watchedFields) && watchedFields.includes(field)) {
        severity = pickHigherSeverity(severity, candidateSeverity);
      }
    }
  }

  return severity;
}

function buildAlerts(logArtifact, latestEntry, monitoringPolicy) {
  const summary = logArtifact.summary ?? {};
  const driftFields = summary.drift?.fields_with_drift ?? [];
  const latestChangedFields = summary.latest_comparison?.changed_fields ?? [];
  const statuses = summary.statuses ?? {};
  const alerts = [];

  if (!latestEntry) {
    alerts.push({
      code: "no-latest-entry",
      severity: "critical",
      message: "No verification entries are available in the current index."
    });
  }

  if (latestEntry && latestEntry.branch_outcomes?.happy_path?.approval_status !== "approved") {
    alerts.push({
      code: "latest-happy-path-not-approved",
      severity: "critical",
      message: `Latest happy-path approval status is ${latestEntry.branch_outcomes?.happy_path?.approval_status ?? "unknown"}.`
    });
  }

  const nonCompletedStatuses = Object.entries(statuses)
    .filter(([status, count]) => status !== "completed" && Number(count) > 0)
    .map(([status]) => status);
  if (nonCompletedStatuses.length > 0) {
    alerts.push({
      code: "non-completed-runs-present",
      severity: "warning",
      message: `Verification history contains non-completed runs: ${nonCompletedStatuses.join(", ")}.`
    });
  }

  if (driftFields.length > 0) {
    const severity = severityForFields(driftFields, monitoringPolicy, "warning");
    alerts.push({
      code: "verification-drift-detected",
      severity,
      fields: driftFields,
      message: `Verification drift detected across accumulated runs: ${driftFields.join(", ")}.`
    });
  }

  if (latestChangedFields.length > 0) {
    const severity = severityForFields(latestChangedFields, monitoringPolicy, "info");
    alerts.push({
      code: "latest-comparison-changes-detected",
      severity,
      fields: latestChangedFields,
      message: `Latest comparison changed fields: ${latestChangedFields.join(", ")}.`
    });
  }

  if (latestEntry && latestEntry.provider !== "mock" && (latestEntry.provider_observability?.observed_stage_count ?? 0) === 0) {
    alerts.push({
      code: "missing-provider-observability",
      severity: "warning",
      message: "Latest verification did not capture provider observability metadata."
    });
  }

  return alerts;
}

function deriveHealthStatus(alerts) {
  if (alerts.some((alert) => alert.severity === "critical")) {
    return "critical";
  }
  if (alerts.some((alert) => alert.severity === "warning")) {
    return "warning";
  }
  if (alerts.some((alert) => alert.severity === "info")) {
    return "info";
  }
  return "healthy";
}

function buildAlertSeverityCounts(alerts) {
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

function buildThresholdBreachSeverityCounts(breaches) {
  return breaches.reduce((counts, breach) => {
    const key = breach.severity ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {
    critical: 0,
    warning: 0,
    info: 0
  });
}

function buildThresholdBreaches(latestEntry, monitoringPolicy, alertSeverityCounts) {
  const thresholds = monitoringPolicy.thresholds ?? {};
  const breaches = [];

  if ((alertSeverityCounts.critical ?? 0) > (thresholds.max_critical_alerts ?? 0)) {
    breaches.push({
      code: "critical-alert-threshold-exceeded",
      severity: "critical",
      threshold: thresholds.max_critical_alerts ?? 0,
      observed: alertSeverityCounts.critical ?? 0,
      message: `Critical alert count exceeded threshold: observed=${alertSeverityCounts.critical ?? 0}, threshold=${thresholds.max_critical_alerts ?? 0}.`
    });
  }

  if ((alertSeverityCounts.warning ?? 0) > (thresholds.max_warning_alerts ?? 0)) {
    breaches.push({
      code: "warning-alert-threshold-exceeded",
      severity: "warning",
      threshold: thresholds.max_warning_alerts ?? 0,
      observed: alertSeverityCounts.warning ?? 0,
      message: `Warning alert count exceeded threshold: observed=${alertSeverityCounts.warning ?? 0}, threshold=${thresholds.max_warning_alerts ?? 0}.`
    });
  }

  if (latestEntry && thresholds.require_latest_run_completed && latestEntry.status !== "completed") {
    breaches.push({
      code: "latest-run-not-completed",
      severity: "warning",
      threshold: "completed",
      observed: latestEntry.status ?? null,
      message: `Latest verification run is not completed: observed=${latestEntry.status ?? "unknown"}.`
    });
  }

  if (latestEntry && thresholds.require_latest_happy_path_approved && latestEntry.branch_outcomes?.happy_path?.approval_status !== "approved") {
    breaches.push({
      code: "latest-happy-path-approval-required",
      severity: "critical",
      threshold: "approved",
      observed: latestEntry.branch_outcomes?.happy_path?.approval_status ?? null,
      message: `Latest happy-path approval status did not meet the required threshold: observed=${latestEntry.branch_outcomes?.happy_path?.approval_status ?? "unknown"}.`
    });
  }

  if (
    latestEntry &&
    latestEntry.provider !== "mock" &&
    (latestEntry.provider_observability?.observed_stage_count ?? 0) < (thresholds.min_observed_provider_stages_non_mock ?? 0)
  ) {
    breaches.push({
      code: "provider-observability-threshold-not-met",
      severity: "warning",
      threshold: thresholds.min_observed_provider_stages_non_mock ?? 0,
      observed: latestEntry.provider_observability?.observed_stage_count ?? 0,
      message: `Observed provider stages did not meet the required threshold: observed=${latestEntry.provider_observability?.observed_stage_count ?? 0}, threshold=${thresholds.min_observed_provider_stages_non_mock ?? 0}.`
    });
  }

  return breaches;
}

function buildIndex(logArtifact) {
  const latestEntry = logArtifact.entries.at(-1) ?? null;
  const monitoringPolicy = buildMonitoringPolicy();
  const alerts = buildAlerts(logArtifact, latestEntry, monitoringPolicy);
  const alertSeverityCounts = buildAlertSeverityCounts(alerts);
  const thresholdBreaches = buildThresholdBreaches(latestEntry, monitoringPolicy, alertSeverityCounts);
  const thresholdBreachSeverityCounts = buildThresholdBreachSeverityCounts(thresholdBreaches);
  const thresholdStatus = thresholdBreaches.length > 0 ? "breached" : "within-threshold";
  const healthStatus = thresholdBreaches.length > 0
    ? deriveHealthStatus(thresholdBreaches)
    : deriveHealthStatus(alerts);

  return {
    artifact_type: "verification-index",
    generated_at: nowIso(),
    source_log_generated_at: logArtifact.generated_at,
    source_log_path: "verification-log.json",
    entry_count: logArtifact.entry_count,
    latest_timestamp: logArtifact.latest_timestamp,
    health_status: healthStatus,
    threshold_status: thresholdStatus,
    monitoring_policy: monitoringPolicy,
    alerts,
    threshold_breaches: thresholdBreaches,
    summary: {
      providers: logArtifact.summary.providers,
      workflows: logArtifact.summary.workflows,
      statuses: logArtifact.summary.statuses,
      drift_fields: logArtifact.summary.drift?.fields_with_drift ?? [],
      latest_changed_fields: logArtifact.summary.latest_comparison?.changed_fields ?? [],
      alert_count: alerts.length,
      alert_severity_counts: alertSeverityCounts,
      threshold_breach_count: thresholdBreaches.length,
      threshold_breach_severity_counts: thresholdBreachSeverityCounts
    },
    latest_entry: latestEntry
      ? {
          generated_at: latestEntry.generated_at,
          bundle_path: latestEntry.bundle_path,
          status: latestEntry.status,
          request: latestEntry.request,
          provider: latestEntry.provider,
          model: latestEntry.model,
          routing_mode: latestEntry.routing_mode,
          workflow: latestEntry.workflow,
          governance: latestEntry.governance,
          happy_path_approval_status: latestEntry.branch_outcomes?.happy_path?.approval_status ?? null,
          signal_reopen_status: latestEntry.branch_outcomes?.signal_reopen?.reopen_status ?? null,
          escalation_reopen_status: latestEntry.branch_outcomes?.escalation_reopen?.resolution_status ?? null,
          escalation_approve_status: latestEntry.branch_outcomes?.escalation_approve?.resolution_status ?? null,
          escalation_stop_status: latestEntry.branch_outcomes?.escalation_stop?.resolution_status ?? null,
          observed_provider_stage_count: latestEntry.provider_observability?.observed_stage_count ?? 0
        }
      : null
  };
}

function buildThresholdTrend(logEntries, inputs) {
  const timeline = [];

  for (let index = 0; index < logEntries.length; index += 1) {
    const prefixEntries = logEntries.slice(0, index + 1);
    const prefixLog = buildLog(prefixEntries, inputs);
    const prefixIndex = buildIndex(prefixLog);
    const severityCounts = prefixIndex.summary?.threshold_breach_severity_counts ?? {};
    const dominantSeverity = severityCounts.critical > 0
      ? "critical"
      : severityCounts.warning > 0
        ? "warning"
        : severityCounts.info > 0
          ? "info"
          : "healthy";

    timeline.push({
      entry_index: index,
      source_generated_at: prefixEntries.at(-1)?.generated_at ?? null,
      source_bundle_path: prefixEntries.at(-1)?.bundle_path ?? null,
      health_status: prefixIndex.health_status,
      threshold_status: prefixIndex.threshold_status,
      threshold_breach_count: prefixIndex.summary?.threshold_breach_count ?? 0,
      dominant_severity: dominantSeverity
    });
  }

  const breachedTimeline = timeline.filter((entry) => entry.threshold_status === "breached");
  const latest = timeline.at(-1) ?? null;
  const previous = timeline.length > 1 ? timeline.at(-2) : null;

  let latestTrend = "initial";
  if (latest && previous) {
    const latestHealthRank = healthRank(latest.health_status);
    const previousHealthRank = healthRank(previous.health_status);
    if (
      latest.threshold_status === "breached" &&
      previous.threshold_status !== "breached"
    ) {
      latestTrend = "worsened";
    } else if (
      latest.threshold_status !== "breached" &&
      previous.threshold_status === "breached"
    ) {
      latestTrend = "improved";
    } else if (
      latest.threshold_breach_count > previous.threshold_breach_count ||
      latestHealthRank > previousHealthRank
    ) {
      latestTrend = "worsened";
    } else if (
      latest.threshold_breach_count < previous.threshold_breach_count ||
      latestHealthRank < previousHealthRank
    ) {
      latestTrend = "improved";
    } else {
      latestTrend = "stable";
    }
  }

  let consecutiveBreachedRunCount = 0;
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    if (timeline[index].threshold_status === "breached") {
      consecutiveBreachedRunCount += 1;
    } else {
      break;
    }
  }

  return {
    timeline,
    first_breach_generated_at: breachedTimeline.at(0)?.source_generated_at ?? null,
    latest_breach_generated_at: breachedTimeline.at(-1)?.source_generated_at ?? null,
    consecutive_breached_run_count: consecutiveBreachedRunCount,
    latest_trend: latestTrend
  };
}

function deriveOperatorRecommendation(indexArtifact, thresholdTrend) {
  const thresholdBreaches = indexArtifact.threshold_breaches ?? [];
  const alerts = indexArtifact.alerts ?? [];
  const latestTrend = thresholdTrend?.latest_trend ?? "initial";
  const sourceSignals = [];

  const breachCodes = thresholdBreaches.map((breach) => breach.code);
  const alertCodes = alerts.map((alert) => alert.code);
  sourceSignals.push(...breachCodes, ...alertCodes);

  if (breachCodes.includes("latest-happy-path-approval-required") || breachCodes.includes("critical-alert-threshold-exceeded")) {
    return {
      action: "human-review-recommended",
      urgency: "critical",
      rationale: "Critical threshold breaches require human review before treating verification as operationally acceptable.",
      source_signals: sourceSignals
    };
  }

  if (breachCodes.includes("provider-observability-threshold-not-met")) {
    return {
      action: "provider-check-required",
      urgency: "warning",
      rationale: "Provider observability fell below the configured threshold, so provider connectivity or response instrumentation should be checked.",
      source_signals: sourceSignals
    };
  }

  if (indexArtifact.threshold_status === "breached" && latestTrend === "worsened") {
    return {
      action: "investigate-drift",
      urgency: "warning",
      rationale: "Threshold breaches have worsened relative to the previous verification run and should be investigated.",
      source_signals: sourceSignals
    };
  }

  if (indexArtifact.threshold_status === "breached") {
    return {
      action: "human-review-recommended",
      urgency: "warning",
      rationale: "Threshold breaches remain present and should be reviewed before relying on the latest verification state.",
      source_signals: sourceSignals
    };
  }

  if (indexArtifact.health_status !== "healthy") {
    return {
      action: "continue-monitoring",
      urgency: "info",
      rationale: "No threshold breach is active, but verification drift or informational changes should continue to be monitored.",
      source_signals: sourceSignals
    };
  }

  return {
    action: "continue-monitoring",
    urgency: "healthy",
    rationale: "No active threshold breaches or operationally concerning alerts were detected.",
    source_signals: sourceSignals
  };
}

function recommendationRank(action) {
  if (action === "verification-blocking" || action === "human-review-recommended") {
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

function buildRecommendationTrend(logEntries, inputs) {
  const timeline = [];

  for (let index = 0; index < logEntries.length; index += 1) {
    const prefixEntries = logEntries.slice(0, index + 1);
    const prefixLog = buildLog(prefixEntries, inputs);
    prefixLog.threshold_trend = buildThresholdTrend(prefixEntries, inputs);
    const prefixIndex = buildIndex(prefixLog);
    const recommendation = deriveOperatorRecommendation(prefixIndex, prefixLog.threshold_trend);

    timeline.push({
      entry_index: index,
      source_generated_at: prefixEntries.at(-1)?.generated_at ?? null,
      source_bundle_path: prefixEntries.at(-1)?.bundle_path ?? null,
      action: recommendation.action,
      urgency: recommendation.urgency,
      rationale: recommendation.rationale
    });
  }

  const firstNonMonitoring = timeline.find((item) => item.action !== "continue-monitoring") ?? null;
  const latest = timeline.at(-1) ?? null;
  const previous = timeline.length > 1 ? timeline.at(-2) : null;

  let latestTransition = "initial";
  if (latest && previous) {
    const latestRank = recommendationRank(latest.action);
    const previousRank = recommendationRank(previous.action);
    if (latest.action === previous.action) {
      latestTransition = "stable";
    } else if (latestRank > previousRank) {
      latestTransition = "escalated";
    } else if (latestRank < previousRank) {
      latestTransition = "de-escalated";
    } else {
      latestTransition = "changed";
    }
  }

  let consecutiveIdenticalRecommendationCount = 0;
  if (latest) {
    for (let index = timeline.length - 1; index >= 0; index -= 1) {
      if (timeline[index].action === latest.action) {
        consecutiveIdenticalRecommendationCount += 1;
      } else {
        break;
      }
    }
  }

  return {
    timeline,
    first_non_monitoring_generated_at: firstNonMonitoring?.source_generated_at ?? null,
    latest_action: latest?.action ?? null,
    latest_urgency: latest?.urgency ?? null,
    latest_transition: latestTransition,
    consecutive_identical_recommendation_count: consecutiveIdenticalRecommendationCount
  };
}

function summarizeRecommendationTrend(recommendationTrend) {
  const timeline = Array.isArray(recommendationTrend?.timeline) ? recommendationTrend.timeline : [];
  const latest = timeline.at(-1) ?? null;
  const previous = timeline.length > 1 ? timeline.at(-2) : null;

  return {
    first_non_monitoring_generated_at: recommendationTrend?.first_non_monitoring_generated_at ?? null,
    latest_action: recommendationTrend?.latest_action ?? null,
    latest_urgency: recommendationTrend?.latest_urgency ?? null,
    latest_transition: recommendationTrend?.latest_transition ?? null,
    previous_action: previous?.action ?? null,
    previous_urgency: previous?.urgency ?? null,
    latest_generated_at: latest?.source_generated_at ?? null,
    consecutive_identical_recommendation_count: recommendationTrend?.consecutive_identical_recommendation_count ?? 0
  };
}

function formatLogReport(logArtifact) {
  const historyShape = {
    generated_at: logArtifact.generated_at,
    entry_count: logArtifact.entry_count,
    summary: logArtifact.summary,
    sources: logArtifact.updated_from_inputs,
    entries: logArtifact.entries
  };

  const body = formatHistoryReport(historyShape);
  const headerAdjusted = body.replace(/^# Verification History Report/m, "# Verification Log Report");
  const thresholdTrend = logArtifact.threshold_trend;
  const operatorRecommendation = logArtifact.operator_recommendation;
  const recommendationTrend = logArtifact.recommendation_trend;

  const lines = [headerAdjusted.trimEnd(), "", "## Operator Recommendation"];
  if (!operatorRecommendation) {
    lines.push("- none", "");
  } else {
    lines.push(`- action: ${operatorRecommendation.action ?? "-"}`);
    lines.push(`- urgency: ${operatorRecommendation.urgency ?? "-"}`);
    lines.push(`- rationale: ${operatorRecommendation.rationale ?? "-"}`);
    lines.push(`- source signals: ${(operatorRecommendation.source_signals ?? []).join(", ") || "-"}`);
    lines.push("");
  }

  lines.push("## Recommendation Trend");
  if (!recommendationTrend || !Array.isArray(recommendationTrend.timeline) || recommendationTrend.timeline.length === 0) {
    lines.push("- none", "");
  } else {
    lines.push(`- first non-monitoring generated at: ${recommendationTrend.first_non_monitoring_generated_at ?? "-"}`);
    lines.push(`- latest action: ${recommendationTrend.latest_action ?? "-"}`);
    lines.push(`- latest urgency: ${recommendationTrend.latest_urgency ?? "-"}`);
    lines.push(`- latest transition: ${recommendationTrend.latest_transition ?? "-"}`);
    lines.push(`- consecutive identical recommendation count: ${recommendationTrend.consecutive_identical_recommendation_count ?? 0}`);
    lines.push("");
    for (const item of recommendationTrend.timeline) {
      lines.push(
        `- [${item.entry_index}] generated_at=${item.source_generated_at ?? "-"}, action=${item.action ?? "-"}, urgency=${item.urgency ?? "-"}`
      );
    }
    lines.push("");
  }

  lines.push("## Threshold Trend");
  if (!thresholdTrend || !Array.isArray(thresholdTrend.timeline) || thresholdTrend.timeline.length === 0) {
    lines.push("- none", "");
    return lines.join("\n");
  }

  lines.push(`- first breach generated at: ${thresholdTrend.first_breach_generated_at ?? "-"}`);
  lines.push(`- latest breach generated at: ${thresholdTrend.latest_breach_generated_at ?? "-"}`);
  lines.push(`- consecutive breached run count: ${thresholdTrend.consecutive_breached_run_count ?? 0}`);
  lines.push(`- latest trend: ${thresholdTrend.latest_trend ?? "-"}`);
  lines.push("");

  for (const item of thresholdTrend.timeline) {
    lines.push(
      `- [${item.entry_index}] generated_at=${item.source_generated_at ?? "-"}, threshold_status=${item.threshold_status ?? "-"}, threshold_breach_count=${item.threshold_breach_count ?? 0}, health_status=${item.health_status ?? "-"}, dominant_severity=${item.dominant_severity ?? "-"}`
    );
  }
  lines.push("");

  return lines.join("\n");
}

function formatIndexReport(indexArtifact) {
  const latest = indexArtifact.latest_entry;
  const summary = indexArtifact.summary ?? {};
  const monitoringPolicy = indexArtifact.monitoring_policy ?? {};
  const alertSeverityCounts = summary.alert_severity_counts ?? {};
  const thresholdBreachSeverityCounts = summary.threshold_breach_severity_counts ?? {};
  const operatorRecommendation = indexArtifact.operator_recommendation;
  const recommendationSummary = indexArtifact.recommendation_summary;
  const lines = [
    "# Verification Index Report",
    "",
    `- generated at: ${indexArtifact.generated_at ?? "-"}`,
    `- source log generated at: ${indexArtifact.source_log_generated_at ?? "-"}`,
    `- entry count: ${indexArtifact.entry_count ?? 0}`,
    `- latest timestamp: ${indexArtifact.latest_timestamp ?? "-"}`,
    `- health status: ${indexArtifact.health_status ?? "-"}`,
    `- threshold status: ${indexArtifact.threshold_status ?? "-"}`,
    `- providers: ${(summary.providers ?? []).join(", ") || "-"}`,
    `- workflows: ${(summary.workflows ?? []).join(", ") || "-"}`,
    `- drift fields: ${(summary.drift_fields ?? []).join(", ") || "-"}`,
    `- latest changed fields: ${(summary.latest_changed_fields ?? []).join(", ") || "-"}`,
    `- alert count: ${summary.alert_count ?? 0}`,
    `- alert severity counts: critical=${alertSeverityCounts.critical ?? 0}, warning=${alertSeverityCounts.warning ?? 0}, info=${alertSeverityCounts.info ?? 0}`,
    `- threshold breach count: ${summary.threshold_breach_count ?? 0}`,
    `- threshold breach severity counts: critical=${thresholdBreachSeverityCounts.critical ?? 0}, warning=${thresholdBreachSeverityCounts.warning ?? 0}, info=${thresholdBreachSeverityCounts.info ?? 0}`,
    "",
    "## Operator Recommendation"
  ];

  if (!operatorRecommendation) {
    lines.push("- none", "");
  } else {
    lines.push(`- action: ${operatorRecommendation.action ?? "-"}`);
    lines.push(`- urgency: ${operatorRecommendation.urgency ?? "-"}`);
    lines.push(`- rationale: ${operatorRecommendation.rationale ?? "-"}`);
    lines.push(`- source signals: ${(operatorRecommendation.source_signals ?? []).join(", ") || "-"}`);
    lines.push("");
  }

  lines.push("## Recommendation Summary");
  if (!recommendationSummary) {
    lines.push("- none", "");
  } else {
    lines.push(`- first non-monitoring generated at: ${recommendationSummary.first_non_monitoring_generated_at ?? "-"}`);
    lines.push(`- latest action: ${recommendationSummary.latest_action ?? "-"}`);
    lines.push(`- latest urgency: ${recommendationSummary.latest_urgency ?? "-"}`);
    lines.push(`- latest transition: ${recommendationSummary.latest_transition ?? "-"}`);
    lines.push(`- previous action: ${recommendationSummary.previous_action ?? "-"}`);
    lines.push(`- previous urgency: ${recommendationSummary.previous_urgency ?? "-"}`);
    lines.push(`- latest generated at: ${recommendationSummary.latest_generated_at ?? "-"}`);
    lines.push(`- consecutive identical recommendation count: ${recommendationSummary.consecutive_identical_recommendation_count ?? 0}`);
    lines.push("");
  }

  lines.push(
    "## Monitoring Policy"
  );

  const fieldSeverity = monitoringPolicy.field_severity ?? {};
  const criticalFields = fieldSeverity.critical ?? [];
  const warningFields = fieldSeverity.warning ?? [];
  const infoFields = fieldSeverity.info ?? [];
  lines.push(`- critical fields: ${criticalFields.join(", ") || "-"}`);
  lines.push(`- warning fields: ${warningFields.join(", ") || "-"}`);
  lines.push(`- info fields: ${infoFields.join(", ") || "-"}`);
  lines.push(`- max critical alerts: ${monitoringPolicy.thresholds?.max_critical_alerts ?? "-"}`);
  lines.push(`- max warning alerts: ${monitoringPolicy.thresholds?.max_warning_alerts ?? "-"}`);
  lines.push(`- require latest run completed: ${monitoringPolicy.thresholds?.require_latest_run_completed ?? "-"}`);
  lines.push(`- require latest happy-path approved: ${monitoringPolicy.thresholds?.require_latest_happy_path_approved ?? "-"}`);
  lines.push(`- min observed provider stages (non-mock): ${monitoringPolicy.thresholds?.min_observed_provider_stages_non_mock ?? "-"}`);
  lines.push("");

  lines.push(
    "## Alerts"
  );

  if (!Array.isArray(indexArtifact.alerts) || indexArtifact.alerts.length === 0) {
    lines.push("- none", "");
  } else {
    for (const alert of indexArtifact.alerts) {
      lines.push(`- [${alert.severity ?? "unknown"}] ${alert.code ?? "unknown"}: ${alert.message ?? "-"}`);
    }
    lines.push("");
  }

  lines.push(
    "## Threshold Breaches"
  );

  if (!Array.isArray(indexArtifact.threshold_breaches) || indexArtifact.threshold_breaches.length === 0) {
    lines.push("- none", "");
  } else {
    for (const breach of indexArtifact.threshold_breaches) {
      lines.push(`- [${breach.severity ?? "unknown"}] ${breach.code ?? "unknown"}: ${breach.message ?? "-"} (observed=${breach.observed ?? "-"}, threshold=${breach.threshold ?? "-"})`);
    }
    lines.push("");
  }

  lines.push(
    "## Latest Entry"
  );

  if (!latest) {
    lines.push("- none", "");
    return lines.join("\n");
  }

  lines.push(`- generated at: ${latest.generated_at ?? "-"}`);
  lines.push(`- bundle path: ${latest.bundle_path ?? "-"}`);
  lines.push(`- status: ${latest.status ?? "-"}`);
  lines.push(`- request: ${latest.request ?? "-"}`);
  lines.push(`- provider/model: ${latest.provider ?? "-"} / ${latest.model ?? "-"}`);
  lines.push(`- routing mode: ${latest.routing_mode ?? "-"}`);
  lines.push(`- workflow: ${latest.workflow?.workflow_id ?? "-"} (${latest.workflow?.name ?? "-"})`);
  lines.push(`- governance: ${latest.governance?.model ?? "-"} / escalation target=${latest.governance?.escalation_target ?? "-"}`);
  lines.push(`- happy path approval: ${latest.happy_path_approval_status ?? "-"}`);
  lines.push(`- signal reopen: ${latest.signal_reopen_status ?? "-"}`);
  lines.push(`- escalation reopen: ${latest.escalation_reopen_status ?? "-"}`);
  lines.push(`- escalation approve: ${latest.escalation_approve_status ?? "-"}`);
  lines.push(`- escalation stop: ${latest.escalation_stop_status ?? "-"}`);
  lines.push(`- observed provider stages: ${latest.observed_provider_stage_count ?? 0}`);
  lines.push("");

  return lines.join("\n");
}

export async function verifyLogCommand(options) {
  if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
    throw new Error("At least one --input is required for `verify-log`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-log`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const logJsonPath = path.join(artifactDir, "verification-log.json");
  const logReportPath = path.join(artifactDir, "verification-log.md");

  let existingEntries = [];
  try {
    const existingLog = await readJson(logJsonPath, "verification log");
    existingEntries = Array.isArray(existingLog.entries) ? existingLog.entries : [];
  } catch (error) {
    if (!(error instanceof Error) || !/ENOENT/.test(error.message)) {
      throw error;
    }
  }

  const newEntries = [];
  const resolvedInputs = [];
  for (const input of options.inputs) {
    const bundlePath = await resolveBundlePath(input);
    const bundle = await readJson(bundlePath, "verification bundle");
    newEntries.push(summarizeBundle(bundle, bundlePath, path.resolve(input)));
    resolvedInputs.push(path.resolve(input));
  }

  const entries = dedupeEntries([...existingEntries, ...newEntries]);
  const logArtifact = buildLog(entries, resolvedInputs);
  logArtifact.threshold_trend = buildThresholdTrend(entries, resolvedInputs);
  const recommendationTrend = buildRecommendationTrend(entries, resolvedInputs);
  const indexArtifact = buildIndex(logArtifact);
  const operatorRecommendation = deriveOperatorRecommendation(indexArtifact, logArtifact.threshold_trend);
  logArtifact.operator_recommendation = operatorRecommendation;
  logArtifact.recommendation_trend = recommendationTrend;
  indexArtifact.operator_recommendation = operatorRecommendation;
  indexArtifact.recommendation_summary = summarizeRecommendationTrend(recommendationTrend);
  const writtenLogJsonPath = await writeJsonArtifact(logJsonPath, logArtifact);
  const writtenLogReportPath = await writeTextArtifact(logReportPath, formatLogReport(logArtifact));
  const indexJsonPath = await writeJsonArtifact(path.join(artifactDir, "verification-index.json"), indexArtifact);
  const indexReportPath = await writeTextArtifact(path.join(artifactDir, "verification-index.md"), formatIndexReport(indexArtifact));

  return {
    ok: true,
    status: "completed",
    artifactDir,
    logJsonPath: writtenLogJsonPath,
    logReportPath: writtenLogReportPath,
    indexJsonPath,
    indexReportPath,
    entryCount: logArtifact.entry_count,
    latestTimestamp: logArtifact.latest_timestamp,
    providers: logArtifact.summary.providers,
    workflows: logArtifact.summary.workflows
  };
}
