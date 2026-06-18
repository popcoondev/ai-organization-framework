import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "./project-paths.js";
import { nowIso, writeJsonArtifact, ensureDir } from "./utils.js";
import { validateWithBundledSchema } from "./validation.js";

const GOAL_TYPE_TO_FILE = {
  "north-star": "north-star.json",
  "operating-goal": "operating-goal.json",
  "next-value-slice": "next-value-slice.json"
};

export async function writeGoalProjection({
  projectRoot,
  goalType,
  content,
  agreedWithHuman = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  declaredComplete = false
}) {
  const fileName = GOAL_TYPE_TO_FILE[goalType];
  if (!fileName) {
    throw new Error(`Unsupported goal type: ${goalType}`);
  }

  const aofRoot = resolveAofRoot(projectRoot);
  const goalsRoot = path.join(aofRoot, "goals");
  await ensureDir(goalsRoot);
  const timestamp = nowIso();
  const payload = {
    goal_type: goalType,
    content,
    updated_at: timestamp,
    agreed_with_human: agreedWithHuman,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId,
    declared_complete_at: declaredComplete ? timestamp : null
  };

  await validateWithBundledSchema(payload, "aof-goals.schema.json", "goal projection");
  const goalPath = path.join(goalsRoot, fileName);
  await writeJsonArtifact(goalPath, payload);
  return {
    ok: true,
    goalType,
    goalPath,
    payload
  };
}

export async function loadGoalProjection({ projectRoot, goalType }) {
  const fileName = GOAL_TYPE_TO_FILE[goalType];
  if (!fileName) {
    throw new Error(`Unsupported goal type: ${goalType}`);
  }

  const aofRoot = resolveAofRoot(projectRoot);
  const goalPath = path.join(aofRoot, "goals", fileName);
  try {
    const raw = await fs.readFile(goalPath, "utf8");
    return {
      ok: true,
      goalType,
      goalPath,
      payload: JSON.parse(raw)
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        ok: true,
        goalType,
        goalPath,
        payload: null
      };
    }
    throw error;
  }
}
