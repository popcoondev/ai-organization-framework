import path from "node:path";

import { executeCadenceFollowThrough } from "../runtime/project-memory.js";

export async function cadenceFollowThroughCommand(options) {
  const projectRoot = path.resolve(options.project);
  return executeCadenceFollowThrough({
    projectRoot,
    resolution: options.resolution || null,
    note: options.note || null,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3
  });
}
