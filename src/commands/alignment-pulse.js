import path from "node:path";

import { recordAlignmentPulse } from "../runtime/project-memory.js";

export async function alignmentPulseCommand(options) {
  const projectRoot = path.resolve(options.project);
  return recordAlignmentPulse({
    projectRoot,
    question: options.question,
    answer: options.answer,
    expectationState: options.expectationState || null,
    mismatchState: options.mismatchState || null,
    scaleDirection: options.scaleDirection || null,
    prioritizedTaskIds: options.prioritizedTaskIds ?? [],
    staleTaskIds: options.staleTaskIds ?? [],
    retireCandidateTaskIds: options.retireCandidateTaskIds ?? [],
    triageNote: options.triageNote || null,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3
  });
}
