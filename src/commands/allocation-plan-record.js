import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveAllocationPlansRoot } from "./allocation-artifact-helpers.js";

export async function allocationPlanRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const allocationPlanId = options.allocationPlanId || makeId("APL");
  const payload = {
    plan_type: "allocation-plan",
    recorded_at: nowIso(),
    allocation_plan_id: allocationPlanId,
    subject_ref: options.subjectRef,
    target_role_refs: options.targetRoleRefs ?? [],
    candidate_resource_refs: options.candidateResourceRefs ?? [],
    recommended_allocations: options.recommendedAllocations ?? [],
    unfilled_role_refs: options.unfilledRoleRefs ?? [],
    policy_refs: options.policyRefs ?? [],
    risk_notes: options.riskNotes ?? [],
    source_task_id: options.sourceTaskId || null,
    source_parent_session_id: options.sourceParentSessionId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-allocation-plan.schema.json", "allocation plan");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveAllocationPlansRoot(projectRoot), `${allocationPlanId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    allocationPlanId,
    payload
  };
}
