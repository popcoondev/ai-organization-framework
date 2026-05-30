// Stage-to-primary-role mapping from docs/stage-role-matrix.md
const STAGE_PRIMARY_ROLE = {
  clarification: "Visionary",
  planning: "Builder",
  framed: "Builder",
  proposal: "Builder",
  review: "Guardian",
  approval: null,
  reopen: null,
};

const STAGE_GOAL = {
  clarification: "clarify need/intent/context before downstream work",
  planning: "build an execution plan from clarified need and constraints",
  framed: "build an execution plan from clarified need and constraints",
  proposal: "compose a structured proposal from the plan",
  review: "evaluate the proposal for quality, safety, and governance fit",
  approval: "reach final approval or veto on the proposal",
  reopen: "reframe or re-plan based on the trigger",
};

const STAGE_OUTPUT = {
  clarification: "clarification-questions",
  planning: "plan",
  framed: "plan",
  proposal: "proposal",
  review: "review-or-rejection",
  approval: "approval-decision",
  reopen: "reopen-recommendation",
};

function findActorWithRole(actors, role) {
  return actors.find(
    (actor) => Array.isArray(actor.roles) && actor.roles.includes(role)
  );
}

function deriveContextFrame(session) {
  const clarification = session.clarification ?? {};
  const userAnswers = Array.isArray(clarification.user_answers) ? clarification.user_answers : [];
  const request = session.trigger?.request_payload ?? "";

  if (session.status === "framed" && userAnswers.length > 0) {
    const needAnswer = userAnswers.find(
      (a) => Array.isArray(a.target_fields) && a.target_fields.includes("need")
    );
    const intentAnswer = userAnswers.find(
      (a) =>
        Array.isArray(a.target_fields) &&
        (a.target_fields.includes("intent") || a.target_fields.includes("success_criteria"))
    );
    const contextParts = userAnswers
      .filter(
        (a) => Array.isArray(a.target_fields) && a.target_fields.includes("context")
      )
      .map((a) => a.answer);

    return {
      need: needAnswer?.answer ?? request,
      intent: intentAnswer?.answer ?? "to be refined in planning",
      active_context: contextParts.length > 0 ? contextParts.join("; ") : request,
      context_snapshot_id: session.context_snapshot_id ?? null,
      clarifications_or_assumptions: clarification.clarification_summary ?? null,
    };
  }

  return {
    need: "to be framed during clarification",
    intent: "to be framed during clarification",
    active_context: request,
    context_snapshot_id: session.context_snapshot_id ?? null,
    clarifications_or_assumptions: clarification.clarification_summary ?? null,
  };
}

export function buildPacket(session, template, stage) {
  const effectiveStage = stage ?? session.current_stage ?? "clarification";

  if (!(effectiveStage in STAGE_PRIMARY_ROLE)) {
    const valid = Object.keys(STAGE_PRIMARY_ROLE).join(", ");
    throw new Error(`Unknown stage: '${effectiveStage}'. Valid stages: ${valid}`);
  }

  const primaryRole = STAGE_PRIMARY_ROLE[effectiveStage];

  let actor;
  let activeRole;

  if (primaryRole === null) {
    actor = template.actors[0];
    activeRole = effectiveStage === "approval" ? "all-seat" : "trigger-based";
  } else {
    actor = findActorWithRole(template.actors, primaryRole);
    if (!actor) {
      throw new Error(
        `No actor with role '${primaryRole}' found in template for stage '${effectiveStage}'.`
      );
    }
    activeRole = primaryRole;
  }

  const actorFrame = {
    actor_id: actor.actor_id,
    actor_kind: actor.kind,
    active_role: activeRole,
    capabilities: actor.capabilities ?? [],
    policy_profile: template.policies.default_priority_order,
  };

  const governanceFrame = {
    governance_model: template.governance.model,
    governance_scope: template.workflow.default_governance_scope,
    routing_mode: session.routing_mode ?? "deep-path",
    decision_rule: template.governance.decision_rules.default,
  };

  const contextFrame = deriveContextFrame(session);

  const taskFrame = {
    request: session.trigger?.request_payload ?? "",
    current_goal: STAGE_GOAL[effectiveStage],
    expected_output_kind: STAGE_OUTPUT[effectiveStage],
  };

  const evidenceFrame = {
    relevant_decisions: session.open_decision_ids ?? [],
    relevant_artifacts: [],
    relevant_signals: [],
  };

  return {
    session_id: session.session_id,
    decision_id: (session.open_decision_ids ?? [])[0] ?? null,
    thread_id: session.session_id,
    stage: effectiveStage,
    call_purpose: `generate-${STAGE_OUTPUT[effectiveStage]}`,
    actor: actorFrame,
    governance: governanceFrame,
    context: contextFrame,
    task: taskFrame,
    evidence: evidenceFrame,
  };
}
