import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { organizationStatusCommand } from "../src/commands/organization-status.js";
import { operatorBriefCommand } from "../src/commands/operator-brief.js";
import { operatorProgressCommand } from "../src/commands/operator-progress.js";
import { roadmapStatusCommand } from "../src/commands/roadmap-status.js";
import { situationAssessCommand } from "../src/commands/situation-assess.js";
import { treePositionCommand } from "../src/commands/tree-position.js";
import { visibilityExportCommand } from "../src/commands/visibility-export.js";
import { createInitializedProject } from "./runtime-test-helpers.js";

test("situationAssessCommand diagnoses the current frontier from self-hosting runtime state", async () => {
  const projectRoot = process.cwd();
  const result = await situationAssessCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.equal(result.summary.artifact_type, "situation-assessment");
  assert.equal(result.summary.active_release_version, "4.0.1");
  assert.equal(result.summary.primary_frontier_task?.task_id, "TASK-053");
  assert.equal(result.summary.primary_frontier_task?.track, "v5.0");
  assert.equal(result.summary.current_runtime_stage, "implementation-ready");
  assert.match(result.summary.recommended_action.recommended_action, /TASK-053/);
  assert.equal(result.summary.operator_alignment.prioritized_task_ids[0], "TASK-053");
  assert.equal(result.summary.current_truth_conflicts.some((conflict) => conflict.code === "stale-alignment-pulse"), false);
});

test("roadmapStatusCommand routes TASK-053 onto the v5.0 track and uses live operator alignment", async () => {
  const projectRoot = process.cwd();
  const result = await roadmapStatusCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.equal(result.alignment.prioritized_task_ids[0], "TASK-053");
  assert.match(result.alignment.answer, /TASK-053/);
  assert.ok(Array.isArray(result.release_tracks["v5.0"]));
  assert.ok(result.release_tracks["v5.0"].some((task) => task.task_id === "TASK-053"));
});

test("visibilityExportCommand surfaces situation judgment rather than stale release work", async () => {
  const projectRoot = process.cwd();
  const result = await visibilityExportCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.equal(result.payloads.mission_control.mission_overview.current_runtime_stage, "implementation-ready");
  assert.match(result.payloads.mission_control.next_action.recommended_action, /TASK-053/);
  assert.equal(result.payloads.mission_control.blockers.some((blocker) => /alignment pulse/i.test(blocker.summary)), false);
  assert.match(result.payloads.operator_brief.headline, /TASK-053|live v5\.0 frontier/i);
  assert.match(result.payloads.operator_brief.next_action.recommended_action, /TASK-053/);
  assert.equal(result.payloads.operator_progress.view_type, "operator_progress");
  assert.equal(result.payloads.tree_position.view_type, "tree_position");
  assert.equal(result.payloads.evidence_drill_down.view_type, "evidence_drill_down");
});

test("operatorBriefCommand compresses runtime situation judgment into one operator-facing packet", async () => {
  const projectRoot = process.cwd();
  const result = await operatorBriefCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.equal(result.brief.view_type, "operator_brief");
  assert.equal(result.brief.current_state.release_version, "4.0.1");
  assert.equal(result.brief.current_state.current_runtime_stage, "implementation-ready");
  assert.equal(result.brief.current_state.primary_frontier_task?.task_id, "TASK-053");
  assert.match(result.brief.operator_answers.what_should_happen_next, /TASK-053/);
});

test("organizationStatusCommand exposes the post-v4.0 operating goal and next value slice", async () => {
  const projectRoot = process.cwd();
  const result = await organizationStatusCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.match(result.goals.operating_goal, /v5\.0|Skillful Actor Runtime|live actor assignment/i);
  assert.match(result.goals.next_value_slice, /negative benchmark|missing resource|policy-bypassed|output contract/i);
});

test("operatorProgressCommand explains what changed since the last checkpoint", async () => {
  const projectRoot = process.cwd();
  const result = await operatorProgressCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.equal(result.progress.view_type, "operator_progress");
  assert.match(result.progress.progress_answer.what_changed, /TASK-047|TASK-048|TASK-049|TASK-050|TASK-051|TASK-052|TASK-053|Skillful Actor Runtime|v5\.0/i);
});

test("treePositionCommand explains the current release trunk and frontier branch", async () => {
  const projectRoot = process.cwd();
  const result = await treePositionCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.equal(result.tree.view_type, "tree_position");
  assert.equal(result.tree.branch.frontier_task_id, "TASK-053");
  assert.equal(result.tree.branch.frontier_track, "v5.0");
});

test("situationAssessCommand detects a stale alignment pulse in a lightweight initialized project", async (t) => {
  const projectRoot = await createInitializedProject(t);
  const activeRoot = path.join(projectRoot, ".aof", "context", "active");
  const goalsRoot = path.join(projectRoot, ".aof", "goals");
  const tasksOpenRoot = path.join(projectRoot, ".aof", "tasks", "open");
  await fs.mkdir(activeRoot, { recursive: true });
  await fs.mkdir(goalsRoot, { recursive: true });
  await fs.mkdir(tasksOpenRoot, { recursive: true });
  await fs.writeFile(
    path.join(goalsRoot, "next-value-slice.json"),
    `${JSON.stringify({
      artifact_type: "next-value-slice",
      content: "Define v3.7 runtime situation assessment layer"
    }, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(goalsRoot, "operating-goal.json"),
    `${JSON.stringify({
      artifact_type: "operating-goal",
      content: "Advance the runtime situation assessment layer for v3.7"
    }, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(tasksOpenRoot, "TASK-043.json"),
    `${JSON.stringify({
      task_id: "TASK-043",
      title: "Implement v3.7 runtime situation assessment and roadmap truthfulness layer",
      status: "open",
      created_at: "2026-06-18T08:00:00.000Z",
      updated_at: "2026-06-18T08:30:00.000Z",
      description: "Replace stale viewer-centric guidance with runtime-native situation judgment."
    }, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(activeRoot, "alignment-pulse.json"),
    `${JSON.stringify({
      pulse_type: "alignment-pulse",
      triggered_at: "2026-06-13T16:46:50.899Z",
      question: "What is the highest-leverage next operating move after roadmap decomposition?",
      answer: "Start TASK-009 and define the v2.3 operator-facing organization surfaces before expanding execution or allocation layers.",
      scale_direction: "Prioritize TASK-009, then carry its outputs into TASK-012 and TASK-010 in dependency order.",
      prioritized_task_ids: ["TASK-009"]
    }, null, 2)}\n`,
    "utf8"
  );

  const result = await situationAssessCommand({ project: projectRoot });

  assert.equal(result.ok, true);
  assert.ok(result.summary.current_truth_conflicts.some((conflict) => conflict.code === "stale-alignment-pulse"));
  assert.match(result.summary.recommended_action.recommended_action, /Refresh roadmap guidance/);
});
