import path from "node:path";
import { updateDecisionRecordForEscalationResolution } from "../runtime/decision.js";
import { recordRecentConfirmation } from "../runtime/confirmation-memory.js";
import { loadTemplate } from "../runtime/template-loader.js";
import { loadSession, resolveEscalation } from "../runtime/session.js";
import { withSessionMutationLock } from "../runtime/utils.js";

function deriveProjectRootFromSession(sessionPath) {
  return path.dirname(path.dirname(path.dirname(sessionPath)));
}

export async function escalationResolveCommand(options, deps = {}) {
  const recordRecentConfirmationImpl = deps.recordRecentConfirmation ?? recordRecentConfirmation;
  const sessionPath = path.resolve(options.session);
  return withSessionMutationLock(sessionPath, async () => {
    const session = await loadSession(sessionPath);
    const projectRoot = deriveProjectRootFromSession(sessionPath);
    const template = await loadTemplate(projectRoot);
    const nextSession = await resolveEscalation(session, {
      resolution: options.resolution,
      note: options.note
    });
    const decisionId = nextSession.open_decision_ids?.[0];
    if (decisionId) {
      await updateDecisionRecordForEscalationResolution({
        projectRoot,
        template,
        decisionId,
        escalation: nextSession.escalation
      });
    }

    let confirmationResult = null;
    try {
      const question = "human escalation で何を決めたか";
      const answer = options.note;
      const result = await recordRecentConfirmationImpl({
        projectRoot,
        question,
        answer,
        expectationState: nextSession.escalation?.summary ?? null,
        mismatchState: options.resolution === "reopen"
          ? "human review requested another clarification / reframing loop"
          : null,
        scaleDirection: options.resolution === "approve"
          ? "close the current slice and proceed to outcome tracking"
          : options.resolution === "reopen"
            ? "re-enter clarification before continuing"
            : "stop current work and wait for a new trigger",
        sourceSessionId: nextSession.session_id,
        sourceDecisionRecordId: decisionId ?? null
      });
      confirmationResult = {
        ok: true,
        windowPath: result.windowPath,
        question
      };
    } catch (error) {
      confirmationResult = {
        ok: false,
        error: error.message
      };
    }

    return {
      ok: true,
      sessionId: nextSession.session_id,
      status: nextSession.status,
      currentStage: nextSession.current_stage,
      stopReason: nextSession.stop_reason,
      suggestedNextAction: nextSession.suggested_next_action,
      escalation: nextSession.escalation,
      projectMemory: {
        confirmationResult
      }
    };
  });
}
