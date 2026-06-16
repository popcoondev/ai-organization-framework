import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import * as discoveryRoots from "./discovery-artifact-helpers.js";

export async function valueHypothesisRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const valueHypothesisId = options.valueHypothesisId || makeId("VHY");
  const payload = {
    artifact_type: "value-hypothesis",
    recorded_at: nowIso(),
    value_hypothesis_id: valueHypothesisId,
    expected_value_creation: options.expectedValueCreation,
    beneficiary: options.beneficiary,
    supporting_evidence: options.supportingEvidence ?? [],
    success_criteria: options.successCriteria ?? [],
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-value-hypothesis.schema.json", "value hypothesis");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(discoveryRoots.resolveValueHypothesesRoot(projectRoot), `${valueHypothesisId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    valueHypothesisId,
    payload
  };
}
