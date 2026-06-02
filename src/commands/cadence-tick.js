import path from "node:path";

import { runCadenceTick } from "../runtime/project-memory.js";

export async function cadenceTickCommand(options) {
  const projectRoot = path.resolve(options.project);
  return runCadenceTick({
    projectRoot,
    resolution: options.resolution || null,
    note: options.note || null,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3
  });
}
