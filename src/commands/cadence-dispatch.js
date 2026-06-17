import path from "node:path";

import { runCadenceDispatch } from "../runtime/project-memory.js";

export async function cadenceDispatchCommand(options) {
  const projectRoot = path.resolve(options.project);
  return runCadenceDispatch({
    projectRoot,
    resolution: options.resolution || null,
    note: options.note || null,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3,
    staleAfterHours: options.staleAfterHours ?? 24
  });
}
