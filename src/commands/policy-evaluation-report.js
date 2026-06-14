import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolvePolicyEvaluationsRoot } from "./allocation-artifact-helpers.js";

export async function policyEvaluationReportCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const evaluationId = options.evaluationId || makeId("PER");
  const payload = {
    report_type: "policy-evaluation-report",
    recorded_at: nowIso(),
    evaluation_id: evaluationId,
    subject_ref: options.subjectRef,
    evaluation_scope: options.evaluationScope,
    policy_refs: options.policyRefs ?? [],
    overall_outcome: options.overallOutcome,
    results: options.results ?? [],
    recommended_actions: options.recommendedActions ?? [],
    source_task_id: options.sourceTaskId || null,
    source_parent_session_id: options.sourceParentSessionId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-policy-evaluation-report.schema.json", "policy evaluation report");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolvePolicyEvaluationsRoot(projectRoot), `${evaluationId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    evaluationId,
    payload
  };
}
