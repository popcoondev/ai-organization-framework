import path from "node:path";
import { loadSession, resolveEscalation } from "../runtime/session.js";

export async function escalationResolveCommand(options) {
  const sessionPath = path.resolve(options.session);
  const session = await loadSession(sessionPath);
  const nextSession = await resolveEscalation(session, {
    resolution: options.resolution,
    note: options.note
  });

  return {
    ok: true,
    sessionId: nextSession.session_id,
    status: nextSession.status,
    currentStage: nextSession.current_stage,
    stopReason: nextSession.stop_reason,
    suggestedNextAction: nextSession.suggested_next_action,
    escalation: nextSession.escalation
  };
}
