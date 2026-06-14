import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { EXECUTION_STAGES, resolveRoleResultsRoot } from "./execution-artifact-helpers.js";

export async function roleResultRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const roleResultId = options.roleResultId || makeId("RRES");
  const payload = {
    result_type: "role-result",
    recorded_at: nowIso(),
    role: options.role,
    stage: options.stage,
    session_id: options.sessionId,
    status: options.status,
    recommendation: options.recommendation,
    rationale: options.rationale,
    signals: options.signals ?? [],
    artifact_refs: options.artifactRefs ?? [],
    decision_required: options.decisionRequired ?? false,
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null,
    source_parent_session_id: options.sourceParentSessionId || null,
    blocking_reason: options.blockingReason || null,
    missing_inputs: options.missingInputs?.length ? options.missingInputs : null,
    confidence: options.confidence ?? null
  };

  if (!EXECUTION_STAGES.includes(payload.stage)) {
    throw new Error("Invalid --stage for `role-result-record`.");
  }

  await validateWithBundledSchema(payload, "aof-role-result.schema.json", "role result");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveRoleResultsRoot(projectRoot), `${roleResultId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    roleResultId,
    payload
  };
}
