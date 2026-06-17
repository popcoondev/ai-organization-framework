import { buildModelInputPacket } from "./packet.js";

const STAGE_MATRIX = {
  clarification: {
    primary: "Visionary",
    participants: [],
    approvalMode: "single"
  },
  planning: {
    primary: "Builder",
    participants: [{ role: "Visionary", mode: "required" }],
    approvalMode: "single"
  },
  proposal: {
    primary: "Builder",
    participants: [
      { role: "Visionary", mode: "required" },
      { role: "Guardian", mode: "optional" }
    ],
    approvalMode: "single"
  },
  review: {
    primary: "Guardian",
    participants: [
      { role: "Visionary", mode: "optional" },
      { role: "Builder", mode: "required" }
    ],
    approvalMode: "review-with-veto"
  },
  approval: {
    primary: "Visionary",
    participants: [
      { role: "Builder", mode: "required" },
      { role: "Guardian", mode: "required" }
    ],
    approvalMode: "sequential-all-seat"
  }
};

const FAST_TRACK_STAGE_MATRIX = {
  clarification: {
    primary: "Visionary",
    participants: [],
    approvalMode: "single"
  },
  planning: {
    primary: "Builder",
    participants: [],
    approvalMode: "single"
  },
  proposal: {
    primary: "Builder",
    participants: [],
    approvalMode: "single"
  },
  review: {
    primary: "Guardian",
    participants: [],
    approvalMode: "single"
  },
  approval: {
    primary: "Guardian",
    participants: [],
    approvalMode: "single-reviewer"
  }
};

function resolveReopenRole(session, roleOverride) {
  if (roleOverride) {
    return roleOverride;
  }

  const triggerClasses = session.clarification?.trigger_classes ?? [];
  if (triggerClasses.includes("high-stakes-risk")) {
    return "Guardian";
  }
  if (triggerClasses.includes("external-signal")) {
    return "Visionary";
  }
  return "Visionary";
}

function stageConfigFor(stage, session, roleOverride) {
  if (stage === "reopen") {
    const primary = resolveReopenRole(session, roleOverride);
    const participants = primary === "Guardian"
      ? [{ role: "Builder", mode: "required" }]
      : [{ role: "Builder", mode: "optional" }, { role: "Guardian", mode: "optional" }];
    return {
      primary,
      participants,
      approvalMode: "single"
    };
  }

  const routingMode = session.routing_mode ?? "deep-path";
  const matrix = routingMode === "fast-track" ? FAST_TRACK_STAGE_MATRIX : STAGE_MATRIX;
  const config = matrix[stage];
  if (!config) {
    throw new Error(`Unsupported council stage: ${stage}`);
  }
  return config;
}

function buildSeatPlan({ template, session, stage, role, mode, lane }) {
  return {
    role,
    participation_mode: mode,
    lane,
    packet: buildModelInputPacket({
      template,
      session,
      stage,
      roleOverride: role
    })
  };
}

export function buildCouncilExecutionPlan({ template, session, stage, includeOptional = false, roleOverride = "" }) {
  const config = stageConfigFor(stage, session, roleOverride);
  const primary = buildSeatPlan({
    template,
    session,
    stage,
    role: config.primary,
    mode: "primary",
    lane: "primary"
  });

  const participants = config.participants
    .filter((participant) => participant.mode === "required" || includeOptional)
    .map((participant) =>
      buildSeatPlan({
        template,
        session,
        stage,
        role: participant.role,
        mode: participant.mode,
        lane: "follow-up"
      })
    );

  return {
    stage,
    routing_mode: session.routing_mode ?? "deep-path",
    execution_model: "single-instance-role-switching",
    primary_role: config.primary,
    approval_mode: config.approvalMode,
    seats: [primary, ...participants]
  };
}
