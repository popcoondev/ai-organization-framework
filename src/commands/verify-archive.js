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
    imported_run_ids: importedEntries.map((entry) => entry.archive_run_id),
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
    `- imported run ids: ${formatValue(summary.imported_run_ids)}`,
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

  const manifest = makeArchiveManifest(
    archiveRoot,
    projectRoot,
    existingEntries,
    importedEntries.map((entry) => entry.archive_run_id),
    skippedSourceBundlePaths
  );
  const writtenManifestPath = await writeJsonArtifact(manifestPath, manifest);
  const writtenManifestReportPath = await writeTextArtifact(manifestReportPath, formatManifestReport(manifest));

  const runInputs = existingEntries.map((entry) => entry.archived_run_dir);
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
  if (importedEntries.length > 0 || !(await pathExists(dashboardLogPath))) {
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
    historyResult,
    logResult,
    lineageResult,
    dashboardResult,
    dashboardLogResult,
    dashboardIndexResult
  });

  const writtenSummaryPath = await writeJsonArtifact(summaryPath, summary);
  const writtenSummaryReportPath = await writeTextArtifact(summaryReportPath, formatArchiveSummary(summary));

  return {
    ok: true,
    status: "completed",
    projectRoot,
    archiveRoot,
    manifestJsonPath: writtenManifestPath,
    manifestReportPath: writtenManifestReportPath,
    summaryJsonPath: writtenSummaryPath,
    summaryReportPath: writtenSummaryReportPath,
    importedCount: importedEntries.length,
    skippedCount: skippedSourceBundlePaths.length,
    importedRunIds: importedEntries.map((entry) => entry.archive_run_id),
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
