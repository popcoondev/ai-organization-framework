import path from "node:path";
import { appendOutcomeReport, loadSession } from "../runtime/session.js";

export async function outcomeReportCommand(options) {
  const sessionPath = path.resolve(options.session);
  const session = await loadSession(sessionPath);
  const updatedSession = await appendOutcomeReport(session, {
    result: options.result,
    note: options.note,
    signalRef: options.signalRef
  });

  return {
    ok: true,
    sessionId: updatedSession.session_id,
    sessionPath: updatedSession.__session_path,
    outcomeReportCount: updatedSession.outcome_reports.length,
    latestOutcomeReport: updatedSession.outcome_reports.at(-1) ?? null
  };
}
