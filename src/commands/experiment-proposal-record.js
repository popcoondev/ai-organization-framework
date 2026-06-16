import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveExperimentProposalsRoot } from "./discovery-artifact-helpers.js";

export async function experimentProposalRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const experimentProposalId = options.experimentProposalId || makeId("EXP");
  const payload = {
    artifact_type: "experiment-proposal",
    recorded_at: nowIso(),
    experiment_proposal_id: experimentProposalId,
    assumption_to_test: options.assumptionToTest,
    smallest_testable_validation: options.smallestTestableValidation,
    expected_learning: options.expectedLearning,
    expected_cost: options.expectedCost,
    success_threshold: options.successThreshold,
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-experiment-proposal.schema.json", "experiment proposal");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveExperimentProposalsRoot(projectRoot), `${experimentProposalId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    experimentProposalId,
    payload
  };
}
