import path from "node:path";

import { updateTaskArtifact } from "../runtime/task-memory.js";

export async function taskUpdateCommand(options) {
  const projectRoot = path.resolve(options.project);
  return updateTaskArtifact({
    projectRoot,
    taskId: options.taskId,
    status: options.status || null,
    assignedSessionIds: options.assignedSessionIds?.length ? options.assignedSessionIds : undefined,
    relatedDecisionRecordId: options.relatedDecisionRecordId || undefined,
    triageNotes: options.triageNotes || undefined
  });
}
