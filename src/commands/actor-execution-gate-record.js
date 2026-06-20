import fs from "node:fs/promises";
import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";

export function resolveActorExecutionGatesRoot(projectRoot) {
  return path.join(projectRoot, ".aof", "artifacts", "actor-execution-gates");
}

async function readJsonArtifact(projectRoot, artifactRef, schemaName, label) {
  const artifactPath = path.resolve(projectRoot, artifactRef);
  const payload = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  await validateWithBundledSchema(payload, schemaName, label);
  return payload;
}

function summarizeResourceClaims(resourceClaims) {
  return resourceClaims.map(({ artifactRef, payload }) => ({
    artifact_ref: artifactRef,
    resource_ref: payload.resource_ref,
    claim_status: payload.claim_status,
    claimant_role_ref: payload.claimant_role_ref
  }));
}

function summarizePolicyEvaluations(policyEvaluations) {
  return policyEvaluations.map(({ artifactRef, payload }) => ({
    artifact_ref: artifactRef,
    policy_refs: payload.policy_refs,
    overall_outcome: payload.overall_outcome
  }));
}

function deriveResourceGate(requiredResourceRefs, resourceClaims) {
  const claimedResources = new Set(resourceClaims.map(({ payload }) => payload.resource_ref));
  const missing = requiredResourceRefs.filter((resourceRef) => !claimedResources.has(resourceRef));
  const statuses = resourceClaims.map(({ payload }) => payload.claim_status);
  const hasDenied = statuses.includes("denied") || statuses.includes("released");
  const hasRequested = statuses.includes("requested");

  const state = missing.length > 0 || hasDenied
    ? "blocked"
    : hasRequested
      ? "requires-council-review"
      : "allowed";

  return {
    state,
    required_resource_refs: requiredResourceRefs,
    claim_refs: resourceClaims.map(({ artifactRef }) => artifactRef),
    missing_resource_refs: missing,
    claim_summaries: summarizeResourceClaims(resourceClaims)
  };
}

function derivePolicyGate(requiredPolicyRefs, policyEvaluations) {
  const evaluatedPolicies = new Set(policyEvaluations.flatMap(({ payload }) => payload.policy_refs));
  const missing = requiredPolicyRefs.filter((policyRef) => !evaluatedPolicies.has(policyRef));
  const outcomes = policyEvaluations.map(({ payload }) => payload.overall_outcome);
  const hasBlockingOutcome = outcomes.includes("denied") || outcomes.includes("escalate");
  const needsReview = outcomes.includes("requires-approval") || outcomes.includes("requires-review");

  const state = missing.length > 0 || hasBlockingOutcome
    ? "blocked"
    : needsReview
      ? "requires-council-review"
      : "allowed";

  return {
    state,
    required_policy_refs: requiredPolicyRefs,
    evaluation_refs: policyEvaluations.map(({ artifactRef }) => artifactRef),
    missing_policy_refs: missing,
    evaluation_summaries: summarizePolicyEvaluations(policyEvaluations)
  };
}

function deriveGateDecision(assignmentEvaluation, resourceGate, policyGate) {
  const assignmentState = assignmentEvaluation.assignment_decision.assignment_state;
  if (assignmentState === "blocked" || resourceGate.state === "blocked" || policyGate.state === "blocked") {
    return {
      execution_gate_state: "blocked",
      rationale: "Execution is blocked because assignment, resource, or policy evidence is missing or explicitly blocking.",
      recommended_action: "Resolve missing resource claims or policy evaluations before execution."
    };
  }

  if (resourceGate.state === "requires-council-review" || policyGate.state === "requires-council-review") {
    return {
      execution_gate_state: "requires-council-review",
      rationale: "Execution requires council review because a resource claim or policy evaluation is not fully allowed.",
      recommended_action: "Submit the gate packet to council review before actor execution."
    };
  }

  if (assignmentState === "degraded") {
    return {
      execution_gate_state: "degraded",
      rationale: "Execution can proceed only with visible risk because actor assignment is degraded.",
      recommended_action: "Proceed only with explicit review visibility and stronger evidence follow-up."
    };
  }

  return {
    execution_gate_state: "allowed",
    rationale: "Assignment, resource claims, and policy evaluations are explicit and non-blocking.",
    recommended_action: "Proceed to governed actor execution."
  };
}

function deriveVisibleBlockers(resourceGate, policyGate, decision) {
  const blockers = [];
  for (const resourceRef of resourceGate.missing_resource_refs) {
    blockers.push('missing resource claim: ' + resourceRef);
  }
  for (const policyRef of policyGate.missing_policy_refs) {
    blockers.push('missing policy evaluation: ' + policyRef);
  }
  for (const claim of resourceGate.claim_summaries) {
    if (["requested", "denied", "released"].includes(claim.claim_status)) {
      blockers.push('resource ' + claim.resource_ref + ' is ' + claim.claim_status);
    }
  }
  for (const evaluation of policyGate.evaluation_summaries) {
    if (["requires-approval", "requires-review", "escalate", "denied"].includes(evaluation.overall_outcome)) {
      blockers.push('policy outcome ' + evaluation.overall_outcome + ': ' + evaluation.policy_refs.join(", "));
    }
  }
  if (decision.execution_gate_state === "allowed") {
    return [];
  }
  return blockers.length > 0 ? blockers : [decision.execution_gate_state];
}

function speechForDecision(decision) {
  if (decision.execution_gate_state === "allowed") {
    return "Resources and policies are explicit; I can execute under the gate.";
  }
  if (decision.execution_gate_state === "requires-council-review") {
    return "I need council review before I should execute.";
  }
  if (decision.execution_gate_state === "degraded") {
    return "I can proceed only with visible risk and review.";
  }
  return "I should not execute until resource and policy evidence is complete.";
}

export async function actorExecutionGateRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const gateId = options.gateId || makeId("AEG");
  const assignmentEvaluationRef = options.actorAssignmentEvaluationRef;
  const assignmentEvaluation = await readJsonArtifact(
    projectRoot,
    assignmentEvaluationRef,
    "aof-actor-assignment-evaluation.schema.json",
    "actor assignment evaluation"
  );
  const actorSkillPacketRef = assignmentEvaluation.actor_skill_packet_ref;
  const actorSkillPacket = await readJsonArtifact(
    projectRoot,
    actorSkillPacketRef,
    "aof-actor-skill-packet.schema.json",
    "actor skill packet"
  );
  const resourceClaims = await Promise.all((options.resourceClaimRefs ?? []).map(async (artifactRef) => ({
    artifactRef,
    payload: await readJsonArtifact(projectRoot, artifactRef, "aof-resource-claim.schema.json", "resource claim")
  })));
  const policyEvaluations = await Promise.all((options.policyEvaluationRefs ?? []).map(async (artifactRef) => ({
    artifactRef,
    payload: await readJsonArtifact(projectRoot, artifactRef, "aof-policy-evaluation-report.schema.json", "policy evaluation report")
  })));

  const resourceGate = deriveResourceGate(actorSkillPacket.resource_refs ?? [], resourceClaims);
  const policyGate = derivePolicyGate(actorSkillPacket.policy_refs ?? [], policyEvaluations);
  const decision = deriveGateDecision(assignmentEvaluation, resourceGate, policyGate);
  const visibleBlockers = deriveVisibleBlockers(resourceGate, policyGate, decision);

  const payload = {
    gate_type: "actor-execution-gate",
    gate_format_version: 1,
    recorded_at: nowIso(),
    gate_id: gateId,
    actor_assignment_evaluation_ref: assignmentEvaluationRef,
    actor_skill_packet_ref: actorSkillPacketRef,
    source_task_id: options.sourceTaskId || assignmentEvaluation.source_task_id || null,
    source_parent_session_id: options.sourceParentSessionId || assignmentEvaluation.source_parent_session_id || null,
    source_decision_record_id: options.sourceDecisionRecordId || assignmentEvaluation.source_decision_record_id || null,
    assignment: {
      actor_ref: assignmentEvaluation.assignment.actor_ref,
      role_ref: assignmentEvaluation.assignment.role_ref,
      team_ref: assignmentEvaluation.assignment.team_ref,
      execution_mode: assignmentEvaluation.assignment.execution_mode,
      assignment_state: assignmentEvaluation.assignment_decision.assignment_state
    },
    resource_gate: resourceGate,
    policy_gate: policyGate,
    gate_decision: decision,
    hri_projection: {
      character_label: assignmentEvaluation.hri_projection.character_label,
      speech_bubble: speechForDecision(decision),
      current_action: assignmentEvaluation.hri_projection.current_action,
      visible_state: decision.execution_gate_state,
      visible_blockers: visibleBlockers,
      next_action: decision.recommended_action
    }
  };

  await validateWithBundledSchema(payload, "aof-actor-execution-gate.schema.json", "actor execution gate");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveActorExecutionGatesRoot(projectRoot), gateId + ".json"),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    gateId,
    payload
  };
}
