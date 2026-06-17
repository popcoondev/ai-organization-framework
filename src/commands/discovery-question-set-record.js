import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveDiscoveryQuestionSetsRoot } from "./discovery-artifact-helpers.js";

export async function discoveryQuestionSetRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const questionSetId = options.questionSetId || makeId("DQS");
  const payload = {
    artifact_type: "discovery-question-set",
    recorded_at: nowIso(),
    question_set_id: questionSetId,
    discovery_objective: options.discoveryObjective,
    key_questions: options.keyQuestions ?? [],
    target_assumptions: options.targetAssumptions ?? [],
    target_anomalies: options.targetAnomalies ?? [],
    target_user_or_market_slice: options.targetUserOrMarketSlice,
    stop_continue_pivot_signals: options.stopContinuePivotSignals ?? [],
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null,
    notes: options.notes || null
  };

  await validateWithBundledSchema(payload, "aof-discovery-question-set.schema.json", "discovery question set");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveDiscoveryQuestionSetsRoot(projectRoot), `${questionSetId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    questionSetId,
    payload
  };
}
