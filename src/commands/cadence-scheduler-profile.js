import path from "node:path";

import { selectCadenceSchedulerProfile } from "../runtime/project-memory.js";

export async function cadenceSchedulerProfileCommand(options) {
  const projectRoot = path.resolve(options.project);
  return selectCadenceSchedulerProfile({
    projectRoot,
    profile: options.profile,
    note: options.note || null,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3,
    staleAfterHours: options.staleAfterHours ?? 24
  });
}
