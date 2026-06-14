import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveAssumptionMapsRoot } from "./discovery-artifact-helpers.js";

export async function assumptionMapRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const assumptionMapId = options.assumptionMapId || makeId("ASM");
  const payload = {
    artifact_type: "assumption-map",
    recorded_at: nowIso(),
    assumption_map_id: assumptionMapId,
    subject: options.subject,
    assumptions: options.assumptions ?? [],
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-assumption-map.schema.json", "assumption map");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveAssumptionMapsRoot(projectRoot), `${assumptionMapId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    assumptionMapId,
    payload
  };
}
