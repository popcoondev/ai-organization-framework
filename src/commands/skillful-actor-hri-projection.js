import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "../runtime/project-paths.js";
import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";

export function resolveSkillfulActorHriProjectionsRoot(projectRoot) {
  return path.join(projectRoot, ".aof", "artifacts", "skillful-actor", "hri-projections");
}

async function listJsonFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(dirPath, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function readJsonArtifact(projectRoot, artifactRef, schemaName, label) {
  const artifactPath = path.resolve(projectRoot, artifactRef);
  const payload = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  await validateWithBundledSchema(payload, schemaName, label);
  return payload;
}

export async function loadLatestSkillfulActorHriProjection(projectRoot) {
  const projectionRoot = resolveSkillfulActorHriProjectionsRoot(projectRoot);
  const projectionPaths = await listJsonFiles(projectionRoot);
  if (projectionPaths.length === 0) {
    return null;
  }
  const projections = await Promise.all(projectionPaths.map(async (projectionPath) => {
    const payload = JSON.parse(await fs.readFile(projectionPath, "utf8"));
    await validateWithBundledSchema(payload, "aof-skillful-actor-hri-projection.schema.json", "skillful actor HRI projection");
    return {
      payload,
      artifactRef: path.relative(projectRoot, projectionPath).replaceAll("\\", "/")
    };
  }));
  return projections.sort((left, right) => String(right.payload.recorded_at ?? "").localeCompare(String(left.payload.recorded_at ?? "")))[0];
}

function benchmarkStatus(benchmark) {
  return benchmark.summary?.failed === 0 ? "pass" : "fail";
}

function buildProofChain({
  packetRef,
  evaluationRef,
  gateRef,
  benchmarkRef,
  packet,
  evaluation,
  gate,
  benchmark
}) {
  return [
    {
      step: "actor-skill-packet",
      artifact_ref: packetRef,
      state: packet.status,
      why_it_matters: "Defines the assigned actor, required skills, capability evidence, resources, policies, output contract, and HRI speech surface."
    },
    {
      step: "actor-assignment-evaluation",
      artifact_ref: evaluationRef,
      state: evaluation.assignment_decision.assignment_state,
      why_it_matters: "Turns the skill packet into an explicit selected, degraded, or blocked assignment decision before execution."
    },
    {
      step: "resource-and-policy-gate",
      artifact_ref: gateRef,
      state: `${gate.resource_gate.state}/${gate.policy_gate.state}`,
      why_it_matters: "Shows whether the actor has the required resources and policy clearance before work starts."
    },
    {
      step: "actor-execution-gate",
      artifact_ref: gateRef,
      state: gate.gate_decision.execution_gate_state,
      why_it_matters: "Records the final execution gate state and visible blocker or council-review requirement."
    },
    {
      step: "skillful-actor-benchmark",
      artifact_ref: benchmarkRef,
      state: benchmarkStatus(benchmark),
      why_it_matters: "Proves the runtime rejects fake green states for missing skills, weak assignments, resource gaps, policy bypass, stale release state, and output contract mismatch."
    }
  ];
}

export async function skillfulActorHriProjectionCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const projectionId = options.projectionId || makeId("SAHRI");
  const packetRef = options.actorSkillPacketRef;
  const evaluationRef = options.actorAssignmentEvaluationRef;
  const gateRef = options.actorExecutionGateRef;
  const benchmarkRef = options.skillfulActorBenchmarkRef;

  const [packet, evaluation, gate, benchmark] = await Promise.all([
    readJsonArtifact(projectRoot, packetRef, "aof-actor-skill-packet.schema.json", "actor skill packet"),
    readJsonArtifact(projectRoot, evaluationRef, "aof-actor-assignment-evaluation.schema.json", "actor assignment evaluation"),
    readJsonArtifact(projectRoot, gateRef, "aof-actor-execution-gate.schema.json", "actor execution gate"),
    readJsonArtifact(projectRoot, benchmarkRef, "aof-skillful-actor-benchmark.schema.json", "skillful actor benchmark")
  ]);

  if (evaluation.actor_skill_packet_ref !== packetRef) {
    throw new Error("Actor assignment evaluation does not reference the supplied actor skill packet.");
  }
  if (gate.actor_assignment_evaluation_ref !== evaluationRef) {
    throw new Error("Actor execution gate does not reference the supplied actor assignment evaluation.");
  }
  if (gate.actor_skill_packet_ref !== packetRef) {
    throw new Error("Actor execution gate does not reference the supplied actor skill packet.");
  }

  const benchmarkState = benchmarkStatus(benchmark);
  const councilReviewNeeded = gate.gate_decision.execution_gate_state === "requires-council-review" || evaluation.review_required === true;
  const visibleBlockers = [
    ...(gate.hri_projection.visible_blockers ?? []),
    ...(benchmarkState === "pass" ? [] : ["skillful actor benchmark failed"])
  ];

  const payload = {
    projection_type: "skillful-actor-hri-projection",
    projection_format_version: 1,
    recorded_at: nowIso(),
    projection_id: projectionId,
    source_task_id: options.sourceTaskId || gate.source_task_id || evaluation.source_task_id || packet.source_task_id || null,
    source_parent_session_id: options.sourceParentSessionId || gate.source_parent_session_id || evaluation.source_parent_session_id || packet.source_parent_session_id || null,
    source_decision_record_id: options.sourceDecisionRecordId || gate.source_decision_record_id || evaluation.source_decision_record_id || packet.source_decision_record_id || null,
    actor_skill_packet_ref: packetRef,
    actor_assignment_evaluation_ref: evaluationRef,
    actor_execution_gate_ref: gateRef,
    skillful_actor_benchmark_ref: benchmarkRef,
    actor: {
      actor_ref: gate.assignment.actor_ref,
      role_ref: gate.assignment.role_ref,
      team_ref: gate.assignment.team_ref,
      character_label: gate.hri_projection.character_label,
      execution_mode: gate.assignment.execution_mode
    },
    visible_state: {
      assignment_state: evaluation.assignment_decision.assignment_state,
      execution_gate_state: gate.gate_decision.execution_gate_state,
      confidence_label: evaluation.hri_projection.confidence_label,
      benchmark_status: benchmarkState,
      council_review_needed: councilReviewNeeded,
      speech_bubble: gate.hri_projection.speech_bubble,
      current_action: gate.hri_projection.current_action,
      visible_blockers: visibleBlockers,
      next_action: gate.gate_decision.recommended_action
    },
    self_hosting_proof_chain: buildProofChain({
      packetRef,
      evaluationRef,
      gateRef,
      benchmarkRef,
      packet,
      evaluation,
      gate,
      benchmark
    })
  };

  await validateWithBundledSchema(payload, "aof-skillful-actor-hri-projection.schema.json", "skillful actor HRI projection");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveSkillfulActorHriProjectionsRoot(projectRoot), `${projectionId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    projectionId,
    payload,
    aofRoot
  };
}
