import path from "node:path";
import {
  applyClarificationAnswers,
  loadSession,
  persistSession
} from "../runtime/session.js";

export async function answerCommand(options) {
  const sessionPath = path.resolve(options.session);
  const session = await loadSession(sessionPath);
  const updatedSession = await applyClarificationAnswers(session, options.responses);
  await persistSession(updatedSession);

  return {
    ok: true,
    sessionId: updatedSession.session_id,
    status: updatedSession.status,
    currentStage: updatedSession.current_stage,
    sessionPath: updatedSession.__session_path,
    contextSnapshotId: updatedSession.context_snapshot_id,
    remainingQuestions: updatedSession.clarification.pending_questions.map((item) => item.question),
    capturedAnswers: updatedSession.clarification.user_answers.length
  };
}
