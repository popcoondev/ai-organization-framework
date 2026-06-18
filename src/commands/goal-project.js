import path from "node:path";

import { writeGoalProjection } from "../runtime/goal-memory.js";

export async function goalProjectCommand(options) {
  const projectRoot = path.resolve(options.project);
  return writeGoalProjection({
    projectRoot,
    goalType: options.goalType,
    content: options.content,
    agreedWithHuman: options.agreedWithHuman,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    declaredComplete: Boolean(options.declaredComplete)
  });
}
