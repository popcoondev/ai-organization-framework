import path from "node:path";

import { generateCadenceTriggerGuidance } from "../runtime/project-memory.js";

export async function cadenceTriggerGuideCommand(options) {
  const projectRoot = path.resolve(options.project);
  return generateCadenceTriggerGuidance({
    projectRoot,
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    maxEntries: options.maxEntries ?? 3
  });
}
