import path from "node:path";

import { organizationStatusCommand } from "./organization-status.js";
import { roadmapStatusCommand } from "./roadmap-status.js";
import { loadSituationAssessmentSummary, normalizeTrackLabel } from "./situation-assess.js";
import { resolveAofRoot } from "../runtime/project-paths.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { writeJsonArtifact } from "../runtime/utils.js";

function buildRoadmapPath(activeTrack, frontierTrack) {
  const pathItems = [];
  if (activeTrack) {
    pathItems.push({
      kind: "shipped-release",
      label: activeTrack,
      state: "done"
    });
  }
  if (frontierTrack && frontierTrack !== activeTrack) {
    pathItems.push({
      kind: "frontier-track",
      label: frontierTrack,
      state: "current"
    });
  }
  return pathItems;
}

export function buildTreePositionView({
  organizationStatus,
  roadmapStatus,
  situation
}) {
  const releaseVersion = organizationStatus.active_release?.release_version ?? situation.active_release_version ?? null;
  const activeTrack = normalizeTrackLabel(releaseVersion);
  const frontier = situation.primary_frontier_task;
  const frontierTrack = frontier?.track ?? null;

  return {
    view_type: "tree_position",
    generated_at: situation.generated_at,
    trunk: {
      label: "AOF release evolution",
      active_release_version: releaseVersion,
      active_release_track: activeTrack,
      release_definition_ref: roadmapStatus.roadmap_refs?.current_release_definition ?? null
    },
    branch: {
      frontier_track: frontierTrack,
      frontier_task_id: frontier?.task_id ?? null,
      frontier_task_title: frontier?.title ?? null,
      artifact_ref: frontier?.artifact_ref ?? null,
      branch_summary: organizationStatus.goals.next_value_slice
    },
    roadmap_path: buildRoadmapPath(activeTrack, frontierTrack),
    tree_answer: {
      where_are_we: frontier
        ? `${frontier.task_id} sits on ${frontierTrack} after shipped ${activeTrack ?? releaseVersion ?? "current release"}.`
        : `The runtime is between ${activeTrack ?? releaseVersion ?? "the active release"} and the next concrete branch.`,
      why_this_branch: organizationStatus.goals.operating_goal,
      what_branch_comes_next: situation.recommended_action?.recommended_action ?? "Define the next branch."
    }
  };
}

export async function treePositionCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const artifactPath = path.resolve(
    options.artifactPath || path.join(aofRoot, "artifacts", "visibility", "current", "tree-position.json")
  );

  const [organizationStatus, roadmapStatus, situation] = await Promise.all([
    organizationStatusCommand({ project: projectRoot }),
    roadmapStatusCommand({ project: projectRoot }),
    loadSituationAssessmentSummary(projectRoot)
  ]);

  const tree = buildTreePositionView({
    organizationStatus,
    roadmapStatus,
    situation
  });
  await validateWithBundledSchema(tree, "aof-tree-position-view.schema.json", "tree position view");

  const writtenArtifactPath = await writeJsonArtifact(artifactPath, tree);
  return {
    ok: true,
    artifactPath: writtenArtifactPath,
    tree
  };
}
