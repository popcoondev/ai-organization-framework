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
    return 4;
  }
  if (action === "investigate-archive-capacity") {
    return 3;
  }
  if (action === "continue-monitoring") {
    return 1;
  }
  return 0;
}

async function resolveArchiveIndexPath(inputPath) {
  const resolvedPath = path.resolve(inputPath);
  const stat = await fs.stat(resolvedPath);
  if (stat.isDirectory()) {
    return path.join(resolvedPath, "verification-archive-index.json");
  }
  return resolvedPath;
}

function dedupeEntries(entries) {
  const seen = new Set();
  const result = [];

  for (const entry of entries) {
    const key = `${entry.index_path ?? ""}::${entry.generated_at ?? ""}`;
    if (!entry.index_path || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }

  return result;
}

function summarizeArchiveIndex(indexArtifact, indexPath, sourceInput) {
  return {
    source_input: sourceInput,
    index_path: indexPath,
    generated_at: indexArtifact.generated_at ?? null,
    retained_count: indexArtifact.retained_count ?? 0,
    pruned_count: indexArtifact.pruned_count ?? 0,
    retention_reached: indexArtifact.retention_reached ?? false,
    health_status: indexArtifact.health_status ?? null,
    threshold_status: indexArtifact.threshold_status ?? null,
    operator_recommendation: indexArtifact.operator_recommendation ?? null,
    latest_archived_run: indexArtifact.latest_archived_run ?? null,
    provider_mix: indexArtifact.provider_mix ?? [],
    workflow_mix: indexArtifact.workflow_mix ?? []
  };
}

function buildHealthSummary(entries) {
  const timeline = entries.map((entry, index) => ({
    entry_index: index,
    generated_at: entry.generated_at ?? null,
    health_status: entry.health_status ?? null
  }));
  const latest = timeline.at(-1) ?? null;
  const previous = timeline.length > 1 ? timeline.at(-2) : null;

  let latestTransition = "initial";
  if (latest && previous) {
    const latestRank = healthRank(latest.health_status);
    const previousRank = healthRank(previous.health_status);
    if (latest.health_status === previous.health_status) {
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
    latest_status: latest?.health_status ?? null,
    previous_status: previous?.health_status ?? null,
    latest_transition: latestTransition,
    distinct_statuses: [...new Set(timeline.map((item) => item.health_status).filter(Boolean))],
    timeline
  };
}

function buildThresholdSummary(entries) {
  const timeline = entries.map((entry, index) => ({
    entry_index: index,
    generated_at: entry.generated_at ?? null,
    threshold_status: entry.threshold_status ?? null
  }));
  const latest = timeline.at(-1) ?? null;
  const previous = timeline.length > 1 ? timeline.at(-2) : null;

  let latestTransition = "initial";
  if (latest && previous) {
    if (latest.threshold_status === previous.threshold_status) {
      latestTransition = "stable";
    } else if (latest.threshold_status === "breached") {
      latestTransition = "worsened";
    } else if (previous.threshold_status === "breached") {
      latestTransition = "improved";
    } else {
      latestTransition = "changed";
    }
  }

  return {
    latest_status: latest?.threshold_status ?? null,
    previous_status: previous?.threshold_status ?? null,
    latest_transition: latestTransition,
    distinct_statuses: [...new Set(timeline.map((item) => item.threshold_status).filter(Boolean))],
    timeline
  };
}

function buildRecommendationSummary(entries) {
  const timeline = entries.map((entry, index) => ({
    entry_index: index,
    generated_at: entry.generated_at ?? null,
    action: entry.operator_recommendation?.action ?? null,
    urgency: entry.operator_recommendation?.urgency ?? null
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

function buildRetentionSummary(entries) {
  const timeline = entries.map((entry, index) => ({
    entry_index: index,
    generated_at: entry.generated_at ?? null,
    retained_count: entry.retained_count ?? 0,
    pruned_count: entry.pruned_count ?? 0,
    retention_reached: entry.retention_reached ?? false
  }));
  const latest = timeline.at(-1) ?? null;
  const previous = timeline.length > 1 ? timeline.at(-2) : null;

  let latestTransition = "initial";
  if (latest && previous) {
    if (latest.retention_reached === previous.retention_reached) {
      latestTransition = "stable";
    } else if (latest.retention_reached) {
      latestTransition = "reached";
    } else {
      latestTransition = "cleared";
    }
  }

  return {
    latest_retained_count: latest?.retained_count ?? 0,
    latest_pruned_count: latest?.pruned_count ?? 0,
    latest_retention_reached: latest?.retention_reached ?? false,
    previous_retention_reached: previous?.retention_reached ?? null,
    latest_transition: latestTransition,
    timeline
  };
}

function buildLog(entries, inputs) {
  const latestTimestamp = entries.length > 0
    ? entries.map((entry) => entry.generated_at).filter(Boolean).sort().at(-1) ?? null
    : null;

  return {
    artifact_type: "verification-archive-log",
    generated_at: nowIso(),
    latest_timestamp: latestTimestamp,
    updated_from_inputs: inputs,
    entry_count: entries.length,
    summary: {
      health: buildHealthSummary(entries),
      threshold: buildThresholdSummary(entries),
      recommendation: buildRecommendationSummary(entries),
      retention: buildRetentionSummary(entries)
    },
    latest_archive_index: entries.at(-1) ?? null,
    entries
  };
}

function formatArchiveLogReport(logArtifact) {
  const lines = [
    "# Verification Archive Log Report",
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

  const retention = logArtifact.summary?.retention;
  lines.push("## Retention Summary");
  lines.push(`- latest retained count: ${retention?.latest_retained_count ?? 0}`);
  lines.push(`- latest pruned count: ${retention?.latest_pruned_count ?? 0}`);
  lines.push(`- latest retention reached: ${retention?.latest_retention_reached ?? false}`);
  lines.push(`- previous retention reached: ${retention?.previous_retention_reached ?? "-"}`);
  lines.push(`- latest transition: ${retention?.latest_transition ?? "-"}`);
  lines.push("");

  lines.push("## Latest Archive Index");
  if (!logArtifact.latest_archive_index) {
    lines.push("- none", "");
  } else {
    lines.push(`- path: ${logArtifact.latest_archive_index.index_path ?? "-"}`);
    lines.push(`- health status: ${logArtifact.latest_archive_index.health_status ?? "-"}`);
    lines.push(`- threshold status: ${logArtifact.latest_archive_index.threshold_status ?? "-"}`);
    lines.push(`- operator recommendation: ${logArtifact.latest_archive_index.operator_recommendation?.action ?? "-"} / urgency=${logArtifact.latest_archive_index.operator_recommendation?.urgency ?? "-"}`);
    lines.push(`- retention reached: ${logArtifact.latest_archive_index.retention_reached ?? false}`);
    lines.push("");
  }

  lines.push("## Timeline");
  for (const entry of logArtifact.entries ?? []) {
    lines.push(`- generated_at=${entry.generated_at ?? "-"}, health=${entry.health_status ?? "-"}, threshold=${entry.threshold_status ?? "-"}, action=${entry.operator_recommendation?.action ?? "-"}, urgency=${entry.operator_recommendation?.urgency ?? "-"}, retention_reached=${entry.retention_reached ?? false}, retained_count=${entry.retained_count ?? 0}, pruned_count=${entry.pruned_count ?? 0}`);
  }
  lines.push("");

  return lines.join("\n");
}

export async function verifyArchiveLogCommand(options) {
  if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
    throw new Error("At least one --input is required for `verify-archive-log`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-archive-log`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const logJsonPath = path.join(artifactDir, "verification-archive-log.json");
  const logReportPath = path.join(artifactDir, "verification-archive-log.md");

  let existingEntries = [];
  try {
    const existingLog = await readJson(logJsonPath, "verification archive log");
    existingEntries = Array.isArray(existingLog.entries) ? existingLog.entries : [];
  } catch (error) {
    if (!(error instanceof Error) || !/ENOENT/.test(error.message)) {
      throw error;
    }
  }

  const newEntries = [];
  const resolvedInputs = [];
  for (const input of options.inputs) {
    const resolvedIndexPath = await resolveArchiveIndexPath(input);
    const indexArtifact = await readJson(resolvedIndexPath, "verification archive index");
    newEntries.push(summarizeArchiveIndex(indexArtifact, resolvedIndexPath, path.resolve(input)));
    resolvedInputs.push(path.resolve(input));
  }

  const entries = dedupeEntries([...existingEntries, ...newEntries]);
  const logArtifact = buildLog(entries, resolvedInputs);
  const writtenLogJsonPath = await writeJsonArtifact(logJsonPath, logArtifact);
  const writtenLogReportPath = await writeTextArtifact(logReportPath, formatArchiveLogReport(logArtifact));

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
