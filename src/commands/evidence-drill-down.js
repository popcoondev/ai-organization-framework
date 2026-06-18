import fs from "node:fs/promises";
import path from "node:path";

import { organizationStatusCommand } from "./organization-status.js";
import { organizationAnalyticsSnapshotCommand } from "./organization-analytics-snapshot.js";
import { roadmapStatusCommand } from "./roadmap-status.js";
import { buildOperatorBriefView } from "./operator-brief.js";
import { loadSituationAssessmentSummary } from "./situation-assess.js";
import { resolveAofRoot } from "../runtime/project-paths.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { writeJsonArtifact } from "../runtime/utils.js";

function uniqueRefs(refs) {
  return [...new Set(refs.filter(Boolean))];
}

async function readJsonIfExists(filePath, label) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function mapEvidenceItems(refs, reason) {
  return uniqueRefs(refs).map((artifactRef) => ({
    artifact_ref: artifactRef,
    why_it_matters: reason
  }));
}

export function buildEvidenceDrillDownView({
  organizationStatus,
  roadmapStatus,
  analytics,
  situation,
  brief
}) {
  const releaseDefinitionRef = roadmapStatus.roadmap_refs?.current_release_definition ?? null;
  const frontier = brief.current_state.primary_frontier_task;
  const activeReleaseRef = ".aof/context/active/active-release-manifest.json";
  const operatingGoalRef = ".aof/goals/operating-goal.json";
  const nextValueSliceRef = ".aof/goals/next-value-slice.json";
  const alignmentPulseRef = ".aof/context/active/alignment-pulse.json";
  const analyticsRef = ".aof/context/active/organization-analytics.json";

  const headlineEvidenceRefs = uniqueRefs([
    releaseDefinitionRef,
    activeReleaseRef,
    operatingGoalRef,
    nextValueSliceRef,
    frontier?.artifact_ref ?? null,
    ...brief.why_now.evidence_refs
  ]);
  const blockerEvidenceRefs = uniqueRefs([
    analyticsRef,
    alignmentPulseRef,
    ...brief.blockers.map((entry) => entry.artifact_ref),
    frontier?.artifact_ref ?? null
  ]);
  const nextActionEvidenceRefs = uniqueRefs([
    frontier?.artifact_ref ?? null,
    brief.next_action.artifact_ref,
    nextValueSliceRef,
    operatingGoalRef,
    releaseDefinitionRef
  ]);

  const blockerClaim = brief.blockers.length > 0
    ? `${brief.blockers.length} blocker signal(s) currently influence the operator path.`
    : "No blocker is currently strong enough to displace the live frontier.";

  return {
    view_type: "evidence_drill_down",
    generated_at: brief.generated_at,
    brief_ref: ".aof/artifacts/visibility/current/operator-brief.json",
    current_state: {
      release_version: brief.current_state.release_version,
      active_release_track: brief.current_state.active_release_track,
      release_definition_ref: releaseDefinitionRef,
      current_runtime_stage: brief.current_state.current_runtime_stage,
      primary_frontier_task: frontier
    },
    answer_to_proof: {
      headline: {
        claim: brief.headline,
        rationale: brief.why_now.summary,
        evidence_refs: headlineEvidenceRefs,
        evidence_items: mapEvidenceItems(
          headlineEvidenceRefs,
          "Supports why the current frontier and headline are the live operator truth."
        )
      },
      blockers: {
        claim: blockerClaim,
        rationale: brief.blockers.length > 0
          ? "Current blockers are derived from truth conflicts or organization pressure signals."
          : "No truth conflict or organization pressure currently overrides the recommended frontier.",
        entries: brief.blockers,
        evidence_refs: blockerEvidenceRefs,
        evidence_items: mapEvidenceItems(
          blockerEvidenceRefs,
          "Supports why the current blocker state is empty or populated."
        )
      },
      next_action: {
        claim: brief.next_action.recommended_action,
        rationale: brief.next_action.rationale,
        artifact_ref: brief.next_action.artifact_ref,
        evidence_refs: nextActionEvidenceRefs,
        evidence_items: mapEvidenceItems(
          nextActionEvidenceRefs,
          "Supports why this next action is the highest-leverage current move."
        )
      }
    },
    bounded_path: [
      {
        step: "operator_brief",
        label: "Operator Brief",
        artifact_ref: ".aof/artifacts/visibility/current/operator-brief.json"
      },
      {
        step: "frontier_task",
        label: frontier?.title ?? "No frontier task",
        artifact_ref: frontier?.artifact_ref ?? null
      },
      {
        step: "goal_surface",
        label: "Operating Goal",
        artifact_ref: operatingGoalRef
      },
      {
        step: "slice_surface",
        label: "Next Value Slice",
        artifact_ref: nextValueSliceRef
      },
      {
        step: "release_basis",
        label: "Active Release Manifest",
        artifact_ref: activeReleaseRef
      }
    ],
    operator_questions: {
      why_headline_true: brief.why_now.summary,
      what_proves_blockers: blockerClaim,
      what_proves_next_action: brief.next_action.rationale
    }
  };
}

export async function evidenceDrillDownCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const artifactPath = path.resolve(
    options.artifactPath || path.join(aofRoot, "artifacts", "visibility", "current", "evidence-drill-down.json")
  );

  const [organizationStatus, roadmapStatus, analyticsResult, situation, existingBrief] = await Promise.all([
    organizationStatusCommand({ project: projectRoot }),
    roadmapStatusCommand({ project: projectRoot }),
    organizationAnalyticsSnapshotCommand({ project: projectRoot }),
    loadSituationAssessmentSummary(projectRoot),
    readJsonIfExists(path.join(aofRoot, "artifacts", "visibility", "current", "operator-brief.json"), "operator brief")
  ]);

  const brief = existingBrief && existingBrief.view_type === "operator_brief"
    ? existingBrief
    : buildOperatorBriefView({
        organizationStatus,
        roadmapStatus,
        analytics: analyticsResult.payload,
        situation
      });

  const drillDown = buildEvidenceDrillDownView({
    organizationStatus,
    roadmapStatus,
    analytics: analyticsResult.payload,
    situation,
    brief
  });
  await validateWithBundledSchema(drillDown, "aof-evidence-drill-down-view.schema.json", "evidence drill-down view");

  let writtenArtifactPath = null;
  if (artifactPath) {
    writtenArtifactPath = await writeJsonArtifact(artifactPath, drillDown);
  }

  return {
    ok: true,
    artifactPath: writtenArtifactPath,
    drillDown
  };
}
