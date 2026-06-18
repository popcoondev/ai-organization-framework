import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "../runtime/project-paths.js";
import { nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";

const TASK_STATUSES = ["open", "assigned", "done", "archived", "retired"];

async function readJson(filePath, label) {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function countTaskFiles(tasksRoot, status) {
  const statusRoot = path.join(tasksRoot, status);
  try {
    const entries = await fs.readdir(statusRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

async function listDecisionRecords(decisionsRoot) {
  try {
    const entries = await fs.readdir(decisionsRoot, { withFileTypes: true });
    const decisionPaths = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(decisionsRoot, entry.name));
    return Promise.all(decisionPaths.map((filePath) => readJson(filePath, `decision record ${path.basename(filePath)}`)));
  } catch {
    return [];
  }
}

function isDecisionEscalationUnresolved(record) {
  const status = typeof record.escalation_status === "string" ? record.escalation_status.trim().toLowerCase() : "";
  if (!status) {
    return false;
  }
  return !["resolved", "closed", "none", "approved", "stopped"].includes(status);
}

export async function organizationAnalyticsSnapshotCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const organization = await readJson(path.join(aofRoot, "organization.json"), "organization");
  const generatedAt = nowIso();

  const tasksRoot = path.join(aofRoot, "tasks");
  const taskFlow = Object.fromEntries(
    await Promise.all(TASK_STATUSES.map(async (status) => [`${status}_count`, await countTaskFiles(tasksRoot, status)]))
  );

  const contracts = Array.isArray(organization.contracts) ? organization.contracts : [];
  const artifactPresentCount = (
    await Promise.all(
      contracts.map(async (contract) => {
        if (!contract.artifact_ref) {
          return false;
        }
        return pathExists(path.resolve(projectRoot, contract.artifact_ref));
      })
    )
  ).filter(Boolean).length;

  const dependencies = Array.isArray(organization.dependencies) ? organization.dependencies : [];
  const activeDependencies = dependencies.filter((entry) => entry.status === "active");
  const inboundCounts = new Map();
  for (const dependency of activeDependencies) {
    inboundCounts.set(dependency.to_ref, (inboundCounts.get(dependency.to_ref) ?? 0) + 1);
  }
  const bottleneckRefCount = [...inboundCounts.values()].filter((count) => count > 1).length;

  const decisions = await listDecisionRecords(path.join(aofRoot, "decisions"));
  const unresolvedCount = decisions.filter(isDecisionEscalationUnresolved).length;

  const observations = [];
  if (taskFlow.open_count > taskFlow.done_count + taskFlow.retired_count) {
    observations.push("Open work currently outweighs closed work in the local task inventory.");
  }
  if (contracts.length > 0 && artifactPresentCount < contracts.length) {
    observations.push("At least one declared contract artifact is missing from the repository.");
  }
  if (bottleneckRefCount > 0) {
    observations.push("Multiple active dependencies converge on the same destination node.");
  }
  if (unresolvedCount > 0) {
    observations.push("There are unresolved decision escalations in the current decision archive.");
  }
  if (observations.length === 0) {
    observations.push("No immediate organization bottleneck was detected from the current local artifact set.");
  }

  const payload = {
    snapshot_type: "aof-organization-analytics",
    snapshot_format_version: 1,
    organization_ref: ".aof/organization.json",
    generated_at: generatedAt,
    task_flow: taskFlow,
    contract_health: {
      declared_count: contracts.length,
      artifact_present_count: artifactPresentCount,
      coverage_ratio: contracts.length === 0 ? 1 : artifactPresentCount / contracts.length
    },
    dependency_health: {
      declared_count: dependencies.length,
      active_count: activeDependencies.length,
      bottleneck_ref_count: bottleneckRefCount
    },
    escalation_health: {
      decision_count: decisions.length,
      unresolved_count: unresolvedCount
    },
    observations
  };

  await validateWithBundledSchema(payload, "aof-organization-analytics.schema.json", "organization analytics snapshot");
  const artifactPath = await writeJsonArtifact(path.join(aofRoot, "context", "active", "organization-analytics.json"), payload);

  return {
    ok: true,
    artifactPath,
    payload
  };
}
