import fs from "node:fs/promises";
import path from "node:path";
import { nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";

async function readJson(filePath, label) {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function resolveBundlePath(inputPath) {
  const resolvedPath = path.resolve(inputPath);
  const stat = await fs.stat(resolvedPath);
  if (stat.isDirectory()) {
    return path.join(resolvedPath, "verification-bundle.json");
  }
  return resolvedPath;
}

function normalizeObservedStages(providerObservability = {}) {
  return Object.entries(providerObservability)
    .filter(([, value]) => value && value.observed_step_count > 0)
    .map(([key, value]) => ({
      stage_key: key,
      stage: value.stage,
      execution_id: value.execution_id,
      observed_step_count: value.observed_step_count,
      step_count: value.step_count
    }));
}

function summarizeBundle(bundle, bundlePath, sourceInput) {
  const verificationContext = bundle.verification_context ?? {};
  const organization = verificationContext.organization ?? {};
  const workflow = verificationContext.workflow ?? {};
  const governance = verificationContext.governance ?? {};
  const executionPolicy = bundle.execution_policy ?? {};
  const branchOutcomes = bundle.branch_outcomes ?? {};
  const branchPolicies = bundle.branch_policies ?? {};
  const providerObservability = bundle.provider_observability ?? {};

  return {
    source_input: sourceInput,
    bundle_path: bundlePath,
    generated_at: bundle.generated_at ?? null,
    status: bundle.status ?? null,
    request: bundle.request ?? null,
    provider: executionPolicy.provider ?? null,
    model: executionPolicy.model ?? null,
    routing_mode: branchPolicies.happy_path?.routing_mode ?? executionPolicy.routing_mode ?? null,
    organization: {
      organization_id: organization.organization_id ?? null,
      name: organization.name ?? null,
      language: organization.language ?? null
    },
    workflow: {
      workflow_id: workflow.workflow_id ?? null,
      name: workflow.name ?? null
    },
    governance: {
      model: governance.model ?? null,
      escalation_target: governance.escalation_target ?? null
    },
    branch_outcomes: branchOutcomes,
    branch_policies: branchPolicies,
    provider_observability: {
      observed_stage_count: normalizeObservedStages(providerObservability).length,
      observed_stages: normalizeObservedStages(providerObservability)
    }
  };
}

function buildHistorySummary(entries) {
  const providers = [...new Set(entries.map((entry) => entry.provider).filter(Boolean))];
  const workflows = [...new Set(entries.map((entry) => entry.workflow.workflow_id).filter(Boolean))];
  const statuses = Object.fromEntries(
    [...new Set(entries.map((entry) => entry.status).filter(Boolean))]
      .map((status) => [status, entries.filter((entry) => entry.status === status).length])
  );

  const drift = buildDriftSummary(entries);

  return {
    providers,
    workflows,
    statuses,
    drift
  };
}

function buildDriftSummary(entries) {
  const trackedFields = [
    ["provider", (entry) => entry.provider],
    ["model", (entry) => entry.model],
    ["workflow_id", (entry) => entry.workflow.workflow_id],
    ["routing_mode", (entry) => entry.routing_mode],
    ["happy_path_approval_status", (entry) => entry.branch_outcomes?.happy_path?.approval_status ?? null],
    ["signal_reopen_status", (entry) => entry.branch_outcomes?.signal_reopen?.reopen_status ?? null],
    ["escalation_reopen_status", (entry) => entry.branch_outcomes?.escalation_reopen?.resolution_status ?? null],
    ["escalation_approve_status", (entry) => entry.branch_outcomes?.escalation_approve?.resolution_status ?? null],
    ["escalation_stop_status", (entry) => entry.branch_outcomes?.escalation_stop?.resolution_status ?? null],
    ["observed_provider_stage_count", (entry) => entry.provider_observability?.observed_stage_count ?? 0]
  ];

  const fieldSummaries = trackedFields.map(([field, getter]) => {
    const sequence = entries.map((entry) => getter(entry));
    const distinctValues = [...new Set(sequence.map((value) => JSON.stringify(value)))].map((value) => JSON.parse(value));
    return {
      field,
      has_drift: distinctValues.length > 1,
      sequence,
      distinct_values: distinctValues
    };
  });

  return {
    has_drift: fieldSummaries.some((field) => field.has_drift),
    fields_with_drift: fieldSummaries.filter((field) => field.has_drift).map((field) => field.field),
    fields: fieldSummaries
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

function formatHistoryReport(history) {
  const lines = [
    "# Verification History Report",
    "",
    `- generated at: ${formatValue(history.generated_at)}`,
    `- entry count: ${formatValue(history.entry_count)}`,
    `- providers: ${formatValue(history.summary?.providers)}`,
    `- workflows: ${formatValue(history.summary?.workflows)}`,
    ""
  ];

  lines.push("## Status Summary");
  const statusEntries = Object.entries(history.summary?.statuses ?? {});
  if (statusEntries.length === 0) {
    lines.push("- none", "");
  } else {
    for (const [status, count] of statusEntries) {
      lines.push(`- ${status}: ${count}`);
    }
    lines.push("");
  }

  lines.push("## Drift Summary");
  const drift = history.summary?.drift;
  if (!drift) {
    lines.push("- none", "");
  } else {
    lines.push(`- has drift: ${formatValue(drift.has_drift)}`);
    lines.push(`- fields with drift: ${formatValue(drift.fields_with_drift)}`);
    for (const field of drift.fields ?? []) {
      lines.push(
        `- ${field.field}: has_drift=${formatValue(field.has_drift)}, distinct=${formatValue(field.distinct_values)}, sequence=${formatValue(field.sequence)}`
      );
    }
    lines.push("");
  }

  lines.push("## Sources");
  for (const source of history.sources ?? []) {
    lines.push(`- ${source}`);
  }
  lines.push("");

  lines.push("## Entries");
  for (const entry of history.entries ?? []) {
    lines.push(`### ${formatValue(entry.generated_at)} | ${formatValue(entry.provider)} | ${formatValue(entry.workflow.workflow_id)}`);
    lines.push(`- source input: ${formatValue(entry.source_input)}`);
    lines.push(`- bundle path: ${formatValue(entry.bundle_path)}`);
    lines.push(`- status: ${formatValue(entry.status)}`);
    lines.push(`- request: ${formatValue(entry.request)}`);
    lines.push(`- provider/model: ${formatValue(entry.provider)} / ${formatValue(entry.model)}`);
    lines.push(`- routing mode: ${formatValue(entry.routing_mode)}`);
    lines.push(`- organization: ${formatValue(entry.organization.organization_id)} (${formatValue(entry.organization.name)})`);
    lines.push(`- workflow: ${formatValue(entry.workflow.workflow_id)} (${formatValue(entry.workflow.name)})`);
    lines.push(`- governance: ${formatValue(entry.governance.model)} / escalation target=${formatValue(entry.governance.escalation_target)}`);
    lines.push(`- happy path approval: ${formatValue(entry.branch_outcomes?.happy_path?.approval_status)}`);
    lines.push(`- signal reopen: ${formatValue(entry.branch_outcomes?.signal_reopen?.reopen_status)}`);
    lines.push(`- escalation reopen: ${formatValue(entry.branch_outcomes?.escalation_reopen?.resolution_status)}`);
    lines.push(`- escalation approve: ${formatValue(entry.branch_outcomes?.escalation_approve?.resolution_status)}`);
    lines.push(`- escalation stop: ${formatValue(entry.branch_outcomes?.escalation_stop?.resolution_status)}`);
    lines.push(`- observed provider stages: ${formatValue(entry.provider_observability.observed_stage_count)}`);
    if (entry.provider_observability.observed_stages.length > 0) {
      for (const stage of entry.provider_observability.observed_stages) {
        lines.push(
          `- ${stage.stage_key}: stage=${formatValue(stage.stage)}, observed=${formatValue(stage.observed_step_count)}/${formatValue(stage.step_count)}, execution_id=${formatValue(stage.execution_id)}`
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function verifyHistoryCommand(options) {
  if (!Array.isArray(options.inputs) || options.inputs.length === 0) {
    throw new Error("At least one --input is required for `verify-history`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-history`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const entries = [];
  const sources = [];

  for (const input of options.inputs) {
    const bundlePath = await resolveBundlePath(input);
    const bundle = await readJson(bundlePath, "verification bundle");
    entries.push(summarizeBundle(bundle, bundlePath, path.resolve(input)));
    sources.push(path.resolve(input));
  }

  const history = {
    artifact_type: "verification-history",
    generated_at: nowIso(),
    entry_count: entries.length,
    sources,
    summary: buildHistorySummary(entries),
    entries
  };

  const historyJsonPath = await writeJsonArtifact(
    path.join(artifactDir, "verification-history.json"),
    history
  );
  const historyReportPath = await writeTextArtifact(
    path.join(artifactDir, "verification-history.md"),
    formatHistoryReport(history)
  );

  return {
    ok: true,
    status: "completed",
    artifactDir,
    historyJsonPath,
    historyReportPath,
    entryCount: entries.length,
    providers: history.summary.providers,
    workflows: history.summary.workflows
  };
}
