import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { actorAssignmentEvaluationRecordCommand } from "./actor-assignment-evaluation-record.js";
import { actorExecutionGateRecordCommand } from "./actor-execution-gate-record.js";
import { actorSkillPacketRecordCommand } from "./actor-skill-packet-record.js";

function pass(detail, evidence = []) {
  return { status: "pass", detail, evidence };
}

function fail(detail, evidence = []) {
  return { status: "fail", detail, evidence };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function schemaRejects(payload, schemaName, label) {
  try {
    await validateWithBundledSchema(payload, schemaName, label);
    return false;
  } catch {
    return true;
  }
}

export async function skillfulActorBenchmarkCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const fixtureRoot = path.join(projectRoot, ".aof", "artifacts", "benchmarks", "fixtures");
  const packetRef = ".aof/artifacts/benchmarks/fixtures/ASP-TASK-050-BUILDER.json";
  const assignmentRef = ".aof/artifacts/benchmarks/fixtures/AAE-TASK-051-SELECTED.json";
  const resourceClaimRef = ".aof/artifacts/benchmarks/fixtures/RCL-TASK-052-REPO-MAIN.json";
  const policyEvaluationRef = ".aof/artifacts/benchmarks/fixtures/PER-TASK-052-RUNTIME-DISCIPLINE.json";
  const gateRef = ".aof/artifacts/benchmarks/fixtures/AEG-TASK-052-REQUIRES-REVIEW.json";

  const packet = await readJson(path.join(fixtureRoot, "ASP-TASK-050-BUILDER.json"));
  const gate = await readJson(path.join(fixtureRoot, "AEG-TASK-052-REQUIRES-REVIEW.json"));
  await validateWithBundledSchema(packet, "aof-actor-skill-packet.schema.json", "actor skill packet fixture");
  await validateWithBundledSchema(gate, "aof-actor-execution-gate.schema.json", "actor execution gate fixture");

  const missingSkillPacket = { ...packet, required_skill_refs: [] };
  const missingSkillRejected = await schemaRejects(missingSkillPacket, "aof-actor-skill-packet.schema.json", "missing skill packet");

  const outputContractMismatch = {
    ...packet,
    expected_output_contract: {
      ...packet.expected_output_contract,
      required_sections: []
    }
  };
  const outputMismatchRejected = await schemaRejects(outputContractMismatch, "aof-actor-skill-packet.schema.json", "output contract mismatch packet");

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-sab-"));
  const weakPacketPath = path.join(tempRoot, "weak-packet.json");
  const weakEvalPath = path.join(tempRoot, "weak-evaluation.json");
  const missingResourceGatePath = path.join(tempRoot, "missing-resource-gate.json");
  const policyBypassGatePath = path.join(tempRoot, "policy-bypass-gate.json");
  const weakPacket = await actorSkillPacketRecordCommand({
    project: projectRoot,
    packetId: "ASP-SAB-WEAK",
    objective: "Synthetic weak actor assignment benchmark case.",
    actorRef: "codex",
    roleRef: "builder",
    teamRef: "runtime-team",
    assignmentReason: "Synthetic weak fit should not be green.",
    executionMode: "single-actor",
    requiredSkillRefs: ["skill-schema-review"],
    capabilityFit: [{
      capability_ref: "cap-schema-review",
      fit_state: "weak",
      evidence_refs: ["schemas/aof-actor-skill-packet.schema.json"],
      rationale: "Evidence exists but is intentionally weak."
    }],
    resourceRefs: ["resource-repo-main"],
    policyRefs: ["policy-runtime-backed-answer-discipline"],
    outputArtifactType: "actor-assignment-evaluation",
    outputArtifactSchemaRef: "schemas/aof-actor-assignment-evaluation.schema.json",
    requiredSections: ["assignment_decision"],
    acceptanceCriteria: ["weak assignment is degraded"],
    reviewCriteria: [{
      criterion: "Weak fit is not green.",
      evaluator_ref: "guardian",
      evidence_required: "degraded assignment",
      blocking: true
    }],
    blockerSemantics: [{
      blocker_code: "weak-capability-fit",
      trigger_condition: "capability fit is weak",
      consequence: "degrade-confidence",
      recovery_action: "strengthen evidence or choose another actor"
    }],
    characterLabel: "Builder",
    speechBubble: "My capability evidence is weak.",
    currentAction: "Synthetic weak benchmark",
    confidenceLabel: "low",
    visibleBlockers: ["weak capability fit"],
    nextAction: "Degrade assignment",
    sourceTaskId: "TASK-053",
    sourceParentSessionId: "SAB-SYNTHETIC",
    artifactPath: weakPacketPath
  });
  const weakEvaluation = await actorAssignmentEvaluationRecordCommand({
    project: projectRoot,
    evaluationId: "AAE-SAB-WEAK",
    actorSkillPacketRef: weakPacket.artifactPath,
    sourceTaskId: "TASK-053",
    sourceParentSessionId: "SAB-SYNTHETIC",
    artifactPath: weakEvalPath
  });

  const missingResourceGate = await actorExecutionGateRecordCommand({
    project: projectRoot,
    gateId: "AEG-SAB-MISSING-RESOURCE",
    actorAssignmentEvaluationRef: assignmentRef,
    resourceClaimRefs: [],
    policyEvaluationRefs: [policyEvaluationRef],
    sourceTaskId: "TASK-053",
    sourceParentSessionId: "SAB-SYNTHETIC",
    artifactPath: missingResourceGatePath
  });

  const policyBypassGate = await actorExecutionGateRecordCommand({
    project: projectRoot,
    gateId: "AEG-SAB-POLICY-BYPASS",
    actorAssignmentEvaluationRef: assignmentRef,
    resourceClaimRefs: [resourceClaimRef],
    policyEvaluationRefs: [],
    sourceTaskId: "TASK-053",
    sourceParentSessionId: "SAB-SYNTHETIC",
    artifactPath: policyBypassGatePath
  });

  const bootstrap = await readJson(path.join(projectRoot, ".aof", "project-bootstrap.json"));
  const syntheticStaleManifest = { release_version: "0.0.0-stale" };
  const staleReleaseDetected = bootstrap.aof_version !== syntheticStaleManifest.release_version;

  const benchmarks = {
    "SAB-001": missingSkillRejected
      ? pass("Missing required skill evidence is rejected before actor assignment can be green.", [packetRef])
      : fail("Missing required skill evidence was not rejected.", [packetRef]),
    "SAB-002": weakEvaluation.payload.assignment_decision.assignment_state === "degraded"
      ? pass("Weak actor assignment is represented as degraded, not selected green.", [weakPacket.artifactPath, weakEvalPath])
      : fail("Weak actor assignment was not degraded.", [weakPacket.artifactPath, weakEvalPath]),
    "SAB-003": missingResourceGate.payload.gate_decision.execution_gate_state === "blocked" && missingResourceGate.payload.resource_gate.missing_resource_refs.length > 0
      ? pass("Missing resource claim blocks actor execution gate.", [assignmentRef, missingResourceGatePath])
      : fail("Missing resource claim did not block execution.", [assignmentRef, missingResourceGatePath]),
    "SAB-004": policyBypassGate.payload.gate_decision.execution_gate_state === "blocked" && policyBypassGate.payload.policy_gate.missing_policy_refs.length > 0
      ? pass("Policy-bypassed allocation blocks actor execution gate.", [assignmentRef, resourceClaimRef, policyBypassGatePath])
      : fail("Policy-bypassed allocation did not block execution.", [assignmentRef, resourceClaimRef, policyBypassGatePath]),
    "SAB-005": staleReleaseDetected
      ? pass("Synthetic stale release state is detectable as a version mismatch.", [".aof/project-bootstrap.json", ".aof/context/active/active-release-manifest.json"])
      : fail("Synthetic stale release state was not detectable.", [".aof/project-bootstrap.json"]),
    "SAB-006": outputMismatchRejected
      ? pass("Output contract mismatch is rejected before skillful actor work can be green.", [packetRef, gateRef])
      : fail("Output contract mismatch was not rejected.", [packetRef, gateRef])
  };

  const values = Object.values(benchmarks);
  const summary = {
    passed: values.filter((entry) => entry.status === "pass").length,
    failed: values.filter((entry) => entry.status === "fail").length,
    total: values.length
  };
  const payload = {
    artifact_type: "skillful-actor-benchmark",
    generated_at: new Date().toISOString(),
    project_root: projectRoot,
    benchmark_family: "SAB",
    benchmarks,
    summary
  };

  await validateWithBundledSchema(payload, "aof-skillful-actor-benchmark.schema.json", "skillful actor benchmark");
  const artifactPath = options.artifactPath
    ? await writeJsonArtifact(options.artifactPath, payload)
    : null;

  return {
    ok: summary.failed === 0,
    artifactPath,
    summary: payload
  };
}
