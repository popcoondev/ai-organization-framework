import path from "node:path";
import { createInitialDecision } from "../runtime/decision.js";
import { attachOpenDecision, createInitialSession } from "../runtime/session.js";
import { loadTemplate } from "../runtime/template-loader.js";

export async function runCommand(options) {
  const projectRoot = path.resolve(options.project);
  const template = await loadTemplate(projectRoot);
  const session = await createInitialSession({
    projectRoot,
    request: options.request,
    template
  });
  const decision = await createInitialDecision({
    projectRoot,
    request: options.request,
    template,
    session
  });
  const updatedSession = await attachOpenDecision(session, decision.decision_id);

  return {
    ok: true,
    projectRoot,
    workflowId: updatedSession.workflow_id,
    organizationId: updatedSession.organization_id,
    sessionId: updatedSession.session_id,
    status: updatedSession.status,
    sessionPath: updatedSession.__session_path,
    decisionId: decision.decision_id,
    decisionMarkdownPath: decision.__markdown_path,
    decisionJsonPath: decision.__json_path,
    pendingQuestions: updatedSession.clarification.pending_questions.map((item) => item.question)
  };
}
