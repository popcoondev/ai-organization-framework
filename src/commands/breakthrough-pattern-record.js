import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveBreakthroughPatternsRoot } from "./discovery-artifact-helpers.js";

export async function breakthroughPatternRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const patternId = options.patternId || makeId("BTP");
  const payload = {
    record_type: "breakthrough-pattern-record",
    recorded_at: nowIso(),
    pattern_id: patternId,
    source_domain: options.sourceDomain,
    triggering_tension: options.triggeringTension,
    broken_assumption: options.brokenAssumption,
    enabling_tool_or_method: options.enablingToolOrMethod,
    transfer_hypothesis: options.transferHypothesis,
    expected_relevance: options.expectedRelevance,
    evidence_refs: options.evidenceRefs ?? [],
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null,
    notes: options.notes || null
  };

  await validateWithBundledSchema(payload, "aof-breakthrough-pattern-record.schema.json", "breakthrough pattern record");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveBreakthroughPatternsRoot(projectRoot), `${patternId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    patternId,
    payload
  };
}
