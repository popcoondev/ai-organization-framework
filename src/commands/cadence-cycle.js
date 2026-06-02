import path from "node:path";

import { runCadenceCycle } from "../runtime/project-memory.js";

export async function cadenceCycleCommand(options) {
  const projectRoot = path.resolve(options.project);
  return runCadenceCycle({
    projectRoot,
    resolution: options.resolution || null,
    note: options.note || null,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3,
    staleAfterHours: options.staleAfterHours ?? 24
  });
}
