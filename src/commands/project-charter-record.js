import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import * as discoveryRoots from "./discovery-artifact-helpers.js";

export async function projectCharterRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const projectCharterId = options.projectCharterId || makeId("PCH");
  const payload = {
    artifact_type: "project-charter",
    recorded_at: nowIso(),
    project_charter_id: projectCharterId,
    validated_need_ref: options.validatedNeedRef,
    validated_objective: options.validatedObjective,
    scope: options.scope ?? [],
    constraints: options.constraints ?? [],
    expected_outcomes: options.expectedOutcomes ?? [],
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-project-charter.schema.json", "project charter");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(discoveryRoots.resolveProjectChartersRoot(projectRoot), `${projectCharterId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    projectCharterId,
    payload
  };
}
