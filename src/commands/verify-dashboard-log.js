import fs from "node:fs/promises";
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

function dedupeEntries(entries) {
  const seen = new Set();
  const result = [];

  for (const entry of entries) {
    const key = entry.dashboard_path;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }

  return result;
}

async function resolveDashboardPath(inputPath) {
  const resolvedPath = path.resolve(inputPath);
  const stat = await fs.stat(resolvedPath);
  if (stat.isDirectory()) {
    return path.join(resolvedPath, "verification-dashboard.json");
  }
  return resolvedPath;
}

function summarizeDashboard(dashboard, dashboardPath, sourceInput) {
  return {
    source_input: sourceInput,
    dashboard_path: dashboardPath,
    generated_at: dashboard.generated_at ?? null,
    overall_health_status: dashboard.overall_health_status ?? null,
    overall_threshold_status: dashboard.overall_threshold_status ?? null,
    overall_operator_recommendation: dashboard.overall_operator_recommendation ?? null,
    current_state: dashboard.current_state ?? {},
    drift_summary: dashboard.drift_summary ?? {},
    source_artifacts: dashboard.source_artifacts ?? {}
  };
}

function buildHealthSummary(entries) {
  const timeline = entries.map((entry, index) => ({
    entry_index: index,
    generated_at: entry.generated_at ?? null,
    overall_health_status: entry.overall_health_status ?? null
  }));
  const latest = timeline.at(-1) ?? null;
  const previous = timeline.length > 1 ? timeline.at(-2) : null;

  let latestTransition = "initial";
  if (latest && previous) {
    const latestRank = healthRank(latest.overall_health_status);
    const previousRank = healthRank(previous.overall_health_status);
    if (latest.overall_health_status === previous.overall_health_status) {
      latestTransition = "stable";
    } else if (latestRank > previousRank) {
      latestTransition = "worsened";
    } else if (latestRank < previousRank) {
      latestTransition = "improved";
    } else {
      latestTransition = "changed";
    }
  }

  return {
    latest_status: latest?.overall_health_status ?? null,
    previous_status: previous?.overall_health_status ?? null,
    latest_transition: latestTransition,
    distinct_statuses: [...new Set(timeline.map((item) => item.overall_health_status).filter(Boolean))],
    timeline
  };
}

function buildThresholdSummary(entries) {
  const timeline = entries.map((entry, index) => ({
    entry_index: index,
    generated_at: entry.generated_at ?? null,
    overall_threshold_status: entry.overall_threshold_status ?? null
  }));
  const latest = timeline.at(-1) ?? null;
  const previous = timeline.length > 1 ? timeline.at(-2) : null;

  let latestTransition = "initial";
  if (latest && previous) {
    if (latest.overall_threshold_status === previous.overall_threshold_status) {
      latestTransition = "stable";
    } else if (latest.overall_threshold_status === "breached") {
      latestTransition = "worsened";
    } else if (previous.overall_threshold_status === "breached") {
      latestTransition = "improved";
    } else {
      latestTransition = "changed";
    }
  }

  return {
    latest_status: latest?.overall_threshold_status ?? null,
    previous_status: previous?.overall_threshold_status ?? null,
    latest_transition: latestTransition,
    distinct_statuses: [...new Set(timeline.map((item) => item.overall_threshold_status).filter(Boolean))],
    timeline
  };
}

function buildRecommendationSummary(entries) {
  const timeline = entries.map((entry, index) => ({
    entry_index: index,
    generated_at: entry.generated_at ?? null,
    action: entry.overall_operator_recommendation?.action ?? null,
    urgency: entry.overall_operator_recommendation?.urgency ?? null
  }));
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

  return {
    latest_action: latest?.action ?? null,
    latest_urgency: latest?.urgency ?? null,
    previous_action: previous?.action ?? null,
    previous_urgency: previous?.urgency ?? null,
    latest_transition: latestTransition,
    distinct_actions: [...new Set(timeline.map((item) => item.action).filter(Boolean))],
    distinct_urgencies: [...new Set(timeline.map((item) => item.urgency).filter(Boolean))],
    timeline
  };
}

function buildLog(entries, inputs) {
  const latestTimestamp = entries.length > 0
    ? entries.map((entry) => entry.generated_at).filter(Boolean).sort().at(-1) ?? null
    : null;

  return {
    artifact_type: "verification-dashboard-log",
    generated_at: nowIso(),
    latest_timestamp: latestTimestamp,
    updated_from_inputs: inputs,
    entry_count: entries.length,
    summary: {
      health: buildHealthSummary(entries),
      threshold: buildThresholdSummary(entries),
      recommendation: buildRecommendationSummary(entries)
    },
    latest_dashboard: entries.at(-1) ?? null,
    entries
  };
}

function formatDashboardLogReport(logArtifact) {
  const lines = [
    "# Verification Dashboard Log Report",
    "",
    `- generated at: ${logArtifact.generated_at ?? "-"}`,
    `- latest timestamp: ${logArtifact.latest_timestamp ?? "-"}`,
    `- entry count: ${logArtifact.entry_count ?? 0}`,
    ""
  ];

  const health = logArtifact.summary?.health;
  lines.push("## Health Summary");
  lines.push(`- latest status: ${health?.latest_status ?? "-"}`);
  lines.push(`- previous status: ${health?.previous_status ?? "-"}`);
  lines.push(`- latest transition: ${health?.latest_transition ?? "-"}`);
  lines.push(`- distinct statuses: ${(health?.distinct_statuses ?? []).join(", ") || "-"}`);
  lines.push("");

  const threshold = logArtifact.summary?.threshold;
  lines.push("## Threshold Summary");
  lines.push(`- latest status: ${threshold?.latest_status ?? "-"}`);
  lines.push(`- previous status: ${threshold?.previous_status ?? "-"}`);
  lines.push(`- latest transition: ${threshold?.latest_transition ?? "-"}`);
  lines.push(`- distinct statuses: ${(threshold?.distinct_statuses ?? []).join(", ") || "-"}`);
  lines.push("");

  const recommendation = logArtifact.summary?.recommendation;
  lines.push("## Recommendation Summary");
  lines.push(`- latest action: ${recommendation?.latest_action ?? "-"}`);
  lines.push(`- latest urgency: ${recommendation?.latest_urgency ?? "-"}`);
  lines.push(`- previous action: ${recommendation?.previous_action ?? "-"}`);
  lines.push(`- previous urgency: ${recommendation?.previous_urgency ?? "-"}`);
  lines.push(`- latest transition: ${recommendation?.latest_transition ?? "-"}`);
  lines.push(`- distinct actions: ${(recommendation?.distinct_actions ?? []).join(", ") || "-"}`);
  lines.push(`- distinct urgencies: ${(recommendation?.distinct_urgencies ?? []).join(", ") || "-"}`);
  lines.push("");

  lines.push("## Latest Dashboard");
  if (!logArtifact.latest_dashboard) {
    lines.push("- none", "");
  } else {
    lines.push(`- path: ${logArtifact.latest_dashboard.dashboard_path ?? "-"}`);
    lines.push(`- health status: ${logArtifact.latest_dashboard.overall_health_status ?? "-"}`);
    lines.push(`- threshold status: ${logArtifact.latest_dashboard.overall_threshold_status ?? "-"}`);
    lines.push(`- operator recommendation: ${logArtifact.latest_dashboard.overall_operator_recommendation?.action ?? "-"} / urgency=${logArtifact.latest_dashboard.overall_operator_recommendation?.urgency ?? "-"}`);
    lines.push("");
  }

  lines.push("## Timeline");
  for (const entry of logArtifact.entries ?? []) {
    lines.push(`- generated_at=${entry.generated_at ?? "-"}, health=${entry.overall_health_status ?? "-"}, threshold=${entry.overall_threshold_status ?? "-"}, action=${entry.overall_operator_recommendation?.action ?? "-"}, urgency=${entry.overall_operator_recommendation?.urgency ?? "-"}`);
  }
  lines.push("");

  return lines.join("\n");
}

export async function verifyDashboardLogCommand(options) {
  if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
    throw new Error("At least one --input is required for `verify-dashboard-log`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-dashboard-log`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const logJsonPath = path.join(artifactDir, "verification-dashboard-log.json");
  const logReportPath = path.join(artifactDir, "verification-dashboard-log.md");

  let existingEntries = [];
  try {
    const existingLog = await readJson(logJsonPath, "verification dashboard log");
    existingEntries = Array.isArray(existingLog.entries) ? existingLog.entries : [];
  } catch (error) {
    if (!(error instanceof Error) || !/ENOENT/.test(error.message)) {
      throw error;
    }
  }

  const newEntries = [];
  const resolvedInputs = [];
  for (const input of options.inputs) {
    const resolvedDashboardPath = await resolveDashboardPath(input);
    const dashboard = await readJson(resolvedDashboardPath, "verification dashboard");
    newEntries.push(summarizeDashboard(dashboard, resolvedDashboardPath, path.resolve(input)));
    resolvedInputs.push(path.resolve(input));
  }

  const entries = dedupeEntries([...existingEntries, ...newEntries]);
  const logArtifact = buildLog(entries, resolvedInputs);
  const writtenLogJsonPath = await writeJsonArtifact(logJsonPath, logArtifact);
  const writtenLogReportPath = await writeTextArtifact(logReportPath, formatDashboardLogReport(logArtifact));

  return {
    ok: true,
    status: "completed",
    artifactDir,
    logJsonPath: writtenLogJsonPath,
    logReportPath: writtenLogReportPath,
    entryCount: logArtifact.entry_count,
    latestTimestamp: logArtifact.latest_timestamp,
    latestRecommendation: logArtifact.summary?.recommendation?.latest_action ?? null
  };
}
