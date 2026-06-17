import path from "node:path";
import { loadTemplate } from "../runtime/template-loader.js";
import { buildModelInputPacket } from "../runtime/packet.js";
import { loadSession } from "../runtime/session.js";

function deriveProjectRootFromSession(sessionPath) {
  return path.dirname(path.dirname(path.dirname(sessionPath)));
}

export async function packetCommand(options) {
  const sessionPath = path.resolve(options.session);
  const session = await loadSession(sessionPath);
  const projectRoot = options.project
    ? path.resolve(options.project)
    : deriveProjectRootFromSession(sessionPath);
  const template = await loadTemplate(projectRoot);
  const packet = buildModelInputPacket({
    template,
    session,
    stage: options.stage,
    roleOverride: options.role
  });

  return {
    ok: true,
    sessionId: session.session_id,
    stage: options.stage,
    role: packet.actor.active_role,
    packet
  };
}
