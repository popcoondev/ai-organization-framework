import path from "node:path";
import { recordRecentConfirmation } from "../runtime/confirmation-memory.js";
import { loadSession, persistSession } from "../runtime/session.js";
import { applySignalToSession, loadSignal } from "../runtime/signal.js";
import { withSessionMutationLock } from "../runtime/utils.js";

export async function signalCommand(options, deps = {}) {
  const recordRecentConfirmationImpl = deps.recordRecentConfirmation ?? recordRecentConfirmation;
  const sessionPath = path.resolve(options.session);
  const signalPath = path.resolve(options.signal);
  return withSessionMutationLock(sessionPath, async () => {
    const session = await loadSession(sessionPath);
    const signal = await loadSignal(signalPath);
    const updatedSession = applySignalToSession(session, signal, signalPath);
    await persistSession(updatedSession);

    const projectRoot = path.resolve(path.dirname(sessionPath), "..", "..");
    let confirmationResult = null;
    try {
      const question = updatedSession.status === "reopened"
        ? `外部変化「${updatedSession.signal_context?.signal_summary ?? signal.signal_summary ?? "external signal"}」で何を再評価すべきか`
        : `外部変化「${updatedSession.signal_context?.signal_summary ?? signal.signal_summary ?? "external signal"}」を context にどう反映したか`;
      const answer = updatedSession.status === "reopened"
        ? updatedSession.clarification?.clarification_summary
          ?? "runtime reopened the session and queued follow-up clarification"
        : updatedSession.signal_context?.signal_summary
          ?? signal.signal_summary
          ?? "external signal applied to context";
      const result = await recordRecentConfirmationImpl({
        projectRoot,
        question,
        answer,
        expectationState: updatedSession.signal_context?.signal_summary ?? null,
        mismatchState: updatedSession.status === "reopened"
          ? "external signal forced reopen and broader review"
          : null,
        scaleDirection: updatedSession.status === "reopened"
          ? "re-evaluate current plan before proceeding"
          : "continue with updated context",
        sourceSessionId: updatedSession.session_id
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
      sessionId: updatedSession.session_id,
      status: updatedSession.status,
      currentStage: updatedSession.current_stage,
      routingMode: updatedSession.routing_mode,
      sessionPath: updatedSession.__session_path,
      signalRefs: updatedSession.signal_refs ?? [],
      signalDisposition: updatedSession.signal_context?.disposition ?? null,
      pendingQuestions: updatedSession.clarification?.pending_questions?.map((item) => item.question) ?? [],
      signalContext: updatedSession.signal_context ?? null,
      reopenContext: updatedSession.reopen_context ?? null,
      projectMemory: {
        confirmationResult
      }
    };
  });
}
