import path from "node:path";
import { createInitialSession } from "../runtime/session.js";
import { loadTemplate } from "../runtime/template-loader.js";

export async function runCommand(options) {
  const projectRoot = path.resolve(options.project);
  const template = await loadTemplate(projectRoot);
  const session = await createInitialSession({
    projectRoot,
    request: options.request,
    template
  });

  return {
    ok: true,
    projectRoot,
    workflowId: session.workflow_id,
    organizationId: session.organization_id,
    sessionId: session.session_id,
    sessionPath: session.__session_path
  };
}
