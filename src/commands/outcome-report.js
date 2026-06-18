import path from "node:path";
import { appendOutcomeReport, loadSession } from "../runtime/session.js";
import { loadGoalProjection, writeGoalProjection } from "../runtime/goal-memory.js";
import { withSessionMutationLock } from "../runtime/utils.js";

export async function outcomeReportCommand(options, deps = {}) {
  const loadGoalProjectionImpl = deps.loadGoalProjection ?? loadGoalProjection;
  const writeGoalProjectionImpl = deps.writeGoalProjection ?? writeGoalProjection;
  const sessionPath = path.resolve(options.session);
  return withSessionMutationLock(sessionPath, async () => {
    const session = await loadSession(sessionPath);
    const updatedSession = await appendOutcomeReport(session, {
      result: options.result,
      note: options.note,
      signalRef: options.signalRef
    });

    const projectRoot = path.resolve(path.dirname(sessionPath), "..", "..");
    let nextValueSliceProjection = null;
    try {
      const existingProjection = await loadGoalProjectionImpl({
        projectRoot,
        goalType: "next-value-slice"
      });
      const projection = await writeGoalProjectionImpl({
        projectRoot,
        goalType: "next-value-slice",
        content: existingProjection.payload?.content
          ?? options.note
          ?? updatedSession.framing?.need
          ?? session.trigger.request_payload,
        agreedWithHuman: existingProjection.payload?.agreed_with_human ?? null,
        sourceSessionId: updatedSession.session_id,
        declaredComplete: true
      });
      nextValueSliceProjection = {
        ok: true,
        goalPath: projection.goalPath,
        content: projection.payload.content,
        declaredCompleteAt: projection.payload.declared_complete_at
      };
    } catch (error) {
      nextValueSliceProjection = {
        ok: false,
        error: error.message
      };
    }

    return {
      ok: true,
      sessionId: updatedSession.session_id,
      sessionPath: updatedSession.__session_path,
      outcomeReportCount: updatedSession.outcome_reports.length,
      latestOutcomeReport: updatedSession.outcome_reports.at(-1) ?? null,
      projectMemory: {
        nextValueSliceProjection
      }
    };
  });
}
