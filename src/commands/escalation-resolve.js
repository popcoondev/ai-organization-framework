import path from "node:path";
import { updateDecisionRecordForEscalationResolution } from "../runtime/decision.js";
import { loadTemplate } from "../runtime/template-loader.js";
import { loadSession, resolveEscalation } from "../runtime/session.js";

function deriveProjectRootFromSession(sessionPath) {
  return path.dirname(path.dirname(path.dirname(sessionPath)));
}

export async function escalationResolveCommand(options) {
  const sessionPath = path.resolve(options.session);
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
