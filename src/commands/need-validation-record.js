import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import * as discoveryRoots from "./discovery-artifact-helpers.js";

export async function needValidationRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const validationId = options.validationId || makeId("NVR");
  const payload = {
    record_type: "need-validation-record",
    recorded_at: nowIso(),
    validation_id: validationId,
    raw_need: options.rawNeed,
    validation_status: options.validationStatus,
    validated_need: options.validatedNeed || null,
    decision_summary: options.decisionSummary,
    authority_action: options.authorityAction,
    project_creation_recommendation: options.projectCreationRecommendation,
    validation_questions_answered: options.validationQuestionsAnswered ?? [],
    hidden_assumptions: options.hiddenAssumptions ?? [],
    evidence_gaps: options.evidenceGaps ?? [],
    problem_statement_ref: options.problemStatementRef,
    value_hypothesis_ref: options.valueHypothesisRef,
    alternative_analysis_ref: options.alternativeAnalysisRef,
    experiment_proposal_ref: options.experimentProposalRef || null,
    project_charter_ref: options.projectCharterRef || null,
    discovery_handoff_ref: options.discoveryHandoffRef || null,
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-need-validation-record.schema.json", "need validation record");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(discoveryRoots.resolveNeedValidationRecordsRoot(projectRoot), `${validationId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    validationId,
    payload
  };
}
