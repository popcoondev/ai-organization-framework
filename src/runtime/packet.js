const PRIMARY_ROLE_BY_STAGE = {
  clarification: "Visionary",
  planning: "Builder",
  proposal: "Builder",
  review: "Guardian"
};

const CALL_PURPOSE_BY_STAGE = {
  clarification: "generate-clarification-questions",
  planning: "generate-plan",
  proposal: "generate-proposal",
  review: "generate-review",
  approval: "generate-approval-recommendation",
  reopen: "generate-reopen-recommendation"
};

const CURRENT_GOAL_BY_STAGE = {
  clarification: "clarify need, intent, context, and constraints",
  planning: "prepare the next executable plan from the framed request",
  proposal: "produce a proposal aligned with governance and policy",
  review: "evaluate proposal quality, safety, and failure modes",
  approval: "produce approval guidance across the required seats",
  reopen: "recommend reframing or re-entry direction"
};

const OUTPUT_KIND_BY_STAGE = {
  clarification: "clarification-questions",
  planning: "plan",
  proposal: "proposal",
  review: "review",
  approval: "approval-recommendation",
  reopen: "reopen-recommendation"
};

function firstActorWithRole(actors, role) {
  return actors.find((actor) => Array.isArray(actor.roles) && actor.roles.includes(role));
}

function requireRoleForStage(stage, role) {
  if (!role && (stage === "approval" || stage === "reopen")) {
    throw new Error(`Stage '${stage}' requires an explicit role override in the prototype packet builder.`);
  }
}

function resolveRole(stage, roleOverride) {
  if (roleOverride) {
    return roleOverride;
  }
  const role = PRIMARY_ROLE_BY_STAGE[stage];
  if (!role) {
    throw new Error(`Unsupported stage for packet assembly: ${stage}`);
  }
  return role;
}

export function buildModelInputPacket({ template, session, stage, roleOverride }) {
  requireRoleForStage(stage, roleOverride);
  const activeRole = resolveRole(stage, roleOverride);
  const actor = firstActorWithRole(template.actors, activeRole);
  if (!actor) {
    throw new Error(`No actor found for role '${activeRole}'.`);
  }

  const currentGoal = CURRENT_GOAL_BY_STAGE[stage] ?? "advance the workflow";
  const expectedOutputKind = OUTPUT_KIND_BY_STAGE[stage] ?? "artifact";
  const callPurpose = CALL_PURPOSE_BY_STAGE[stage] ?? "runtime-call";
  const policyProfile = actor.policy_profile ?? template.policies.policy_profile_id;
  const decisionId = session.open_decision_ids?.[0] ?? null;
  const framing = session.framing ?? {
    request: session.trigger.request_payload,
    need: "to be framed",
    intent: "to be framed",
    active_context: "not yet framed",
    clarifications_or_assumptions: "not yet framed"
  };

  return {
    metadata: {
      session_id: session.session_id,
      decision_id: decisionId,
      stage,
      call_purpose: callPurpose
    },
    actor: {
      actor_id: actor.actor_id,
      actor_kind: actor.kind,
      active_role: activeRole,
      capabilities: actor.capabilities,
      policy_profile: policyProfile
    },
    governance: {
      governance_model: template.governance.model,
      governance_scope: template.workflow.default_governance_scope,
      routing_mode: session.routing_mode,
      decision_rule: template.governance.decision_rules.default,
      veto_rule: template.governance.decision_rules.default.includes("guardian-veto")
        ? "Guardian"
        : null
    },
    context: {
      need: framing.need,
      intent: framing.intent,
      active_context: framing.active_context,
      context_snapshot_id: session.context_snapshot_id,
      clarifications_or_assumptions: framing.clarifications_or_assumptions
    },
    task: {
      request: session.trigger.request_payload,
      current_goal: currentGoal,
      expected_output_kind: expectedOutputKind
    },
    evidence: {
      relevant_artifacts: session.artifact_refs ?? [],
      relevant_decisions: session.open_decision_ids ?? [],
      relevant_signals: session.signal_refs ?? []
    }
  };
}
