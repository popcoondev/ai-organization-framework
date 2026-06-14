import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveDiscoveryHandoffsRoot } from "./discovery-artifact-helpers.js";

export async function discoveryHandoffRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const handoffId = options.handoffId || makeId("DHO");
  const payload = {
    packet_type: "discovery-to-delivery-handoff",
    recorded_at: nowIso(),
    handoff_id: handoffId,
    selected_need: options.selectedNeed,
    intended_user_or_segment: options.intendedUserOrSegment,
    context_summary: options.contextSummary,
    hypothesis: options.hypothesis,
    evidence_refs: options.evidenceRefs ?? [],
    rejected_alternatives: options.rejectedAlternatives ?? [],
    explicit_risks: options.explicitRisks ?? [],
    delivery_validation_requirements: options.deliveryValidationRequirements ?? [],
    need: options.need,
    intent: options.intent,
    context: options.context,
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-discovery-handoff.schema.json", "discovery handoff");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveDiscoveryHandoffsRoot(projectRoot), `${handoffId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    handoffId,
    payload
  };
}
