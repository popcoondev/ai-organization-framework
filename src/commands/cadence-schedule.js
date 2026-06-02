import path from "node:path";

import { generateCadenceSchedule } from "../runtime/project-memory.js";

export async function cadenceScheduleCommand(options) {
  const projectRoot = path.resolve(options.project);
  return generateCadenceSchedule({
    projectRoot,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3,
    staleAfterHours: options.staleAfterHours ?? 24
  });
}
