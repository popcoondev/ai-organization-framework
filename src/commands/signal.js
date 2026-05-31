import path from "node:path";
import { loadSession, persistSession } from "../runtime/session.js";
import { applySignalToSession, loadSignal } from "../runtime/signal.js";
import { withSessionMutationLock } from "../runtime/utils.js";

export async function signalCommand(options) {
  const sessionPath = path.resolve(options.session);
  const signalPath = path.resolve(options.signal);
  return withSessionMutationLock(sessionPath, async () => {
    const session = await loadSession(sessionPath);
    const signal = await loadSignal(signalPath);
    const updatedSession = applySignalToSession(session, signal, signalPath);
    await persistSession(updatedSession);

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
      reopenContext: updatedSession.reopen_context ?? null
    };
  });
}
