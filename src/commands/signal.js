import path from "node:path";
import { loadSession, persistSession } from "../runtime/session.js";
import { applySignalToSession, loadSignal } from "../runtime/signal.js";

export async function signalCommand(options) {
  const sessionPath = path.resolve(options.session);
  const signalPath = path.resolve(options.signal);
  const session = await loadSession(sessionPath);
  const signal = await loadSignal(signalPath);
  const updatedSession = applySignalToSession(session, signal, signalPath);
  await persistSession(updatedSession);

  return {
    ok: true,
    sessionId: updatedSession.session_id,
    status: updatedSession.status,
    currentStage: updatedSession.current_stage,
    sessionPath: updatedSession.__session_path,
    signalRefs: updatedSession.signal_refs ?? [],
    pendingQuestions: updatedSession.clarification.pending_questions.map((item) => item.question),
    reopenContext: updatedSession.reopen_context
  };
}
