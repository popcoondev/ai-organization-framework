import { buildCouncilExecutionPlan } from "./council.js";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`.toUpperCase();
}

function summarizeSeatStep(seat) {
  return `prepare ${seat.role} ${seat.packet.metadata.stage} call as ${seat.participation_mode}`;
}

function summarizeRun(plan) {
  const roles = plan.seats.map((seat) => seat.role).join(" -> ");
  return `prototype council execution prepared ${plan.seats.length} seat calls in ${plan.execution_model}: ${roles}`;
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
