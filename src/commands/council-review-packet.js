import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { EXECUTION_STAGES, resolveCouncilReviewsRoot } from "./execution-artifact-helpers.js";

export async function councilReviewPacketCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const reviewPacketId = options.reviewPacketId || makeId("CREV");
  const payload = {
    packet_type: "council-review-packet",
    recorded_at: nowIso(),
    review_packet_id: reviewPacketId,
    council_id: options.councilId,
    stage: options.stage,
    review_status: options.reviewStatus,
    decision_summary: options.decisionSummary,
    rationale: options.rationale,
    recommendation: options.recommendation,
    target_audience: options.targetAudience || null,
    expected_user_reaction: options.expectedUserReaction || null,
    blocking_reasons: options.blockingReasons ?? [],
    artifact_change_recommendations: options.artifactChangeRecommendations ?? [],
    organization_change_recommendations: options.organizationChangeRecommendations ?? [],
    diagnosis_category: options.diagnosisCategory || null,
    diagnosis_confidence: options.diagnosisConfidence ?? null,
    diagnosis_evidence_refs: options.diagnosisEvidenceRefs ?? [],
    human_override_signal: options.humanOverrideSignal || null,
    team_output_refs: options.teamOutputRefs ?? [],
    role_result_refs: options.roleResultRefs ?? [],
    evidence_refs: options.evidenceRefs ?? [],
    follow_up_task_ids: options.followUpTaskIds ?? [],
    escalation_required: options.escalationRequired ?? false,
    source_task_id: options.sourceTaskId || null,
    source_parent_session_id: options.sourceParentSessionId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  if (!EXECUTION_STAGES.includes(payload.stage)) {
    throw new Error("Invalid --stage for `council-review-packet`.");
  }

  await validateWithBundledSchema(payload, "aof-council-review-packet.schema.json", "council review packet");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveCouncilReviewsRoot(projectRoot), `${reviewPacketId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    payload
  };
}
