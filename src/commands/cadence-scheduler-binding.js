import path from "node:path";

import { generateCadenceSchedulerBinding } from "../runtime/project-memory.js";

export async function cadenceSchedulerBindingCommand(options) {
  const projectRoot = path.resolve(options.project);
  return generateCadenceSchedulerBinding({
    projectRoot,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3,
    staleAfterHours: options.staleAfterHours ?? 24
  });
}
