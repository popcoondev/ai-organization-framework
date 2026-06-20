import path from "node:path";

import { organizationStatusCommand } from "./organization-status.js";
import { organizationAnalyticsSnapshotCommand } from "./organization-analytics-snapshot.js";
import { roadmapStatusCommand } from "./roadmap-status.js";
import { loadSituationAssessmentSummary } from "./situation-assess.js";
import { resolveAofRoot } from "../runtime/project-paths.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { writeJsonArtifact } from "../runtime/utils.js";

function uniqueRefs(refs) {
  return [...new Set(refs.filter(Boolean))];
}

function buildFrontierReason(organizationStatus, frontier) {
  const operatingGoal = organizationStatus.goals.operating_goal ?? "";
  const nextValueSlice = organizationStatus.goals.next_value_slice ?? "";
  const combined = `${operatingGoal} ${nextValueSlice}`.toLowerCase();

  if (
    combined.includes("skillful actor runtime") ||
    combined.includes("actor skill packet") ||
    combined.includes("live actor assignment")
  ) {
    return "The current operating goal and next value slice both point at skillful actor assignment: skills, capabilities, resources, policies, and review evidence should shape who does the work.";
  }

  if (
    combined.includes("human recognition interface") ||
    combined.includes("speech-bubble") ||
    combined.includes("roadmap sugoroku")
  ) {
    return "The current operating goal and next value slice both point at a one-screen Human Recognition Interface rather than another abstract visibility artifact.";
  }

  if (
    combined.includes("governed workforce runtime") ||
    combined.includes("capability-aware") ||
    combined.includes("policy-aware")
  ) {
    return "The current operating goal and next value slice both point at live workforce reasoning rather than additional viewer polish.";
  }

  if (
    combined.includes("visual grammar") ||
    combined.includes("plugin boundary") ||
    combined.includes("visibility architecture")
  ) {
    return "The current operating goal and next value slice both point at governed operator-surface grammar rather than broader observability growth.";
  }

  return `The current operating goal and next value slice both reinforce ${frontier?.task_id ?? "the current frontier"} as the next bounded operating move.`;
}

function buildHeadline(situation) {
  if ((situation.current_truth_conflicts?.length ?? 0) > 0) {
    return "Runtime truth conflicts require attention before broader execution claims.";
  }
  if (situation.primary_frontier_task) {
    return `${situation.primary_frontier_task.task_id} is the live ${situation.primary_frontier_task.track ?? "current"} frontier after ${situation.active_release_version ?? "the current release"}.`;
  }
  if (situation.next_value_slice) {
    return `The next frontier is defined, but no aligned implementation task is open yet: ${situation.next_value_slice}`;
  }
  return "The runtime needs a clearer next frontier before it can brief operators confidently.";
}

function summarizeBlockers(situation, analytics) {
  const blockers = [];
  for (const conflict of situation.current_truth_conflicts ?? []) {
    blockers.push({
      summary: conflict.summary,
      severity: conflict.severity,
      artifact_ref: conflict.artifact_ref
    });
  }
  for (const observation of analytics.observations ?? []) {
    if (observation !== "No immediate organization bottleneck was detected from the current local artifact set.") {
      blockers.push({
        summary: observation,
        severity: "runtime",
        artifact_ref: ".aof/context/active/organization-analytics.json"
      });
    }
  }
  return blockers;
}

export function buildOperatorBriefView({
  organizationStatus,
  roadmapStatus,
  analytics,
  situation
}) {
  const blockers = summarizeBlockers(situation, analytics);
  const frontier = situation.primary_frontier_task;
  const hasConflicts = blockers.length > 0;
  const releaseVersion = organizationStatus.active_release?.release_version ?? situation.active_release_version ?? null;
  const releaseTrack = situation.active_release_track ?? null;
  const releaseDefinitionRef = roadmapStatus.roadmap_refs?.current_release_definition ?? null;
  const whySummary = hasConflicts
    ? "The runtime found current-state contradictions or pressure signals that weaken operator confidence until they are reconciled."
    : frontier
      ? `${frontier.task_id} is the best current frontier because it matches the live post-release goal surface and no stronger truth conflict is active.`
      : "The runtime has a named goal surface, but it still needs an aligned implementation task before the operator path is fully concrete.";
  const reasons = hasConflicts
    ? [
        `The active release baseline is ${releaseVersion ?? "unknown"}, but at least one current truth conflict still needs reconciliation.`,
        "Operator guidance should follow diagnosis before expanding visibility or execution claims."
      ]
    : [
        `The active release baseline is ${releaseVersion ?? "unknown"} and the runtime is now targeting ${frontier?.track ?? "the next track"}.`,
        buildFrontierReason(organizationStatus, frontier)
      ];
  const evidenceRefs = uniqueRefs([
    releaseDefinitionRef,
    ".aof/goals/operating-goal.json",
    ".aof/goals/next-value-slice.json",
    frontier?.artifact_ref ?? null,
    situation.recommended_action?.artifact_ref ?? null,
    blockers.some((blocker) => blocker.artifact_ref === ".aof/context/active/organization-analytics.json")
      ? ".aof/context/active/organization-analytics.json"
      : null,
    blockers.some((blocker) => blocker.artifact_ref === ".aof/context/active/alignment-pulse.json")
      ? ".aof/context/active/alignment-pulse.json"
      : null
  ]);

  return {
    view_type: "operator_brief",
    generated_at: situation.generated_at,
    headline: buildHeadline(situation),
    current_state: {
      release_version: releaseVersion,
      active_release_track: releaseTrack,
      release_definition_ref: releaseDefinitionRef,
      current_runtime_stage: situation.current_runtime_stage,
      operating_goal: organizationStatus.goals.operating_goal,
      next_value_slice: organizationStatus.goals.next_value_slice,
      primary_frontier_task: frontier
    },
    why_now: {
      summary: whySummary,
      reasons,
      evidence_refs: evidenceRefs
    },
    blockers,
    next_action: situation.recommended_action,
    operator_answers: {
      what_is_happening_now: frontier
        ? `${frontier.task_id} is the current frontier and the runtime is in ${situation.current_runtime_stage}.`
        : `The runtime is in ${situation.current_runtime_stage} and still needs a more concrete frontier task.`,
      why_this_state: whySummary,
      what_is_blocked: blockers.length > 0
        ? blockers.map((blocker) => blocker.summary).join(" ")
        : "No critical truth conflict is currently blocking the frontier.",
      what_should_happen_next: situation.recommended_action?.recommended_action ?? "Define the next operating move."
    }
  };
}

export async function operatorBriefCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const artifactPath = path.resolve(
    options.artifactPath || path.join(aofRoot, "artifacts", "visibility", "current", "operator-brief.json")
  );

  const [organizationStatus, roadmapStatus, analyticsResult, situation] = await Promise.all([
    organizationStatusCommand({ project: projectRoot }),
    roadmapStatusCommand({ project: projectRoot }),
    organizationAnalyticsSnapshotCommand({ project: projectRoot }),
    loadSituationAssessmentSummary(projectRoot)
  ]);

  const brief = buildOperatorBriefView({
    organizationStatus,
    roadmapStatus,
    analytics: analyticsResult.payload,
    situation
  });
  await validateWithBundledSchema(brief, "aof-operator-brief-view.schema.json", "operator brief view");

  let writtenArtifactPath = null;
  if (artifactPath) {
    writtenArtifactPath = await writeJsonArtifact(artifactPath, brief);
  }

  return {
    ok: true,
    artifactPath: writtenArtifactPath,
    brief
  };
}
