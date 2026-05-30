import fs from "node:fs/promises";
import path from "node:path";
import { deriveInitialClarification } from "./clarification.js";
import { deriveFramingFromClarification } from "./framing.js";
import { validateWithBundledSchema } from "./validation.js";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`.toUpperCase();
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeSession(sessionPath, session) {
  const { __session_path: _internalSessionPath, ...persistedSession } = session;
  await validateWithBundledSchema(persistedSession, "aof-session.schema.json", "session");
  await fs.writeFile(sessionPath, `${JSON.stringify(persistedSession, null, 2)}\n`, "utf8");
}

function makeContextSnapshotId() {
  const stamp = Date.now().toString(36);
  return `CTX-${stamp}`.toUpperCase();
}

function makeEscalationId() {
  return makeId("esc");
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

export async function createInitialSession({ projectRoot, request, template }) {
  const createdAt = nowIso();
  const sessionId = makeId("sess");
  const triggerId = makeId("trg");
  const sessionsDir = path.join(projectRoot, ".aof", template.manifest.state.sessions);
  await ensureDir(sessionsDir);
  const routingMode = "deep-path";
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
  const existingAnswers = session.clarification.user_answers ?? [];
  const assumptions = session.clarification.assumptions ?? [];
  const unresolvedAmbiguity = responses.length >= pendingQuestions.length
    ? []
    : session.clarification.unresolved_ambiguity;
  const nextStatus = remainingPending.length === 0 ? "framed" : "waiting_user";
  const nextStage = remainingPending.length === 0 ? "framed" : "clarification";
  const updatedAt = nowIso();

  const nextSession = {
    ...session,
    status: nextStatus,
    current_stage: nextStage,
    context_snapshot_id: remainingPending.length === 0
      ? session.context_snapshot_id ?? makeContextSnapshotId()
      : session.context_snapshot_id,
    framing: remainingPending.length === 0
      ? deriveFramingFromClarification(
          {
            ...session.clarification,
            user_answers: [...existingAnswers, ...answeredPairs]
          },
          session.trigger.request_payload
        )
      : session.framing,
    clarification: {
      ...session.clarification,
      asked_questions: [
        ...(session.clarification.asked_questions ?? []),
        ...answeredPairs.map((item) => item.question)
      ],
      user_answers: [...existingAnswers, ...answeredPairs],
      pending_questions: remainingPending,
      assumptions,
      unresolved_ambiguity: unresolvedAmbiguity,
      remaining_gaps: remainingPending.length === 0 ? [] : session.clarification.remaining_gaps,
      next_stop_condition: remainingPending.length === 0
        ? "framing can proceed"
        : "wait for remaining user answers before framing",
      clarification_summary: remainingPending.length === 0
        ? "runtime captured first-round clarification answers and can proceed to framing"
        : "runtime captured partial clarification answers and is waiting for more",
      should_wait_for_user: remainingPending.length > 0
    },
    updated_at: updatedAt
  };

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
