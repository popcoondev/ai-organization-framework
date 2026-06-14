import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveResourceClaimsRoot } from "./allocation-artifact-helpers.js";

export async function resourceClaimRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const claimId = options.claimId || makeId("RCL");
  const payload = {
    claim_type: "resource-claim",
    recorded_at: nowIso(),
    claim_id: claimId,
    subject_ref: options.subjectRef,
    resource_ref: options.resourceRef,
    claimant_role_ref: options.claimantRoleRef,
    claim_scope: options.claimScope,
    claim_status: options.claimStatus,
    approval_policy_refs: options.approvalPolicyRefs ?? [],
    justification: options.justification,
    allocation_plan_ref: options.allocationPlanRef || null,
    policy_evaluation_ref: options.policyEvaluationRef || null,
    expires_at: options.expiresAt || null,
    source_task_id: options.sourceTaskId || null,
    source_parent_session_id: options.sourceParentSessionId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-resource-claim.schema.json", "resource claim");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveResourceClaimsRoot(projectRoot), `${claimId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    claimId,
    payload
  };
}
