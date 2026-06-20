import fs from "node:fs/promises";
import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";

export function resolveActorAssignmentEvaluationsRoot(projectRoot) {
  return path.join(projectRoot, ".aof", "artifacts", "actor-assignment-evaluations");
}

function countByFitState(capabilityFit) {
  const counts = {
    strong_count: 0,
    sufficient_count: 0,
    weak_count: 0,
    missing_count: 0,
    blocked_count: 0,
    evidence_ref_count: 0
  };
  for (const fit of capabilityFit) {
    if (fit.fit_state === "strong") counts.strong_count += 1;
    if (fit.fit_state === "sufficient") counts.sufficient_count += 1;
    if (fit.fit_state === "weak") counts.weak_count += 1;
    if (fit.fit_state === "missing") counts.missing_count += 1;
    if (fit.fit_state === "blocked") counts.blocked_count += 1;
    counts.evidence_ref_count += Array.isArray(fit.evidence_refs) ? fit.evidence_refs.length : 0;
  }
  return counts;
}

function deriveMissingEvidence(capabilityFit) {
  return capabilityFit
    .filter((fit) => fit.fit_state === "missing" || fit.fit_state === "blocked" || !Array.isArray(fit.evidence_refs) || fit.evidence_refs.length === 0)
    .map((fit) => ({
      capability_ref: fit.capability_ref,
      reason: fit.fit_state === "missing" || fit.fit_state === "blocked"
        ? 'fit_state is ' + fit.fit_state
        : "capability evidence_refs is empty"
    }));
}

function deriveDecision(packet, summary, missingEvidence) {
  if (packet.status === "blocked" || summary.blocked_count > 0 || summary.missing_count > 0 || missingEvidence.length > 0) {
    return {
      assignment_state: "blocked",
      confidence_label: "blocked",
      rationale: "Assignment is blocked because required capability evidence is missing or blocked.",
      recommended_action: "Add missing capability evidence or choose a better-fit actor before execution."
    };
  }

  if (summary.weak_count > 0) {
    return {
      assignment_state: "degraded",
      confidence_label: "low",
      rationale: "Assignment can proceed only with visible risk because at least one capability fit is weak.",
      recommended_action: "Proceed only with review visibility or strengthen capability evidence."
    };
  }

  const allStrong = summary.strong_count > 0 && summary.sufficient_count === 0;
  return {
    assignment_state: "selected",
    confidence_label: allStrong ? "high" : "medium",
    rationale: "Assignment has sufficient skill and capability evidence to proceed to governed execution.",
    recommended_action: "Proceed to resource and policy gate evaluation."
  };
}

export async function actorAssignmentEvaluationRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const evaluationId = options.evaluationId || makeId("AAE");
  const packetRef = options.actorSkillPacketRef;
  const packetPath = path.resolve(projectRoot, packetRef);
  const packet = JSON.parse(await fs.readFile(packetPath, "utf8"));
  await validateWithBundledSchema(packet, "aof-actor-skill-packet.schema.json", "actor skill packet");

  const capabilityFit = packet.capability_fit ?? [];
  const summary = countByFitState(capabilityFit);
  const missingEvidence = deriveMissingEvidence(capabilityFit);
  const decision = deriveDecision(packet, summary, missingEvidence);
  const reviewRequired = (packet.review_criteria ?? []).some((criterion) => criterion.blocking === true);
  const visibleBlockers = [
    ...(packet.hri_projection?.visible_blockers ?? []),
    ...missingEvidence.map((entry) => 'missing evidence: ' + entry.capability_ref)
  ];

  const payload = {
    evaluation_type: "actor-assignment-evaluation",
    evaluation_format_version: 1,
    recorded_at: nowIso(),
    evaluation_id: evaluationId,
    actor_skill_packet_ref: packetRef,
    actor_skill_packet_id: packet.packet_id,
    source_task_id: options.sourceTaskId || packet.source_task_id || null,
    source_parent_session_id: options.sourceParentSessionId || packet.source_parent_session_id || null,
    source_decision_record_id: options.sourceDecisionRecordId || packet.source_decision_record_id || null,
    assignment: {
      actor_ref: packet.assignment.actor_ref ?? null,
      role_ref: packet.assignment.role_ref,
      team_ref: packet.assignment.team_ref ?? null,
      execution_mode: packet.assignment.execution_mode
    },
    required_skill_refs: packet.required_skill_refs,
    capability_fit_summary: summary,
    assignment_decision: decision,
    missing_evidence: missingEvidence,
    review_required: reviewRequired,
    hri_projection: {
      character_label: packet.hri_projection.character_label,
      speech_bubble: decision.assignment_state === "blocked"
        ? "I need stronger capability evidence before I should act."
        : packet.hri_projection.speech_bubble,
      current_action: packet.hri_projection.current_action,
      confidence_label: decision.confidence_label,
      visible_state: decision.assignment_state,
      visible_blockers: visibleBlockers,
      next_action: decision.recommended_action
    }
  };

  await validateWithBundledSchema(payload, "aof-actor-assignment-evaluation.schema.json", "actor assignment evaluation");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveActorAssignmentEvaluationsRoot(projectRoot), evaluationId + ".json"),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    evaluationId,
    payload
  };
}
