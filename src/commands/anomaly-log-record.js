import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { resolveAnomalyLogsRoot } from "./discovery-artifact-helpers.js";

export async function anomalyLogRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const anomalyLogId = options.anomalyLogId || makeId("ANL");
  const payload = {
    artifact_type: "anomaly-log",
    recorded_at: nowIso(),
    anomaly_log_id: anomalyLogId,
    subject: options.subject,
    anomalies: options.anomalies ?? [],
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-anomaly-log.schema.json", "anomaly log");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveAnomalyLogsRoot(projectRoot), `${anomalyLogId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    anomalyLogId,
    payload
  };
}
