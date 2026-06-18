import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "./project-paths.js";
import { ensureDir, nowIso, writeJsonArtifact } from "./utils.js";
import { validateWithBundledSchema } from "./validation.js";

const RECENT_CONFIRMATION_WINDOW_FILE = "recent-confirmation-window.json";

export async function recordRecentConfirmation({
  projectRoot,
  question,
  answer,
  expectationState = null,
  mismatchState = null,
  scaleDirection = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);
  const windowPath = path.join(activeContextRoot, RECENT_CONFIRMATION_WINDOW_FILE);

  let existing = {
    window_type: "recent-confirmation-window",
    updated_at: nowIso(),
    entries: []
  };

  try {
    const currentText = await fs.readFile(windowPath, "utf8");
    existing = JSON.parse(currentText);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const recordedAt = nowIso();
  const nextEntries = [
    ...(existing.entries ?? []),
    {
      question,
      answer,
      recorded_at: recordedAt,
      expectation_state: expectationState,
      mismatch_state: mismatchState,
      scale_direction: scaleDirection,
      source_session_id: sourceSessionId,
      source_decision_record_id: sourceDecisionRecordId
    }
  ].slice(-Math.max(1, maxEntries));

  const payload = {
    window_type: "recent-confirmation-window",
    updated_at: recordedAt,
    entries: nextEntries
  };

  await validateWithBundledSchema(payload, "aof-confirmation-window.schema.json", "confirmation window");
  await writeJsonArtifact(windowPath, payload);
  return {
    ok: true,
    windowPath,
    payload
  };
}
