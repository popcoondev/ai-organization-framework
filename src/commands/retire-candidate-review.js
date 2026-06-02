import path from "node:path";

import { recordRetireCandidateReview } from "../runtime/project-memory.js";

export async function retireCandidateReviewCommand(options) {
  const projectRoot = path.resolve(options.project);
  return recordRetireCandidateReview({
    projectRoot,
    resolution: options.resolution,
    taskIds: options.taskIds ?? [],
    note: options.note,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3
  });
}
