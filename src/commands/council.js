import path from "node:path";
import { loadTemplate } from "../runtime/template-loader.js";
import { buildCouncilExecutionPlan } from "../runtime/council.js";
import { loadSession } from "../runtime/session.js";

function deriveProjectRootFromSession(sessionPath) {
  return path.dirname(path.dirname(path.dirname(sessionPath)));
}

export async function councilCommand(options) {
  const sessionPath = path.resolve(options.session);
  const session = await loadSession(sessionPath);
  const projectRoot = options.project
    ? path.resolve(options.project)
    : deriveProjectRootFromSession(sessionPath);
  const template = await loadTemplate(projectRoot);
  const plan = buildCouncilExecutionPlan({
    template,
    session,
    stage: options.stage,
    includeOptional: options.includeOptional,
    roleOverride: options.role
  });

  return {
    ok: true,
    sessionId: session.session_id,
    stage: options.stage,
    executionModel: plan.execution_model,
    primaryRole: plan.primary_role,
    seatCount: plan.seats.length,
    plan
  };
}
