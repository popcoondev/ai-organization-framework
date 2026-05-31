import path from "node:path";
import { createFramingDecision } from "../runtime/decision.js";
import {
  applyClarificationAnswers,
  loadSession,
  persistSession
} from "../runtime/session.js";
import { loadTemplate } from "../runtime/template-loader.js";
import { withSessionMutationLock } from "../runtime/utils.js";

export async function answerCommand(options) {
  const sessionPath = path.resolve(options.session);
  return withSessionMutationLock(sessionPath, async () => {
    const session = await loadSession(sessionPath);
    const updatedSession = await applyClarificationAnswers(session, options.responses);

    let decision = null;
    let persistedSession = updatedSession;
    if (updatedSession.status === "framed" && updatedSession.current_stage === "planning") {
      const projectRoot = path.resolve(path.dirname(sessionPath), "..", "..");
      const template = await loadTemplate(projectRoot);
      decision = await createFramingDecision({
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
      decisionJsonPath: decision?.__json_path ?? null
    };
  });
}
