import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveAlternativeAnalysesRoot } from "./discovery-artifact-helpers.js";

export async function alternativeAnalysisRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const alternativeAnalysisId = options.alternativeAnalysisId || makeId("ALT");
  const payload = {
    artifact_type: "alternative-analysis",
    recorded_at: nowIso(),
    alternative_analysis_id: alternativeAnalysisId,
    subject_need: options.subjectNeed,
    alternative_solutions: options.alternativeSolutions ?? [],
    non_solution_options: options.nonSolutionOptions ?? [],
    defer_options: options.deferOptions ?? [],
    stop_options: options.stopOptions ?? [],
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-alternative-analysis.schema.json", "alternative analysis");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveAlternativeAnalysesRoot(projectRoot), `${alternativeAnalysisId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    alternativeAnalysisId,
    payload
  };
}
