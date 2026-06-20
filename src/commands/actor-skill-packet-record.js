import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";

export function resolveActorSkillPacketsRoot(projectRoot) {
  return path.join(projectRoot, ".aof", "artifacts", "actor-skill-packets");
}

export async function actorSkillPacketRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const packetId = options.packetId || makeId("ASP");
  const payload = {
    packet_type: "actor-skill-packet",
    packet_format_version: 1,
    recorded_at: nowIso(),
    packet_id: packetId,
    source_task_id: options.sourceTaskId || null,
    source_parent_session_id: options.sourceParentSessionId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null,
    objective: options.objective,
    assignment: {
      actor_ref: options.actorRef || null,
      role_ref: options.roleRef,
      team_ref: options.teamRef || null,
      assignment_reason: options.assignmentReason,
      execution_mode: options.executionMode
    },
    required_skill_refs: options.requiredSkillRefs ?? [],
    capability_fit: options.capabilityFit ?? [],
    resource_refs: options.resourceRefs ?? [],
    policy_refs: options.policyRefs ?? [],
    expected_output_contract: {
      artifact_type: options.outputArtifactType,
      artifact_schema_ref: options.outputArtifactSchemaRef || null,
      required_sections: options.requiredSections ?? [],
      acceptance_criteria: options.acceptanceCriteria ?? []
    },
    review_criteria: options.reviewCriteria ?? [],
    blocker_semantics: options.blockerSemantics ?? [],
    hri_projection: {
      character_label: options.characterLabel,
      speech_bubble: options.speechBubble,
      current_action: options.currentAction,
      confidence_label: options.confidenceLabel,
      visible_blockers: options.visibleBlockers ?? [],
      next_action: options.nextAction
    },
    status: options.status || "draft"
  };

  await validateWithBundledSchema(payload, "aof-actor-skill-packet.schema.json", "actor skill packet");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveActorSkillPacketsRoot(projectRoot), packetId + ".json"),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    packetId,
    payload
  };
}
