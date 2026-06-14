import path from "node:path";

import { nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import {
  listExecutionArtifacts,
  normalizeArtifactRef,
  resolveCouncilReviewsRoot,
  resolveRoleResultsRoot,
  resolveTeamOutputsRoot
} from "./execution-artifact-helpers.js";
import { resolveAofRoot } from "../runtime/project-memory.js";

function matchesFilters(payload, options) {
  if (options.sourceParentSessionId && payload.source_parent_session_id !== options.sourceParentSessionId) {
    return false;
  }
  if (options.sourceTaskId && payload.source_task_id !== options.sourceTaskId) {
    return false;
  }
  if (options.stage && payload.stage !== options.stage) {
    return false;
  }
  return true;
}

function summarizeRoleResult(projectRoot, entry) {
  return {
    role_result_id: entry.payload.role_result_id ?? null,
    role: entry.payload.role,
    stage: entry.payload.stage,
    status: entry.payload.status,
    decision_required: entry.payload.decision_required,
    artifact_ref: normalizeArtifactRef(projectRoot, entry.filePath)
  };
}

function summarizeTeamOutput(projectRoot, entry) {
  return {
    team_output_id: entry.payload.team_output_id ?? null,
    team_id: entry.payload.team_id,
    stage: entry.payload.stage,
    aggregate_state: entry.payload.aggregate_state,
    decision_required: entry.payload.decision_required,
    artifact_ref: normalizeArtifactRef(projectRoot, entry.filePath)
  };
}

function summarizeCouncilReview(projectRoot, entry) {
  return {
    review_packet_id: entry.payload.review_packet_id ?? null,
    council_id: entry.payload.council_id,
    stage: entry.payload.stage,
    review_status: entry.payload.review_status,
    escalation_required: entry.payload.escalation_required,
    artifact_ref: normalizeArtifactRef(projectRoot, entry.filePath)
  };
}

function latestStage(roleResults, teamOutputs, councilReviews) {
  const stages = [...roleResults, ...teamOutputs, ...councilReviews]
    .map((entry) => entry.payload.stage)
    .filter(Boolean);
  return stages.at(-1) ?? null;
}

function deriveRecommendedNextStep(roleResults, teamOutputs, councilReviews) {
  const latestReview = councilReviews.at(-1)?.payload;
  if (latestReview?.recommendation) {
    return latestReview.recommendation;
  }
  const latestTeamOutput = teamOutputs.at(-1)?.payload;
  if (latestTeamOutput?.recommended_next_step) {
    return latestTeamOutput.recommended_next_step;
  }
  const latestRoleResult = roleResults.at(-1)?.payload;
  if (latestRoleResult?.recommendation) {
    return latestRoleResult.recommendation;
  }
  return "no execution packet recommendation is available yet";
}

export async function executionLineageCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const [allRoleResults, allTeamOutputs, allCouncilReviews] = await Promise.all([
    listExecutionArtifacts(resolveRoleResultsRoot(projectRoot), "role result"),
    listExecutionArtifacts(resolveTeamOutputsRoot(projectRoot), "team output"),
    listExecutionArtifacts(resolveCouncilReviewsRoot(projectRoot), "council review")
  ]);

  const roleResults = allRoleResults.filter((entry) => matchesFilters(entry.payload, options));
  const teamOutputs = allTeamOutputs.filter((entry) => matchesFilters(entry.payload, options));
  const councilReviews = allCouncilReviews.filter((entry) => matchesFilters(entry.payload, options));
  const roleResultSummaries = roleResults.map((entry) => summarizeRoleResult(projectRoot, entry));
  const teamOutputSummaries = teamOutputs.map((entry) => summarizeTeamOutput(projectRoot, entry));
  const councilReviewSummaries = councilReviews.map((entry) => summarizeCouncilReview(projectRoot, entry));
  const stagesObserved = [...new Set(
    [...roleResults, ...teamOutputs, ...councilReviews]
      .map((entry) => entry.payload.stage)
      .filter(Boolean)
  )];

  const payload = {
    snapshot_type: "execution-lineage",
    generated_at: nowIso(),
    source_parent_session_id: options.sourceParentSessionId || null,
    source_task_id: options.sourceTaskId || null,
    stage_filter: options.stage || null,
    role_result_count: roleResultSummaries.length,
    team_output_count: teamOutputSummaries.length,
    council_review_count: councilReviewSummaries.length,
    decision_required_count: roleResults.filter((entry) => entry.payload.decision_required).length
      + teamOutputs.filter((entry) => entry.payload.decision_required).length,
    blocking_signal_count: roleResults.reduce((count, entry) => count + (entry.payload.signals?.length ?? 0), 0)
      + teamOutputs.reduce((count, entry) => count + (entry.payload.blocking_signals?.length ?? 0), 0),
    stages_observed: stagesObserved,
    latest_stage: latestStage(roleResults, teamOutputs, councilReviews),
    recommended_next_step: deriveRecommendedNextStep(roleResults, teamOutputs, councilReviews),
    role_results: roleResultSummaries,
    team_outputs: teamOutputSummaries,
    council_reviews: councilReviewSummaries
  };

  await validateWithBundledSchema(payload, "aof-execution-lineage.schema.json", "execution lineage");
  const artifactPath = await writeJsonArtifact(
    path.join(resolveAofRoot(projectRoot), "context", "active", "execution-lineage.json"),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    payload
  };
}
