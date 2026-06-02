import path from "node:path";

import { recordFrameworkSelfAudit } from "../runtime/project-memory.js";

export async function selfAuditRecordCommand(options) {
  const projectRoot = path.resolve(options.project);
  return recordFrameworkSelfAudit({
    projectRoot,
    auditId: options.auditId,
    scope: options.scope,
    summary: options.summary,
    detectedGap: options.detectedGap,
    resultState: options.resultState || null,
    nextAction: options.nextAction,
    relatedTaskIds: options.relatedTaskIds ?? [],
    sourceSessionId: options.sourceSessionId || null,
    sourceDecisionRecordId: options.sourceDecisionRecordId || null,
    nextValueSliceContent: options.nextValueSliceContent || null,
    maxEntries: options.maxEntries ?? 3
  });
}
