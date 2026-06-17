import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "../runtime/project-memory.js";
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

async function listJsonArtifacts(rootPath, label) {
  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    const filePaths = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(rootPath, entry.name))
      .sort();
    return Promise.all(filePaths.map((filePath) => readJson(filePath, `${label} ${path.basename(filePath)}`)));
  } catch {
    return [];
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

export async function metricsSnapshotCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const generatedAt = nowIso();
  const organizationRef = ".aof/organization.json";
  const organization = await readJson(path.join(aofRoot, "organization.json"), "organization");
  const tasksRoot = path.join(aofRoot, "tasks");
  const decisionsRoot = path.join(aofRoot, "decisions");
  const allocationRoot = path.join(aofRoot, "artifacts", "allocation");
  const allocationPlansRoot = path.join(allocationRoot, "plans");
  const policyEvaluationsRoot = path.join(allocationRoot, "policy-evaluations");
  const resourceClaimsRoot = path.join(allocationRoot, "resource-claims");

  const taskCounts = Object.fromEntries(
    await Promise.all(TASK_STATUSES.map(async (status) => [status, await countTaskFiles(tasksRoot, status)]))
  );

  const contracts = Array.isArray(organization.contracts) ? organization.contracts : [];
  const contractPresentCount = (
    await Promise.all(
      contracts.map(async (contract) => {
        if (!contract.artifact_ref) {
          return false;
        }
        return pathExists(path.resolve(projectRoot, contract.artifact_ref));
      })
    )
  ).filter(Boolean).length;

  const decisions = await listDecisionRecords(decisionsRoot);
  const unresolvedEscalationCount = decisions.filter(isDecisionEscalationUnresolved).length;
  const [allocationPlans, policyEvaluations, resourceClaims] = await Promise.all([
    listJsonArtifacts(allocationPlansRoot, "allocation plan"),
    listJsonArtifacts(policyEvaluationsRoot, "policy evaluation"),
    listJsonArtifacts(resourceClaimsRoot, "resource claim")
  ]);
  const approvalRequiredAllocationCount = allocationPlans.reduce(
    (sum, plan) => sum + (Array.isArray(plan.recommended_allocations)
      ? plan.recommended_allocations.filter((entry) => entry.approval_required === true).length
      : 0),
    0
  );
  const policyReviewLoadCount = policyEvaluations.filter((report) => (
    ["requires-review", "requires-approval", "escalate"].includes(String(report.overall_outcome ?? ""))
  )).length;
  const openResourceClaimCount = resourceClaims.filter((claim) => String(claim.claim_status ?? "") === "requested").length;
  const governedAllocationReviewLoad = policyReviewLoadCount + openResourceClaimCount;

  const observedMetrics = [
    {
      metric_key: "task-open-count",
      name: "Open Task Count",
      value: taskCounts.open,
      unit: "tasks",
      source: ".aof/tasks/open",
      mapped_declared_metric_id: null
    },
    {
      metric_key: "task-throughput-total",
      name: "Task Throughput Total",
      value: taskCounts.done + taskCounts.archived + taskCounts.retired,
      unit: "tasks",
      source: ".aof/tasks",
      mapped_declared_metric_id: null
    },
    {
      metric_key: "contract-coverage-ratio",
      name: "Contract Coverage Ratio",
      value: contracts.length === 0 ? 1 : contractPresentCount / contracts.length,
      unit: "ratio",
      source: ".aof/organization.json",
      mapped_declared_metric_id: "contract-coverage"
    },
    {
      metric_key: "unresolved-escalation-count",
      name: "Unresolved Escalation Count",
      value: unresolvedEscalationCount,
      unit: "decisions",
      source: ".aof/decisions",
      mapped_declared_metric_id: "release-risk"
    },
    {
      metric_key: "decision-record-count",
      name: "Decision Record Count",
      value: decisions.length,
      unit: "decisions",
      source: ".aof/decisions",
      mapped_declared_metric_id: null
    },
    {
      metric_key: "allocation-plan-count",
      name: "Allocation Plan Count",
      value: allocationPlans.length,
      unit: "artifacts",
      source: ".aof/artifacts/allocation/plans",
      mapped_declared_metric_id: null
    },
    {
      metric_key: "policy-evaluation-count",
      name: "Policy Evaluation Count",
      value: policyEvaluations.length,
      unit: "artifacts",
      source: ".aof/artifacts/allocation/policy-evaluations",
      mapped_declared_metric_id: null
    },
    {
      metric_key: "resource-claim-count",
      name: "Resource Claim Count",
      value: resourceClaims.length,
      unit: "artifacts",
      source: ".aof/artifacts/allocation/resource-claims",
      mapped_declared_metric_id: null
    },
    {
      metric_key: "approval-required-allocation-count",
      name: "Approval-Required Allocation Count",
      value: approvalRequiredAllocationCount,
      unit: "allocations",
      source: ".aof/artifacts/allocation/plans",
      mapped_declared_metric_id: "release-risk"
    },
    {
      metric_key: "allocation-review-load",
      name: "Allocation Review Load",
      value: governedAllocationReviewLoad,
      unit: "reviews",
      source: ".aof/artifacts/allocation",
      mapped_declared_metric_id: "allocation-review-load"
    },
    {
      metric_key: "open-resource-claim-count",
      name: "Open Resource Claim Count",
      value: openResourceClaimCount,
      unit: "claims",
      source: ".aof/artifacts/allocation/resource-claims",
      mapped_declared_metric_id: null
    }
  ];

  const payload = {
    snapshot_type: "aof-metrics-snapshot",
    snapshot_format_version: 1,
    organization_ref: organizationRef,
    generated_at: generatedAt,
    declared_metric_ids: Array.isArray(organization.metrics)
      ? organization.metrics.map((metric) => metric.metric_id)
      : [],
    observed_metrics: observedMetrics
  };

  await validateWithBundledSchema(payload, "aof-metrics-snapshot.schema.json", "metrics snapshot");
  const artifactPath = await writeJsonArtifact(path.join(aofRoot, "context", "active", "metrics-snapshot.json"), payload);

  return {
    ok: true,
    artifactPath,
    payload
  };
}
