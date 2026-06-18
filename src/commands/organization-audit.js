import path from "node:path";

import { decisionRegisterCommand } from "./decision-register.js";
import { decisionVerifyCommand } from "./decision-verify.js";
import { organizationVerifyCommand } from "./organization-verify.js";
import { loadTaskState, summarizeDuplicateTasks } from "./operator-surface-helpers.js";
import { nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { resolveAofRoot } from "../runtime/project-paths.js";

export async function organizationAuditCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const [organizationVerify, taskState] = await Promise.all([
    organizationVerifyCommand({ project: projectRoot }),
    loadTaskState(projectRoot)
  ]);

  let decisionVerify;
  let decisionRegister;
  try {
    decisionVerify = await decisionVerifyCommand({ project: projectRoot });
  } catch (error) {
    decisionRegister = await decisionRegisterCommand({ project: projectRoot });
    decisionVerify = {
      ok: decisionRegister.decisions.every((entry) => entry.markdown_present),
      summary: {
        total_checks: decisionRegister.decision_count,
        passed_checks: decisionRegister.decisions.filter((entry) => entry.markdown_present).length,
        failed_checks: decisionRegister.decisions.filter((entry) => !entry.markdown_present).length
      },
      checks: decisionRegister.decisions.map((entry) => ({
        name: `decision register fallback ${entry.decision_id}`,
        status: entry.markdown_present ? "pass" : "fail",
        detail: entry.canonical_markdown_path
      })),
      errors: decisionRegister.decisions
        .filter((entry) => !entry.markdown_present)
        .map((entry) => `decision markdown missing ${entry.decision_id}: ${entry.canonical_markdown_path}`),
      fallback_reason: error instanceof Error ? error.message : String(error)
    };
  }

  const duplicateTasks = summarizeDuplicateTasks(taskState.taskIndex);
  const taskChecks = [
    {
      name: "task lifecycle duplicates",
      status: duplicateTasks.length === 0 ? "pass" : "fail",
      detail: duplicateTasks.length === 0
        ? "No duplicate task ids were found across lifecycle directories."
        : `${duplicateTasks.length} duplicate task id(s) were found across lifecycle directories.`
    }
  ];

  const errors = [
    ...(organizationVerify.errors ?? []),
    ...(decisionVerify.errors ?? []),
    ...(duplicateTasks.length === 0
      ? []
      : duplicateTasks.map((duplicate) => `task duplicate ${duplicate.task_id}: ${duplicate.lifecycle_locations.map((entry) => entry.status_dir).join(", ")}`))
  ];

  const payload = {
    audit_type: "aof-organization-audit",
    recorded_at: nowIso(),
    project_root: projectRoot,
    ok: errors.length === 0,
    organization_verify: {
      ok: organizationVerify.ok,
      summary: organizationVerify.summary
    },
    decision_verify: {
      ok: decisionVerify.ok,
      summary: decisionVerify.summary,
      fallback_reason: decisionVerify.fallback_reason ?? null
    },
    task_integrity: {
      ok: duplicateTasks.length === 0,
      duplicate_task_count: duplicateTasks.length,
      duplicate_tasks: duplicateTasks
    },
    checks: [
      ...(organizationVerify.checks ?? []),
      ...(decisionVerify.checks ?? []),
      ...taskChecks
    ],
    errors
  };

  const artifactPath = await writeJsonArtifact(path.join(aofRoot, "context", "active", "organization-audit.json"), payload);

  return {
    ok: payload.ok,
    projectRoot,
    artifactPath,
    payload
  };
}
