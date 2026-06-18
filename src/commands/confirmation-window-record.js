import path from "node:path";

import { recordRecentConfirmation } from "../runtime/confirmation-memory.js";

export async function confirmationWindowRecordCommand(options) {
  const projectRoot = path.resolve(options.project);
  return recordRecentConfirmation({
    projectRoot,
    question: options.question,
    answer: options.answer,
    expectationState: options.expectationState || null,
    mismatchState: options.mismatchState || null,
    scaleDirection: options.scaleDirection || null,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3
  });
}
