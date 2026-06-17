import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { EXECUTION_STAGES, resolveRoleJoinsRoot } from "./execution-artifact-helpers.js";

function deriveMissingRoles(expectedRoles, receivedRoles, explicitMissingRoles) {
  if (explicitMissingRoles?.length) {
    return explicitMissingRoles;
  }
  const received = new Set(receivedRoles);
  return expectedRoles.filter((role) => !received.has(role));
}

export async function roleJoinRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const joinId = options.joinId || makeId("RJOIN");
  const expectedRoles = options.expectedRoles ?? [];
  const receivedRoles = options.receivedRoles ?? [];
  const missingRoles = deriveMissingRoles(expectedRoles, receivedRoles, options.missingRoles);

  const payload = {
    join_type: "role-join",
    recorded_at: nowIso(),
    join_id: joinId,
    join_status: options.joinStatus || "open",
    stage: options.stage,
    expected_roles: expectedRoles,
    received_roles: receivedRoles,
    missing_roles: missingRoles,
    aggregate_state: options.aggregateState,
    blocking_signals: options.blockingSignals ?? [],
    recommended_next_step: options.recommendedNextStep,
    received_session_ids: options.receivedSessionIds?.length ? options.receivedSessionIds : null,
    source_task_id: options.sourceTaskId || null,
    source_parent_session_id: options.sourceParentSessionId || null,
    decision_record_ref: options.decisionRecordRef || null,
    summary: options.summary || null
  };

  if (!EXECUTION_STAGES.includes(payload.stage)) {
    throw new Error("Invalid --stage for `role-join-record`.");
  }

  await validateWithBundledSchema(payload, "aof-role-join.schema.json", "role join");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveRoleJoinsRoot(projectRoot), `${joinId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    payload
  };
}
