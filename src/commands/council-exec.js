import path from "node:path";
import { councilCommand } from "./council.js";
import { executeCouncilStage } from "../runtime/council-execution.js";
import { loadTemplate } from "../runtime/template-loader.js";
import { appendCouncilExecutionRun, loadSession } from "../runtime/session.js";

function deriveProjectRootFromSession(sessionPath) {
  return path.dirname(path.dirname(path.dirname(sessionPath)));
}

export async function councilExecCommand(options) {
  const sessionPath = path.resolve(options.session);
  const session = await loadSession(sessionPath);
  const projectRoot = options.project
    ? path.resolve(options.project)
    : deriveProjectRootFromSession(sessionPath);
  const template = await loadTemplate(projectRoot);
  const execution = executeCouncilStage({
    template,
    session,
    stage: options.stage,
    includeOptional: options.includeOptional,
    roleOverride: options.role
  });
  const nextSession = await appendCouncilExecutionRun(session, execution);
  const planSummary = await councilCommand(options);

  return {
    ok: true,
    sessionId: nextSession.session_id,
    stage: options.stage,
    executionId: execution.execution_id,
    executionStatus: execution.status,
    seatCount: execution.steps.length,
    summary: execution.summary,
    lastCouncilExecutionId: nextSession.last_council_execution_id,
    plan: planSummary.plan,
    execution
  };
}
