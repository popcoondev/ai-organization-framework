import path from "node:path";

import { createOpenTask } from "../runtime/project-memory.js";

export async function taskOpenCommand(options) {
  const projectRoot = path.resolve(options.project);
  return createOpenTask({
    projectRoot,
    title: options.title,
    description: options.description || null,
    origin: options.origin || null,
    orchestratorSessionId: options.orchestratorSessionId || null,
    assignedSessionIds: options.assignedSessionIds ?? [],
    relatedDecisionRecordId: options.relatedDecisionRecordId || null,
    operatingGoalRef: options.operatingGoalRef || null,
    triageNotes: options.triageNotes || null
  });
}
