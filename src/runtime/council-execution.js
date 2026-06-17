import { buildCouncilExecutionPlan } from "./council.js";
import { invokeModel } from "../sdk/model-adapter.js";
import { makeId, nowIso } from "./utils.js";

function summarizeSeatStep(seat) {
  return `prepare ${seat.role} ${seat.packet.metadata.stage} call as ${seat.participation_mode}`;
}

function summarizeRun(plan) {
  const roles = plan.seats.map((seat) => seat.role).join(" -> ");
  return `prototype council execution prepared ${plan.seats.length} seat calls in ${plan.execution_model}: ${roles}`;
}

function buildApprovalOutcome(steps) {
  const seatSignals = steps.map((step) => ({
    role: step.role,
    recommendation: step.result?.decision_signal?.recommendation ?? "unknown",
    veto: step.result?.decision_signal?.veto ?? false
  }));
  const guardian = seatSignals.find((signal) => signal.role === "Guardian");
  const guardianVetoUsed = Boolean(guardian?.veto);
  const anyReject = seatSignals.some((signal) => signal.recommendation === "reject");
  const allApprove = seatSignals.length > 0 && seatSignals.every((signal) => signal.recommendation === "approve");
  const status = guardianVetoUsed || anyReject
    ? "rejected"
    : allApprove
      ? "approved"
      : "pending";

  return {
    status,
    guardian_veto_used: guardianVetoUsed,
    required_seat_count: seatSignals.length,
    seat_signals: seatSignals
  };
}

export function executeCouncilStage({ template, session, stage, includeOptional = false, roleOverride = "" }) {
  const plan = buildCouncilExecutionPlan({
    template,
    session,
    stage,
    includeOptional,
    roleOverride
  });
  const startedAt = nowIso();
  const executionId = makeId("crun");

  const steps = plan.seats.map((seat, index) => ({
    step_id: `${executionId}-STEP-${String(index + 1).padStart(2, "0")}`,
    role: seat.role,
    participation_mode: seat.participation_mode,
    lane: seat.lane,
    call_purpose: seat.packet.metadata.call_purpose,
    status: "prepared",
    summary: summarizeSeatStep(seat),
    packet: seat.packet
  }));

  return {
    execution_id: executionId,
    stage,
    routing_mode: plan.routing_mode,
    execution_model: plan.execution_model,
    primary_role: plan.primary_role,
    approval_mode: plan.approval_mode,
    status: "prepared",
    started_at: startedAt,
    completed_at: startedAt,
    summary: summarizeRun(plan),
    steps
  };
}

export async function executeCouncilStageWithModel({
  template,
  session,
  stage,
  includeOptional = false,
  roleOverride = "",
  modelConfig = {}
}) {
  const prepared = executeCouncilStage({
    template,
    session,
    stage,
    includeOptional,
    roleOverride
  });

  const completedSteps = [];
  for (const seat of prepared.steps) {
    const startedAt = nowIso();
    let result;
    try {
      result = await invokeModel(seat.packet, modelConfig);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Model invocation failed for ${seat.role} during ${stage}: ${detail}`
      );
    }
    completedSteps.push({
      ...seat,
      status: "completed",
      started_at: startedAt,
      completed_at: nowIso(),
      result
    });
  }

  const execution = {
    ...prepared,
    status: "completed",
    completed_at: nowIso(),
    summary: `${prepared.summary} with ${completedSteps.length} completed model calls`,
    steps: completedSteps
  };

  if (stage === "approval" || prepared.approval_mode === "sequential-all-seat") {
    execution.approval_outcome = buildApprovalOutcome(completedSteps);
    execution.summary = `${execution.summary}; approval status: ${execution.approval_outcome.status}`;
  }

  return execution;
}
