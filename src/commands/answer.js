import path from "node:path";

import { createFramingDecision, createNeedValidationDecision } from "../runtime/decision.js";
import { recordRecentConfirmation } from "../runtime/confirmation-memory.js";
import { writeGoalProjection } from "../runtime/goal-memory.js";
import {
  applyClarificationAnswers,
  loadSession,
  persistSession
} from "../runtime/session.js";
import { loadTemplate } from "../runtime/template-loader.js";
import { withSessionMutationLock } from "../runtime/utils.js";

export async function answerCommand(options, deps = {}) {
  const recordRecentConfirmationImpl = deps.recordRecentConfirmation ?? recordRecentConfirmation;
  const writeGoalProjectionImpl = deps.writeGoalProjection ?? writeGoalProjection;
  const createNeedValidationDecisionImpl = deps.createNeedValidationDecision ?? createNeedValidationDecision;
  const sessionPath = path.resolve(options.session);

  return withSessionMutationLock(sessionPath, async () => {
    const session = await loadSession(sessionPath);
    const pendingQuestions = session.clarification.pending_questions ?? [];
    const answeredPairs = options.responses.map((answer, index) => ({
      question: pendingQuestions[index]?.question ?? `clarification-${index + 1}`,
      answer
    }));
    const updatedSession = await applyClarificationAnswers(session, options.responses);

    let decision = null;
    let persistedSession = updatedSession;
    if (updatedSession.status === "framed" && updatedSession.current_stage === "need-validation") {
      const projectRoot = path.resolve(path.dirname(sessionPath), "..", "..");
      const template = await loadTemplate(projectRoot);
      decision = await createNeedValidationDecisionImpl({
        projectRoot,
        template,
        session: updatedSession
      });
      persistedSession = {
        ...updatedSession,
        open_decision_ids: [decision.decision_id],
        closed_decision_ids: [
          ...(updatedSession.closed_decision_ids ?? []),
          ...(updatedSession.open_decision_ids ?? [])
        ],
        updated_at: new Date().toISOString()
      };
    }

    await persistSession(persistedSession);

    const projectRoot = path.resolve(path.dirname(sessionPath), "..", "..");
    const confirmationResults = [];
    for (const answeredPair of answeredPairs) {
      try {
        const result = await recordRecentConfirmationImpl({
          projectRoot,
          question: answeredPair.question,
          answer: answeredPair.answer,
          expectationState: persistedSession.clarification?.clarification_summary ?? null,
          mismatchState: persistedSession.status === "waiting_user"
            ? "additional clarification is still required"
            : null,
          scaleDirection: persistedSession.current_stage === "need-validation"
            ? "complete need validation before planning"
            : persistedSession.status === "framed"
              ? "advance toward planning"
            : "continue clarification",
          sourceSessionId: persistedSession.session_id
        });
        confirmationResults.push({
          ok: true,
          windowPath: result.windowPath,
          question: answeredPair.question
        });
      } catch (error) {
        confirmationResults.push({
          ok: false,
          question: answeredPair.question,
          error: error.message
        });
      }
    }

    let operatingGoalProjection = null;
    if (persistedSession.status === "framed" && persistedSession.current_stage === "planning") {
      try {
        const projection = await writeGoalProjectionImpl({
          projectRoot,
          goalType: "operating-goal",
          content: persistedSession.framing?.need ?? session.trigger.request_payload,
          agreedWithHuman: true,
          sourceSessionId: persistedSession.session_id,
          sourceDecisionRecordId: decision?.decision_id ?? null
        });
        operatingGoalProjection = {
          ok: true,
          goalPath: projection.goalPath,
          content: projection.payload.content
        };
      } catch (error) {
        operatingGoalProjection = {
          ok: false,
          error: error.message
        };
      }
    }

    return {
      ok: true,
      sessionId: persistedSession.session_id,
      status: persistedSession.status,
      currentStage: persistedSession.current_stage,
      sessionPath: persistedSession.__session_path,
      contextSnapshotId: persistedSession.context_snapshot_id,
      remainingQuestions: persistedSession.clarification.pending_questions.map((item) => item.question),
      capturedAnswers: persistedSession.clarification.user_answers.length,
      decisionId: decision?.decision_id ?? null,
      decisionMarkdownPath: decision?.__markdown_path ?? null,
      decisionJsonPath: decision?.__json_path ?? null,
      projectMemory: {
        confirmationResults,
        operatingGoalProjection
      }
    };
  });
}
