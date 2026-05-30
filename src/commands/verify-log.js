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

function formatLogReport(logArtifact) {
  const historyShape = {
    generated_at: logArtifact.generated_at,
    entry_count: logArtifact.entry_count,
    summary: logArtifact.summary,
    sources: logArtifact.updated_from_inputs,
    entries: logArtifact.entries
  };

  const body = formatHistoryReport(historyShape);
  return body.replace(/^# Verification History Report/m, "# Verification Log Report");
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
  const writtenLogJsonPath = await writeJsonArtifact(logJsonPath, logArtifact);
  const writtenLogReportPath = await writeTextArtifact(logReportPath, formatLogReport(logArtifact));

  return {
    ok: true,
    status: "completed",
    artifactDir,
    logJsonPath: writtenLogJsonPath,
    logReportPath: writtenLogReportPath,
    entryCount: logArtifact.entry_count,
    latestTimestamp: logArtifact.latest_timestamp,
    providers: logArtifact.summary.providers,
    workflows: logArtifact.summary.workflows
  };
}
