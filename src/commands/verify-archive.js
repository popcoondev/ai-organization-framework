import fs from "node:fs/promises";
import path from "node:path";
import { verifyDashboardCommand } from "./verify-dashboard.js";
import { verifyDashboardIndexCommand } from "./verify-dashboard-index.js";
import { verifyDashboardLogCommand } from "./verify-dashboard-log.js";
import { readJson, resolveBundlePath } from "./verify-history.js";
import { verifyHistoryCommand } from "./verify-history.js";
import { verifyLineageCommand } from "./verify-lineage.js";
import { verifyLogCommand } from "./verify-log.js";
import { ensureDir, makeId, nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function defaultArchiveRoot(projectRoot) {
  return path.join(projectRoot, ".aof", "artifacts", "verification");
}

function makeArchiveManifest(archiveRoot, projectRoot, entries, importedRunIds = [], skippedSourceBundlePaths = []) {
  return {
    artifact_type: "verification-archive-manifest",
    generated_at: nowIso(),
    project_root: projectRoot,
    archive_root: archiveRoot,
    run_count: entries.length,
    imported_run_ids: importedRunIds,
    skipped_source_bundle_paths: skippedSourceBundlePaths,
    retention_policy: null,
    pruned_run_ids: [],
    pruned_count: 0,
    entries
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

function formatManifestReport(manifest) {
  const lines = [
    "# Verification Archive Manifest",
    "",
    `- generated at: ${formatValue(manifest.generated_at)}`,
    `- project root: ${formatValue(manifest.project_root)}`,
    `- archive root: ${formatValue(manifest.archive_root)}`,
    `- run count: ${formatValue(manifest.run_count)}`,
    `- imported run ids: ${formatValue(manifest.imported_run_ids)}`,
    `- skipped source bundle paths: ${formatValue(manifest.skipped_source_bundle_paths)}`,
    `- retention max runs: ${formatValue(manifest.retention_policy?.max_runs)}`,
    `- pruned count: ${formatValue(manifest.pruned_count)}`,
    `- pruned run ids: ${formatValue(manifest.pruned_run_ids)}`,
    "",
    "## Archived Runs"
  ];

  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    lines.push("- none", "");
    return lines.join("\n");
  }

  for (const entry of manifest.entries) {
    lines.push(`- ${formatValue(entry.archive_run_id)}: source=${formatValue(entry.source_bundle_path)}, archived=${formatValue(entry.archived_bundle_path)}, imported_at=${formatValue(entry.imported_at)}`);
  }
  lines.push("");
  return lines.join("\n");
}

function buildArchiveSummary({
  projectRoot,
  archiveRoot,
  manifestPath,
  manifestReportPath,
  importedEntries,
  skippedSourceBundlePaths,
  retainedEntries,
  retentionPolicy,
  prunedEntries,
  historyResult,
  logResult,
  lineageResult,
  dashboardResult,
  dashboardLogResult,
  dashboardIndexResult
}) {
  return {
    artifact_type: "verification-archive-summary",
    generated_at: nowIso(),
    project_root: projectRoot,
    archive_root: archiveRoot,
    imported_count: importedEntries.length,
    skipped_count: skippedSourceBundlePaths.length,
    retained_count: retainedEntries.length,
    retention_policy: retentionPolicy,
    pruned_count: prunedEntries.length,
    imported_run_ids: importedEntries.map((entry) => entry.archive_run_id),
    pruned_run_ids: prunedEntries.map((entry) => entry.archive_run_id),
    skipped_source_bundle_paths: skippedSourceBundlePaths,
    manifest: {
      json_path: manifestPath,
      report_path: manifestReportPath
    },
    derived_artifacts: {
      history: {
        json_path: historyResult.historyJsonPath,
        report_path: historyResult.historyReportPath
      },
      log: {
        json_path: logResult.logJsonPath,
        report_path: logResult.logReportPath,
        index_json_path: logResult.indexJsonPath,
        index_report_path: logResult.indexReportPath
      },
      lineage: {
        json_path: lineageResult.lineageJsonPath,
        report_path: lineageResult.lineageReportPath
      },
      dashboard: {
        json_path: dashboardResult.dashboardJsonPath,
        report_path: dashboardResult.dashboardReportPath
      },
      dashboard_log: {
        json_path: dashboardLogResult.logJsonPath,
        report_path: dashboardLogResult.logReportPath
      },
      dashboard_index: {
        json_path: dashboardIndexResult.indexJsonPath,
        report_path: dashboardIndexResult.indexReportPath
      }
    }
  };
}

function formatArchiveSummary(summary) {
  const lines = [
    "# Verification Archive Summary",
    "",
    `- generated at: ${formatValue(summary.generated_at)}`,
    `- project root: ${formatValue(summary.project_root)}`,
    `- archive root: ${formatValue(summary.archive_root)}`,
    `- imported count: ${formatValue(summary.imported_count)}`,
    `- skipped count: ${formatValue(summary.skipped_count)}`,
    `- retained count: ${formatValue(summary.retained_count)}`,
    `- retention max runs: ${formatValue(summary.retention_policy?.max_runs)}`,
    `- pruned count: ${formatValue(summary.pruned_count)}`,
    `- imported run ids: ${formatValue(summary.imported_run_ids)}`,
    `- pruned run ids: ${formatValue(summary.pruned_run_ids)}`,
    `- skipped source bundle paths: ${formatValue(summary.skipped_source_bundle_paths)}`,
    "",
    "## Manifest",
    `- json path: ${formatValue(summary.manifest?.json_path)}`,
    `- report path: ${formatValue(summary.manifest?.report_path)}`,
    "",
    "## Derived Artifacts"
  ];

  for (const [name, artifact] of Object.entries(summary.derived_artifacts ?? {})) {
    lines.push(`- ${name}: ${formatValue(Object.entries(artifact ?? {}).map(([key, value]) => `${key}=${formatValue(value)}`))}`);
  }
  lines.push("");
  return lines.join("\n");
}

function countValues(entries, field) {
  const counts = new Map();
  for (const entry of entries ?? []) {
    const key = entry?.[field] ?? null;
    const normalizedKey = key === null || key === undefined || key === "" ? "unknown" : String(key);
    counts.set(normalizedKey, (counts.get(normalizedKey) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value));
}

function buildArchiveMonitoringPolicy() {
  return {
    field_severity: {
      critical: [
        "dashboard_threshold_status",
        "dashboard_index_recommendation"
      ],
      warning: [
        "retention_reached",
        "dashboard_health_status",
        "overall_operator_recommendation"
      ]
    },
    thresholds: {
      require_dashboard_health_healthy: true,
      require_dashboard_threshold_within: true,
      warn_when_retention_reached: true
    }
  };
}

function buildArchiveAlerts(retentionReached, dashboardResult, dashboardIndexResult, monitoringPolicy) {
  const alerts = [];

  if (monitoringPolicy.thresholds?.warn_when_retention_reached && retentionReached) {
    alerts.push({
      code: "archive-retention-capacity-reached",
      severity: "warning",
      message: "Archive retention capacity has been reached; future imports will require pruning older retained runs."
    });
  }

  if (dashboardResult.overallHealthStatus && dashboardResult.overallHealthStatus !== "healthy") {
    alerts.push({
      code: "archive-dashboard-health-not-healthy",
      severity: dashboardResult.overallHealthStatus === "critical" ? "critical" : "warning",
      message: `Archive current dashboard health is ${dashboardResult.overallHealthStatus}.`
    });
  }

  if (dashboardIndexResult.operatorRecommendation && dashboardIndexResult.operatorRecommendation !== "continue-monitoring") {
    alerts.push({
      code: "archive-dashboard-index-action-required",
      severity: dashboardIndexResult.operatorRecommendation === "human-review-recommended" ? "critical" : "warning",
      message: `Archive current dashboard index recommends ${dashboardIndexResult.operatorRecommendation}.`
    });
  }

  return alerts;
}

function buildArchiveThresholdBreaches(retentionReached, dashboardResult, monitoringPolicy) {
  const breaches = [];

  if (monitoringPolicy.thresholds?.require_dashboard_health_healthy && dashboardResult.overallHealthStatus !== "healthy") {
    breaches.push({
      code: "archive-dashboard-health-required-healthy",
      severity: dashboardResult.overallHealthStatus === "critical" ? "critical" : "warning",
      threshold: "healthy",
      observed: dashboardResult.overallHealthStatus ?? null,
      message: `Archive dashboard health did not meet the required threshold: observed=${dashboardResult.overallHealthStatus ?? "unknown"}.`
    });
  }

  if (monitoringPolicy.thresholds?.require_dashboard_threshold_within && dashboardResult.overallThresholdStatus !== "within-threshold") {
    breaches.push({
      code: "archive-dashboard-threshold-required-within",
      severity: "critical",
      threshold: "within-threshold",
      observed: dashboardResult.overallThresholdStatus ?? null,
      message: `Archive dashboard threshold status did not meet the required threshold: observed=${dashboardResult.overallThresholdStatus ?? "unknown"}.`
    });
  }

  if (monitoringPolicy.thresholds?.warn_when_retention_reached && retentionReached) {
    breaches.push({
      code: "archive-retention-capacity-warning",
      severity: "warning",
      threshold: "retention-not-reached",
      observed: "retention-reached",
      message: "Archive retention capacity has been reached."
    });
  }

  return breaches;
}

function deriveArchiveHealthStatus(dashboardResult, thresholdBreaches, alerts) {
  if (thresholdBreaches.some((item) => item.severity === "critical") || alerts.some((item) => item.severity === "critical")) {
    return "critical";
  }
  if (
    dashboardResult.overallHealthStatus === "warning" ||
    thresholdBreaches.some((item) => item.severity === "warning") ||
    alerts.some((item) => item.severity === "warning")
  ) {
    return "warning";
  }
  return "healthy";
}

function deriveArchiveOperatorRecommendation(archiveIndex) {
  const sourceSignals = [
    ...(archiveIndex.threshold_breaches ?? []).map((item) => item.code),
    ...(archiveIndex.alerts ?? []).map((item) => item.code)
  ];

  if ((archiveIndex.threshold_breaches ?? []).some((item) => item.severity === "critical")) {
    return {
      action: "human-review-recommended",
      urgency: "critical",
      rationale: "Archive-level threshold breaches indicate the retained verification surface is not operationally healthy.",
      source_signals: sourceSignals
    };
  }

  if ((archiveIndex.alerts ?? []).some((item) => item.severity === "warning") || (archiveIndex.threshold_breaches ?? []).some((item) => item.severity === "warning")) {
    return {
      action: "investigate-archive-capacity",
      urgency: "warning",
      rationale: "Archive-level warning signals indicate capacity pressure or non-healthy retained verification state.",
      source_signals: sourceSignals
    };
  }

  return {
    action: "continue-monitoring",
    urgency: "healthy",
    rationale: "Archive-level health and thresholds are stable.",
    source_signals: sourceSignals
  };
}

function buildArchiveIndex({
  archiveRoot,
  manifestPath,
  summaryPath,
  retainedEntries,
  retentionPolicy,
  prunedEntries,
  dashboardResult,
  dashboardIndexResult
}) {
  const latestEntry = retainedEntries.length > 0 ? retainedEntries[retainedEntries.length - 1] : null;
  const maxRuns = retentionPolicy?.max_runs ?? null;
  const retainedCount = retainedEntries.length;
  const retentionReached = Number.isInteger(maxRuns) ? retainedCount >= maxRuns : false;
  const monitoringPolicy = buildArchiveMonitoringPolicy();
  const alerts = buildArchiveAlerts(retentionReached, dashboardResult, dashboardIndexResult, monitoringPolicy);
  const thresholdBreaches = buildArchiveThresholdBreaches(retentionReached, dashboardResult, monitoringPolicy);
  const healthStatus = deriveArchiveHealthStatus(dashboardResult, thresholdBreaches, alerts);
  const thresholdStatus = thresholdBreaches.length > 0 ? "breached" : "within-threshold";

  const archiveIndex = {
    artifact_type: "verification-archive-index",
    generated_at: nowIso(),
    archive_root: archiveRoot,
    manifest_path: manifestPath,
    summary_path: summaryPath,
    retained_count: retainedCount,
    pruned_count: prunedEntries.length,
    retention_policy: retentionPolicy,
    retention_reached: retentionReached,
    health_status: healthStatus,
    threshold_status: thresholdStatus,
    monitoring_policy: monitoringPolicy,
    alerts,
    threshold_breaches: thresholdBreaches,
    latest_archived_run: latestEntry
      ? {
          archive_run_id: latestEntry.archive_run_id,
          imported_at: latestEntry.imported_at ?? null,
          source_generated_at: latestEntry.source_generated_at ?? null,
          source_bundle_path: latestEntry.source_bundle_path ?? null,
          archived_run_dir: latestEntry.archived_run_dir ?? null,
          provider: latestEntry.provider ?? null,
          model: latestEntry.model ?? null,
          workflow_id: latestEntry.workflow_id ?? null
        }
      : null,
    provider_mix: countValues(retainedEntries, "provider"),
    model_mix: countValues(retainedEntries, "model"),
    workflow_mix: countValues(retainedEntries, "workflow_id"),
    dashboard_health_status: dashboardResult.overallHealthStatus ?? null,
    dashboard_threshold_status: dashboardResult.overallThresholdStatus ?? null,
    overall_operator_recommendation: dashboardResult.overallOperatorRecommendation ?? null,
    dashboard_index_recommendation: dashboardIndexResult.operatorRecommendation ?? null,
    operator_recommendation: null
  };
  archiveIndex.operator_recommendation = deriveArchiveOperatorRecommendation(archiveIndex);
  return archiveIndex;
}

function formatArchiveIndex(indexArtifact) {
  const lines = [
    "# Verification Archive Index",
    "",
    `- generated at: ${formatValue(indexArtifact.generated_at)}`,
    `- archive root: ${formatValue(indexArtifact.archive_root)}`,
    `- manifest path: ${formatValue(indexArtifact.manifest_path)}`,
    `- summary path: ${formatValue(indexArtifact.summary_path)}`,
    `- retained count: ${formatValue(indexArtifact.retained_count)}`,
    `- pruned count: ${formatValue(indexArtifact.pruned_count)}`,
    `- retention max runs: ${formatValue(indexArtifact.retention_policy?.max_runs)}`,
    `- retention reached: ${formatValue(indexArtifact.retention_reached)}`,
    `- health status: ${formatValue(indexArtifact.health_status)}`,
    `- threshold status: ${formatValue(indexArtifact.threshold_status)}`,
    `- dashboard health status: ${formatValue(indexArtifact.dashboard_health_status)}`,
    `- dashboard threshold status: ${formatValue(indexArtifact.dashboard_threshold_status)}`,
    `- overall operator recommendation: ${formatValue(indexArtifact.overall_operator_recommendation)}`,
    `- dashboard-index recommendation: ${formatValue(indexArtifact.dashboard_index_recommendation)}`,
    "",
    "## Archive Operator Recommendation",
    `- action: ${formatValue(indexArtifact.operator_recommendation?.action)}`,
    `- urgency: ${formatValue(indexArtifact.operator_recommendation?.urgency)}`,
    `- rationale: ${formatValue(indexArtifact.operator_recommendation?.rationale)}`,
    `- source signals: ${formatValue(indexArtifact.operator_recommendation?.source_signals)}`,
    "",
    "## Monitoring Policy",
    `- critical fields: ${formatValue(indexArtifact.monitoring_policy?.field_severity?.critical)}`,
    `- warning fields: ${formatValue(indexArtifact.monitoring_policy?.field_severity?.warning)}`,
    `- require dashboard health healthy: ${formatValue(indexArtifact.monitoring_policy?.thresholds?.require_dashboard_health_healthy)}`,
    `- require dashboard threshold within: ${formatValue(indexArtifact.monitoring_policy?.thresholds?.require_dashboard_threshold_within)}`,
    `- warn when retention reached: ${formatValue(indexArtifact.monitoring_policy?.thresholds?.warn_when_retention_reached)}`,
    "",
    "## Alerts",
  ];

  if (!Array.isArray(indexArtifact.alerts) || indexArtifact.alerts.length === 0) {
    lines.push("- none");
  } else {
    for (const alert of indexArtifact.alerts) {
      lines.push(`- [${formatValue(alert.severity)}] ${formatValue(alert.code)}: ${formatValue(alert.message)}`);
    }
  }
  lines.push("");

  lines.push("## Threshold Breaches");
  if (!Array.isArray(indexArtifact.threshold_breaches) || indexArtifact.threshold_breaches.length === 0) {
    lines.push("- none");
  } else {
    for (const breach of indexArtifact.threshold_breaches) {
      lines.push(`- [${formatValue(breach.severity)}] ${formatValue(breach.code)}: ${formatValue(breach.message)} (observed=${formatValue(breach.observed)}, threshold=${formatValue(breach.threshold)})`);
    }
  }
  lines.push("");

  lines.push(
    "## Latest Archived Run"
  );

  const latest = indexArtifact.latest_archived_run;
  if (!latest) {
    lines.push("- none");
  } else {
    lines.push(`- archive run id: ${formatValue(latest.archive_run_id)}`);
    lines.push(`- imported at: ${formatValue(latest.imported_at)}`);
    lines.push(`- source generated at: ${formatValue(latest.source_generated_at)}`);
    lines.push(`- provider: ${formatValue(latest.provider)}`);
    lines.push(`- model: ${formatValue(latest.model)}`);
    lines.push(`- workflow: ${formatValue(latest.workflow_id)}`);
    lines.push(`- source bundle path: ${formatValue(latest.source_bundle_path)}`);
    lines.push(`- archived run dir: ${formatValue(latest.archived_run_dir)}`);
  }
  lines.push("");

  for (const [title, items] of [
    ["Provider Mix", indexArtifact.provider_mix],
    ["Model Mix", indexArtifact.model_mix],
    ["Workflow Mix", indexArtifact.workflow_mix]
  ]) {
    lines.push(`## ${title}`);
    if (!Array.isArray(items) || items.length === 0) {
      lines.push("- none");
    } else {
      for (const item of items) {
        lines.push(`- ${formatValue(item.value)}: ${formatValue(item.count)}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function loadExistingManifest(manifestPath, projectRoot, archiveRoot) {
  if (!(await pathExists(manifestPath))) {
    return makeArchiveManifest(archiveRoot, projectRoot, []);
  }

  const manifest = await readJson(manifestPath, "verification archive manifest");
  return {
    artifact_type: "verification-archive-manifest",
    generated_at: manifest.generated_at ?? null,
    project_root: manifest.project_root ?? projectRoot,
    archive_root: manifest.archive_root ?? archiveRoot,
    run_count: Array.isArray(manifest.entries) ? manifest.entries.length : 0,
    imported_run_ids: Array.isArray(manifest.imported_run_ids) ? manifest.imported_run_ids : [],
    skipped_source_bundle_paths: Array.isArray(manifest.skipped_source_bundle_paths) ? manifest.skipped_source_bundle_paths : [],
    entries: Array.isArray(manifest.entries) ? manifest.entries : []
  };
}

async function importVerificationRun(input, archiveRoot, existingEntries) {
  const sourceInput = path.resolve(input);
  const sourceBundlePath = path.resolve(await resolveBundlePath(input));
  const priorEntry = existingEntries.find((entry) => entry.source_bundle_path === sourceBundlePath);
  if (priorEntry) {
    return {
      imported: false,
      skippedSourceBundlePath: sourceBundlePath,
      entry: priorEntry
    };
  }

  const sourceDir = path.dirname(sourceBundlePath);
  const bundle = await readJson(sourceBundlePath, "verification bundle");
  const archiveRunId = makeId("vrun");
  const archivedRunDir = path.join(archiveRoot, "runs", archiveRunId);
  const archivedBundlePath = path.join(archivedRunDir, "verification-bundle.json");
  await ensureDir(path.dirname(archivedRunDir));
  await fs.cp(sourceDir, archivedRunDir, { recursive: true });

  return {
    imported: true,
    entry: {
      archive_run_id: archiveRunId,
      imported_at: nowIso(),
      source_input: sourceInput,
      source_bundle_path: sourceBundlePath,
      source_generated_at: bundle.generated_at ?? null,
      source_artifact_dir: sourceDir,
      archived_run_dir: archivedRunDir,
      archived_bundle_path: archivedBundlePath,
      provider: bundle.execution_policy?.provider ?? null,
      model: bundle.execution_policy?.model ?? null,
      workflow_id: bundle.verification_context?.workflow?.workflow_id ?? null
    }
  };
}

async function writeDashboardSnapshot(dashboardResult, archiveRoot) {
  const snapshotId = makeId("dashsnap");
  const snapshotDir = path.join(archiveRoot, "dashboard-snapshots", snapshotId);
  await ensureDir(snapshotDir);
  const jsonTarget = path.join(snapshotDir, "verification-dashboard.json");
  const reportTarget = path.join(snapshotDir, "verification-dashboard.md");
  await fs.copyFile(dashboardResult.dashboardJsonPath, jsonTarget);
  await fs.copyFile(dashboardResult.dashboardReportPath, reportTarget);
  return {
    snapshotId,
    snapshotDir,
    jsonPath: jsonTarget,
    reportPath: reportTarget
  };
}

function resolveRetentionPolicy(options) {
  if (options.maxRuns === undefined || options.maxRuns === null || options.maxRuns === "") {
    return null;
  }
  return {
    max_runs: options.maxRuns
  };
}

function applyRetention(entries, maxRuns) {
  if (!Number.isInteger(maxRuns) || maxRuns <= 0 || entries.length <= maxRuns) {
    return {
      retainedEntries: entries,
      prunedEntries: []
    };
  }

  const pruneCount = entries.length - maxRuns;
  return {
    retainedEntries: entries.slice(pruneCount),
    prunedEntries: entries.slice(0, pruneCount)
  };
}

async function removePrunedRunDirectories(prunedEntries) {
  for (const entry of prunedEntries) {
    if (entry?.archived_run_dir) {
      await fs.rm(entry.archived_run_dir, { recursive: true, force: true });
    }
  }
}

export async function verifyArchiveCommand(options) {
  if (!options.project) {
    throw new Error("Missing --project for `verify-archive`.");
  }
  if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
    throw new Error("At least one --input is required for `verify-archive`.");
  }

  const projectRoot = path.resolve(options.project);
  const archiveRoot = path.resolve(options.archiveDir || defaultArchiveRoot(projectRoot));
  const manifestPath = path.join(archiveRoot, "verification-archive-manifest.json");
  const manifestReportPath = path.join(archiveRoot, "verification-archive-manifest.md");
  const summaryPath = path.join(archiveRoot, "verification-archive.json");
  const summaryReportPath = path.join(archiveRoot, "verification-archive.md");
  await ensureDir(archiveRoot);

  const existingManifest = await loadExistingManifest(manifestPath, projectRoot, archiveRoot);
  const existingEntries = [...existingManifest.entries];
  const importedEntries = [];
  const skippedSourceBundlePaths = [];
  const retentionPolicy = resolveRetentionPolicy(options);

  for (const input of options.inputs) {
    const result = await importVerificationRun(input, archiveRoot, existingEntries);
    if (result.imported) {
      existingEntries.push(result.entry);
      importedEntries.push(result.entry);
    } else if (result.skippedSourceBundlePath) {
      skippedSourceBundlePaths.push(result.skippedSourceBundlePath);
    }
  }

  if (existingEntries.length === 0) {
    throw new Error("No verification runs are available to archive.");
  }

  existingEntries.sort((left, right) => {
    const leftKey = left.imported_at ?? left.source_generated_at ?? "";
    const rightKey = right.imported_at ?? right.source_generated_at ?? "";
    return leftKey.localeCompare(rightKey);
  });

  const { retainedEntries, prunedEntries } = applyRetention(
    existingEntries,
    retentionPolicy?.max_runs
  );
  await removePrunedRunDirectories(prunedEntries);

  const manifest = makeArchiveManifest(
    archiveRoot,
    projectRoot,
    retainedEntries,
    importedEntries.map((entry) => entry.archive_run_id),
    skippedSourceBundlePaths
  );
  manifest.retention_policy = retentionPolicy;
  manifest.pruned_run_ids = prunedEntries.map((entry) => entry.archive_run_id);
  manifest.pruned_count = prunedEntries.length;
  const writtenManifestPath = await writeJsonArtifact(manifestPath, manifest);
  const writtenManifestReportPath = await writeTextArtifact(manifestReportPath, formatManifestReport(manifest));

  const runInputs = retainedEntries.map((entry) => entry.archived_run_dir);
  const historyResult = await verifyHistoryCommand({
    inputs: runInputs,
    artifactDir: path.join(archiveRoot, "history")
  });
  const logResult = await verifyLogCommand({
    inputs: runInputs,
    artifactDir: path.join(archiveRoot, "log")
  });
  const lineageResult = await verifyLineageCommand({
    historyInput: historyResult.historyJsonPath,
    logInput: logResult.logJsonPath,
    indexInput: logResult.indexJsonPath,
    artifactDir: path.join(archiveRoot, "lineage")
  });
  const dashboardResult = await verifyDashboardCommand({
    historyInput: historyResult.historyJsonPath,
    logInput: logResult.logJsonPath,
    indexInput: logResult.indexJsonPath,
    lineageInput: lineageResult.lineageJsonPath,
    artifactDir: path.join(archiveRoot, "dashboard")
  });

  const dashboardLogPath = path.join(archiveRoot, "dashboard-log", "verification-dashboard-log.json");
  let dashboardLogResult;
  if (importedEntries.length > 0 || prunedEntries.length > 0 || !(await pathExists(dashboardLogPath))) {
    const snapshot = await writeDashboardSnapshot(dashboardResult, archiveRoot);
    dashboardLogResult = await verifyDashboardLogCommand({
      inputs: [snapshot.snapshotDir],
      artifactDir: path.join(archiveRoot, "dashboard-log")
    });
  } else {
    const existingDashboardLog = await readJson(dashboardLogPath, "verification dashboard log");
    dashboardLogResult = {
      ok: true,
      status: "completed",
      artifactDir: path.dirname(dashboardLogPath),
      logJsonPath: dashboardLogPath,
      logReportPath: path.join(archiveRoot, "dashboard-log", "verification-dashboard-log.md"),
      entryCount: existingDashboardLog.entry_count ?? 0,
      latestTimestamp: existingDashboardLog.latest_timestamp ?? null,
      latestRecommendation: existingDashboardLog.summary?.recommendation?.latest_action ?? null
    };
  }

  const dashboardIndexResult = await verifyDashboardIndexCommand({
    logInput: dashboardLogResult.logJsonPath,
    artifactDir: path.join(archiveRoot, "dashboard-index")
  });

  const summary = buildArchiveSummary({
    projectRoot,
    archiveRoot,
    manifestPath: writtenManifestPath,
    manifestReportPath: writtenManifestReportPath,
    importedEntries,
    skippedSourceBundlePaths,
    retainedEntries,
    retentionPolicy,
    prunedEntries,
    historyResult,
    logResult,
    lineageResult,
    dashboardResult,
    dashboardLogResult,
    dashboardIndexResult
  });

  const writtenSummaryPath = await writeJsonArtifact(summaryPath, summary);
  const writtenSummaryReportPath = await writeTextArtifact(summaryReportPath, formatArchiveSummary(summary));

  const archiveIndex = buildArchiveIndex({
    archiveRoot,
    manifestPath: writtenManifestPath,
    summaryPath: writtenSummaryPath,
    retainedEntries,
    retentionPolicy,
    prunedEntries,
    dashboardResult,
    dashboardIndexResult
  });
  const archiveIndexJsonPath = await writeJsonArtifact(
    path.join(archiveRoot, "verification-archive-index.json"),
    archiveIndex
  );
  const archiveIndexReportPath = await writeTextArtifact(
    path.join(archiveRoot, "verification-archive-index.md"),
    formatArchiveIndex(archiveIndex)
  );

  return {
    ok: true,
    status: "completed",
    projectRoot,
    archiveRoot,
    manifestJsonPath: writtenManifestPath,
    manifestReportPath: writtenManifestReportPath,
    summaryJsonPath: writtenSummaryPath,
    summaryReportPath: writtenSummaryReportPath,
    archiveIndexJsonPath,
    archiveIndexReportPath,
    importedCount: importedEntries.length,
    skippedCount: skippedSourceBundlePaths.length,
    retainedCount: retainedEntries.length,
    prunedCount: prunedEntries.length,
    importedRunIds: importedEntries.map((entry) => entry.archive_run_id),
    prunedRunIds: prunedEntries.map((entry) => entry.archive_run_id),
    skippedSourceBundlePaths,
    historyJsonPath: historyResult.historyJsonPath,
    logJsonPath: logResult.logJsonPath,
    indexJsonPath: logResult.indexJsonPath,
    lineageJsonPath: lineageResult.lineageJsonPath,
    dashboardJsonPath: dashboardResult.dashboardJsonPath,
    dashboardLogJsonPath: dashboardLogResult.logJsonPath,
    dashboardIndexJsonPath: dashboardIndexResult.indexJsonPath,
    overallRecommendedAction: dashboardResult.overallOperatorRecommendation,
    dashboardIndexRecommendedAction: dashboardIndexResult.operatorRecommendation
  };
}
