import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveDiscoveryJudgmentsRoot } from "./discovery-artifact-helpers.js";

export async function discoveryJudgmentPacketCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const judgmentId = options.judgmentId || makeId("DJP");
  const payload = {
    packet_type: "discovery-judgment-packet",
    recorded_at: nowIso(),
    judgment_id: judgmentId,
    council_id: options.councilId,
    judgment_status: options.judgmentStatus,
    decision_summary: options.decisionSummary,
    rationale: options.rationale,
    desirability_assessment: options.desirabilityAssessment,
    feasibility_assessment: options.feasibilityAssessment,
    risk_assessment: options.riskAssessment,
    evidence_quality_state: options.evidenceQualityState,
    recommended_next_step: options.recommendedNextStep,
    question_set_refs: options.questionSetRefs ?? [],
    artifact_refs: options.artifactRefs ?? [],
    follow_up_questions: options.followUpQuestions ?? [],
    promotion_ready: options.promotionReady ?? false,
    handoff_required: options.handoffRequired ?? false,
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-discovery-judgment-packet.schema.json", "discovery judgment packet");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveDiscoveryJudgmentsRoot(projectRoot), `${judgmentId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    judgmentId,
    payload
  };
}
