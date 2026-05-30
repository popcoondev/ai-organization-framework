import fs from "node:fs/promises";
import path from "node:path";
import { deriveInitialClarification } from "./clarification.js";
import { deriveFramingFromClarification } from "./framing.js";
import { ensureDir, makeId, nowIso } from "./utils.js";
import { validateWithBundledSchema } from "./validation.js";

const LOW_SIGNAL_ANSWER_PATTERNS = [
  /^n\/a$/i,
  /^na$/i,
  /^none$/i,
  /^nope$/i,
  /^unknown$/i,
  /^unclear$/i,
  /^not sure$/i,
  /^tbd$/i,
  /^idk$/i,
  /^わからない$/,
  /^不明$/,
  /^未定$/,
  /^なし$/
];

async function writeSession(sessionPath, session) {
  const { __session_path: _internalSessionPath, ...persistedSession } = session;
  await validateWithBundledSchema(persistedSession, "aof-session.schema.json", "session");
  await fs.writeFile(sessionPath, `${JSON.stringify(persistedSession, null, 2)}\n`, "utf8");
}

function makeContextSnapshotId() {
  return makeId("ctx");
}

function makeEscalationId() {
  return makeId("esc");
}

function isLowSignalAnswer(answer) {
  const text = String(answer ?? "").trim();
  return text.length < 4 || LOW_SIGNAL_ANSWER_PATTERNS.some((pattern) => pattern.test(text));
}

function buildFollowupQuestion(answeredPair, sourceQuestion) {
  return {
    question: `先ほどの回答ではまだ判断材料が足りません。${sourceQuestion.question} について、もう少し具体的に教えてください`,
    rationale: `The earlier answer for '${sourceQuestion.question}' was too weak to close the gap, so a concrete follow-up is required before planning.`,
    trigger_class: sourceQuestion.trigger_class,
    target_fields: answeredPair.target_fields
  };
}

export async function loadSession(sessionPath) {
  const text = await fs.readFile(sessionPath, "utf8");
  const session = JSON.parse(text);
  await validateWithBundledSchema(session, "aof-session.schema.json", "session");
  return {
    ...session,
    __session_path: sessionPath
  };
}

export async function persistSession(session) {
  await writeSession(session.__session_path, session);
}

function resolveRoutingMode(template, routingModeOverride) {
  const routingMode = routingModeOverride ?? template.workflow.default_routing_mode ?? "deep-path";
  if (!["fast-track", "deep-path"].includes(routingMode)) {
    throw new Error(`Unsupported routing mode: ${routingMode}`);
  }
  return routingMode;
}

export async function createInitialSession({ projectRoot, request, template, routingModeOverride }) {
  const createdAt = nowIso();
  const sessionId = makeId("sess");
  const triggerId = makeId("trg");
  const sessionsDir = path.join(projectRoot, ".aof", template.manifest.state.sessions);
  await ensureDir(sessionsDir);
  const routingMode = resolveRoutingMode(template, routingModeOverride);
  const clarification = deriveInitialClarification(request, template);
  const status = clarification.should_wait_for_user ? "waiting_user" : "clarification";

  const session = {
    session_id: sessionId,
    workflow_id: template.workflowId,
    organization_id: template.organization.organization_id,
    status,
    trigger: {
      trigger_id: triggerId,
      trigger_type: "cli",
      received_at: createdAt,
      request_payload: request
    },
    current_stage: "clarification",
    routing_mode: routingMode,
    context_snapshot_id: null,
    open_decision_ids: [],
    closed_decision_ids: [],
    clarification: {
      round_count: 1,
      ...clarification
    },
    created_at: createdAt,
    updated_at: createdAt
  };

  const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
  await writeSession(sessionPath, session);

  return {
    ...session,
    __session_path: sessionPath
  };
}

export async function attachOpenDecision(session, decisionId) {
  const updatedAt = nowIso();
  const nextSession = {
    ...session,
    open_decision_ids: [...session.open_decision_ids, decisionId],
    updated_at: updatedAt
  };
  await writeSession(session.__session_path, nextSession);
  return {
    ...nextSession,
    __session_path: session.__session_path
  };
}

export async function applyClarificationAnswers(session, responses) {
  if (session.current_stage !== "clarification") {
    throw new Error("Session is not in clarification stage.");
  }

  if (session.status !== "waiting_user" && session.status !== "clarification") {
    throw new Error(`Session is not ready to accept clarification answers: ${session.status}`);
  }

  const pendingQuestions = session.clarification.pending_questions ?? [];
  if (pendingQuestions.length === 0) {
    throw new Error("There are no pending clarification questions on this session.");
  }

  if (responses.length > pendingQuestions.length) {
    throw new Error("Received more responses than pending clarification questions.");
  }

  const answeredPairs = responses.map((answer, index) => ({
    question: pendingQuestions[index].question,
    answer,
    target_fields: pendingQuestions[index].target_fields
  }));

  const remainingPending = pendingQuestions.slice(responses.length);
  const weakAnswerPairs = answeredPairs
    .map((item, index) => ({ answered: item, source: pendingQuestions[index] }))
    .filter(({ answered }) => isLowSignalAnswer(answered.answer));
  const followupBudget = session.clarification.question_budget?.followup_budget ?? 0;
  const generatedFollowups = remainingPending.length === 0 && weakAnswerPairs.length > 0
    ? weakAnswerPairs.slice(0, followupBudget).map(({ answered, source }) => buildFollowupQuestion(answered, source))
    : [];
  const nextPendingQuestions = remainingPending.length > 0 ? remainingPending : generatedFollowups;
  const existingAnswers = session.clarification.user_answers ?? [];
  const assumptions = session.clarification.assumptions ?? [];
  const hasCompletedFraming = nextPendingQuestions.length === 0;
  const unresolvedAmbiguity = hasCompletedFraming
    ? []
    : nextPendingQuestions.map((item) => item.rationale);
  const nextStatus = hasCompletedFraming ? "framed" : "waiting_user";
  const nextStage = hasCompletedFraming ? "planning" : "clarification";
  const updatedAt = nowIso();
  const nextFraming = hasCompletedFraming
    ? deriveFramingFromClarification(
        {
          ...session.clarification,
          user_answers: [...existingAnswers, ...answeredPairs]
        },
        session.trigger.request_payload
      )
    : session.framing;

  const nextSession = {
    ...session,
    status: nextStatus,
    current_stage: nextStage,
    context_snapshot_id: hasCompletedFraming
      ? session.context_snapshot_id ?? makeContextSnapshotId()
      : session.context_snapshot_id,
    clarification: {
      ...session.clarification,
      round_count: generatedFollowups.length > 0
        ? (session.clarification.round_count ?? 1) + 1
        : session.clarification.round_count,
      asked_questions: [
        ...(session.clarification.asked_questions ?? []),
        ...answeredPairs.map((item) => item.question)
      ],
      user_answers: [...existingAnswers, ...answeredPairs],
      pending_questions: nextPendingQuestions,
      assumptions,
      unresolved_ambiguity: unresolvedAmbiguity,
      remaining_gaps: hasCompletedFraming ? [] : unresolvedAmbiguity,
      next_stop_condition: hasCompletedFraming
        ? "framing can proceed"
        : generatedFollowups.length > 0
          ? "runtime captured answers but generated follow-up clarification questions before planning"
          : "wait for remaining user answers before framing",
      clarification_summary: hasCompletedFraming
        ? "runtime captured first-round clarification answers and can proceed to framing"
        : generatedFollowups.length > 0
          ? "runtime detected weak clarification answers and requires a follow-up round"
          : "runtime captured partial clarification answers and is waiting for more",
      should_wait_for_user: nextPendingQuestions.length > 0,
      question_rationale: nextPendingQuestions.map((item) => item.rationale),
      trigger_classes: nextPendingQuestions.map((item) => item.trigger_class),
      target_fields: nextPendingQuestions.map((item) => item.target_fields)
    },
    updated_at: updatedAt
  };

  if (nextFraming) {
    nextSession.framing = nextFraming;
  } else {
    delete nextSession.framing;
  }

  return {
    ...nextSession,
    __session_path: session.__session_path
  };
}

export async function appendCouncilExecutionRun(session, executionRun) {
  const updatedAt = nowIso();
  const nextSession = {
    ...session,
    council_execution_runs: [...(session.council_execution_runs ?? []), executionRun],
    last_council_execution_id: executionRun.execution_id,
    updated_at: updatedAt
  };
  await writeSession(session.__session_path, nextSession);
  return {
    ...nextSession,
    __session_path: session.__session_path
  };
}

export async function markApprovalFailureEscalation(session, { executionRun, escalationTarget }) {
  const updatedAt = nowIso();
  const approvalOutcome = executionRun.approval_outcome ?? {
    status: "rejected",
    guardian_veto_used: false,
    seat_signals: []
  };
  const escalation = {
    escalation_id: makeEscalationId(),
    status: "awaiting-human-review",
    target: escalationTarget,
    triggered_by_execution_id: executionRun.execution_id,
    triggered_by_stage: executionRun.stage,
    approval_status: approvalOutcome.status,
    guardian_veto_used: approvalOutcome.guardian_veto_used,
    summary: approvalOutcome.guardian_veto_used
      ? "approval failed due to Guardian veto and requires human review"
      : "approval failed and requires human review",
    created_at: updatedAt
  };

  const nextSession = {
    ...session,
    status: "waiting_user",
    current_stage: "approval",
    stop_reason: "approval-failed-needs-human-escalation",
    recoverability: "human-escalation",
    suggested_next_action: `request review from ${escalationTarget}`,
    escalation,
    updated_at: updatedAt
  };

  await writeSession(session.__session_path, nextSession);
  return {
    ...nextSession,
    __session_path: session.__session_path
  };
}

export async function resolveEscalation(session, { resolution, note }) {
  if (!session.escalation) {
    throw new Error("Session has no active escalation.");
  }

  const updatedAt = nowIso();
  const resolvedEscalation = {
    ...session.escalation,
    status: "resolved",
    resolution,
    resolution_note: note,
    resolved_at: updatedAt
  };

  let nextStatus = session.status;
  let nextStage = session.current_stage;
  let stopReason = session.stop_reason;
  let recoverability = session.recoverability;
  let suggestedNextAction = session.suggested_next_action;

  if (resolution === "approve") {
    nextStatus = "closed";
    nextStage = "approval";
    stopReason = "human-escalation-approved";
    recoverability = "closed-by-human-approval";
    suggestedNextAction = "record final approval outcome and proceed to closure";
  } else if (resolution === "reopen") {
    nextStatus = "reopened";
    nextStage = "clarification";
    stopReason = "human-escalation-reopened";
    recoverability = "re-enter-workflow";
    suggestedNextAction = "re-enter clarification with human resolution context";
  } else if (resolution === "stop") {
    nextStatus = "stopped";
    nextStage = "approval";
    stopReason = "human-escalation-stopped";
    recoverability = "manual-restart-required";
    suggestedNextAction = "stop work and wait for a new trigger";
  } else {
    throw new Error(`Unsupported escalation resolution: ${resolution}`);
  }

  const nextSession = {
    ...session,
    status: nextStatus,
    current_stage: nextStage,
    stop_reason: stopReason,
    recoverability: recoverability,
    suggested_next_action: suggestedNextAction,
    escalation: resolvedEscalation,
    updated_at: updatedAt
  };

  await writeSession(session.__session_path, nextSession);
  return {
    ...nextSession,
    __session_path: session.__session_path
  };
}
