import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { EXECUTION_STAGES, resolveTeamOutputsRoot } from "./execution-artifact-helpers.js";

function deriveMissingRoles(expectedRoles, receivedRoles, explicitMissingRoles) {
  if (explicitMissingRoles?.length) {
    return explicitMissingRoles;
  }
  const received = new Set(receivedRoles);
  return expectedRoles.filter((role) => !received.has(role));
}

export async function teamOutputRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const teamOutputId = options.teamOutputId || makeId("TOUT");
  const expectedRoles = options.expectedRoles ?? [];
  const receivedRoles = options.receivedRoles ?? [];
  const missingRoles = deriveMissingRoles(expectedRoles, receivedRoles, options.missingRoles);

  const payload = {
    packet_type: "team-output",
    recorded_at: nowIso(),
    team_output_id: teamOutputId,
    team_id: options.teamId,
    stage: options.stage,
    expected_roles: expectedRoles,
    received_roles: receivedRoles,
    missing_roles: missingRoles,
    aggregate_state: options.aggregateState,
    blocking_signals: options.blockingSignals ?? [],
    recommended_next_step: options.recommendedNextStep,
    joined_role_result_refs: options.joinedRoleResultRefs ?? [],
    artifact_refs: options.artifactRefs ?? [],
    decision_required: options.decisionRequired ?? false,
    summary: options.summary || null,
    source_task_id: options.sourceTaskId || null,
    source_parent_session_id: options.sourceParentSessionId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  if (!EXECUTION_STAGES.includes(payload.stage)) {
    throw new Error("Invalid --stage for `team-output-record`.");
  }

  await validateWithBundledSchema(payload, "aof-team-output.schema.json", "team output");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveTeamOutputsRoot(projectRoot), `${teamOutputId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    payload
  };
}
