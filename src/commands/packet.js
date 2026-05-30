import path from "node:path";
import { loadSession } from "../runtime/session.js";
import { loadTemplate } from "../runtime/template-loader.js";
import { buildPacket } from "../runtime/packet-builder.js";

export async function packetCommand(options) {
  const sessionPath = path.resolve(options.session);
  const session = await loadSession(sessionPath);

  // Derive project root: session lives at <root>/.aof/sessions/<file>.json
  const projectRoot = options.project
    ? path.resolve(options.project)
    : path.resolve(path.dirname(sessionPath), "..", "..");

  const template = await loadTemplate(projectRoot);
  const stage = options.stage ?? session.current_stage;
  const packet = buildPacket(session, template, stage);

  return {
    ok: true,
    sessionId: session.session_id,
    stage,
    packet,
  };
}
