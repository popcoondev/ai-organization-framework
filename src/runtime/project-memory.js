import fs from "node:fs/promises";
import path from "node:path";

import { ensureDir, nowIso, writeJsonArtifact } from "./utils.js";
import { validateWithBundledSchema } from "./validation.js";

const TASK_DIRS = ["open", "assigned", "done", "archived", "retired"];

const GOAL_TYPE_TO_FILE = {
  "north-star": "north-star.json",
  "operating-goal": "operating-goal.json",
  "next-value-slice": "next-value-slice.json"
};

const RECENT_CONFIRMATION_WINDOW_FILE = "recent-confirmation-window.json";
const ALIGNMENT_PULSE_FILE = "alignment-pulse.json";
const FRAMEWORK_SELF_AUDIT_FILE = "framework-self-audit.json";
const RETIRE_REVIEW_FILE = "retire-candidate-review.json";
const CADENCE_TRIGGER_GUIDANCE_FILE = "cadence-trigger-guidance.json";
const CADENCE_FOLLOW_THROUGH_FILE = "cadence-follow-through.json";
const CADENCE_TICK_FILE = "cadence-tick.json";
const CADENCE_TIMING_FILE = "cadence-timing.json";
const CADENCE_CYCLE_FILE = "cadence-cycle.json";
const CADENCE_SCHEDULE_FILE = "cadence-schedule.json";
const CADENCE_DISPATCH_FILE = "cadence-dispatch.json";
const CADENCE_SCHEDULER_BINDING_FILE = "cadence-scheduler-binding.json";

export function resolveAofRoot(projectRoot) {
  return path.join(path.resolve(projectRoot), ".aof");
}

async function listTaskFiles(tasksRoot) {
  const files = [];
  for (const taskDir of TASK_DIRS) {
    const dirPath = path.join(tasksRoot, taskDir);
    await ensureDir(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.startsWith("TASK-") && entry.name.endsWith(".json")) {
        files.push(path.join(dirPath, entry.name));
      }
    }
  }
  return files;
}

async function listTaskFilesForStatus(tasksRoot, status) {
  const dirPath = path.join(tasksRoot, status);
  await ensureDir(dirPath);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith("TASK-") && entry.name.endsWith(".json"))
    .map((entry) => path.join(dirPath, entry.name));
}

async function loadJsonFileOrNull(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function findTaskFile(tasksRoot, taskId) {
  const files = await listTaskFiles(tasksRoot);
  return files.find((filePath) => path.basename(filePath) === `${taskId}.json`) ?? null;
}

async function nextTaskId(tasksRoot) {
  const files = await listTaskFiles(tasksRoot);
  let maxId = 0;
  for (const filePath of files) {
    const match = path.basename(filePath).match(/^TASK-(\d+)\.json$/);
    if (!match) {
      continue;
    }
    maxId = Math.max(maxId, Number(match[1]));
  }
  return `TASK-${String(maxId + 1).padStart(3, "0")}`;
}

export async function createOpenTask({
  projectRoot,
  title,
  description = null,
  origin = null,
  orchestratorSessionId = null,
  assignedSessionIds = [],
  relatedDecisionRecordId = null,
  operatingGoalRef = null,
  triageNotes = null
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  const openRoot = path.join(tasksRoot, "open");
  await ensureDir(openRoot);
  const taskId = await nextTaskId(tasksRoot);
  const timestamp = nowIso();
  const payload = {
    task_id: taskId,
    title,
    description,
    status: "open",
    origin,
    orchestrator_session_id: orchestratorSessionId,
    assigned_session_ids: assignedSessionIds,
    related_decision_record_id: relatedDecisionRecordId,
    operating_goal_ref: operatingGoalRef,
    created_at: timestamp,
    updated_at: timestamp,
    assigned_at: null,
    done_at: null,
    retired_at: null,
    last_triaged_at: null,
    stale_candidate_at: null,
    retire_candidate_at: null,
    triage_notes: triageNotes
  };

  await validateWithBundledSchema(payload, "aof-task.schema.json", "task");
  const taskPath = path.join(openRoot, `${taskId}.json`);
  await writeJsonArtifact(taskPath, payload);
  return {
    ok: true,
    taskId,
    taskPath,
    payload
  };
}

export async function updateTaskArtifact({
  projectRoot,
  taskId,
  status = null,
  assignedSessionIds,
  relatedDecisionRecordId,
  triageNotes,
  lastTriagedAt,
  staleCandidateAt,
  retireCandidateAt
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  const taskPath = await findTaskFile(tasksRoot, taskId);
  if (!taskPath) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const current = JSON.parse(await fs.readFile(taskPath, "utf8"));
  const nextStatus = status ?? current.status;
  if (!TASK_DIRS.includes(nextStatus)) {
    throw new Error(`Unsupported task status: ${nextStatus}`);
  }

  const timestamp = nowIso();
  const payload = {
    ...current,
    status: nextStatus,
    assigned_session_ids: assignedSessionIds ?? current.assigned_session_ids ?? [],
    related_decision_record_id: relatedDecisionRecordId ?? current.related_decision_record_id ?? null,
    triage_notes: triageNotes ?? current.triage_notes ?? null,
    updated_at: timestamp,
    assigned_at: nextStatus === "assigned"
      ? current.assigned_at ?? timestamp
      : current.assigned_at ?? null,
    done_at: nextStatus === "done"
      ? current.done_at ?? timestamp
      : current.done_at ?? null,
    retired_at: nextStatus === "retired"
      ? current.retired_at ?? timestamp
      : current.retired_at ?? null,
    last_triaged_at: lastTriagedAt ?? current.last_triaged_at ?? null,
    stale_candidate_at: staleCandidateAt !== undefined ? staleCandidateAt : current.stale_candidate_at ?? null,
    retire_candidate_at: retireCandidateAt !== undefined ? retireCandidateAt : current.retire_candidate_at ?? null
  };

  await validateWithBundledSchema(payload, "aof-task.schema.json", "task");
  const nextPath = path.join(tasksRoot, nextStatus, `${taskId}.json`);
  await ensureDir(path.dirname(nextPath));
  await writeJsonArtifact(nextPath, payload);
  if (path.resolve(taskPath) !== path.resolve(nextPath)) {
    await fs.rm(taskPath, { force: true });
  }

  return {
    ok: true,
    taskId,
    taskPath: nextPath,
    payload
  };
}

export async function listTaskArtifacts({
  projectRoot,
  status = "open"
}) {
  if (!TASK_DIRS.includes(status)) {
    throw new Error(`Unsupported task status: ${status}`);
  }
  const aofRoot = resolveAofRoot(projectRoot);
  const tasksRoot = path.join(aofRoot, "tasks");
  const files = await listTaskFilesForStatus(tasksRoot, status);
  const payloads = await Promise.all(
    files.map(async (filePath) => ({
      taskPath: filePath,
      payload: JSON.parse(await fs.readFile(filePath, "utf8"))
    }))
  );
  return {
    ok: true,
    status,
    tasks: payloads
  };
}

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

export async function recordAlignmentPulse({
  projectRoot,
  question,
  answer,
  expectationState = null,
  mismatchState = null,
  scaleDirection = null,
  prioritizedTaskIds = [],
  staleTaskIds = [],
  retireCandidateTaskIds = [],
  triageNote = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const openTasks = await listTaskArtifacts({ projectRoot, status: "open" });
  const openTaskIds = openTasks.tasks.map((task) => task.payload.task_id);
  const timestamp = nowIso();

  const pulsePayload = {
    pulse_type: "alignment-pulse",
    triggered_at: timestamp,
    question,
    answer,
    expectation_state: expectationState,
    mismatch_state: mismatchState,
    scale_direction: scaleDirection,
    open_task_ids: openTaskIds,
    prioritized_task_ids: prioritizedTaskIds,
    stale_task_ids: staleTaskIds,
    retire_candidate_task_ids: retireCandidateTaskIds,
    triage_note: triageNote,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(pulsePayload, "aof-alignment-pulse.schema.json", "alignment pulse");
  const pulsePath = path.join(activeContextRoot, ALIGNMENT_PULSE_FILE);
  await writeJsonArtifact(pulsePath, pulsePayload);

  const triagedTasks = await Promise.all(
    openTaskIds.map((taskId) => {
      const isPrioritized = prioritizedTaskIds.includes(taskId);
      const isStale = staleTaskIds.includes(taskId);
      const isRetireCandidate = retireCandidateTaskIds.includes(taskId);
      const tags = [
        isPrioritized ? "prioritized" : null,
        isStale ? "stale" : null,
        isRetireCandidate ? "retire-candidate" : null
      ].filter(Boolean);
      const nextTriageNote = triageNote
        ? tags.length > 0
          ? `${triageNote} [${tags.join(", ")}]`
          : triageNote
        : tags.length > 0
          ? `alignment pulse classification [${tags.join(", ")}]`
          : null;

      return updateTaskArtifact({
        projectRoot,
        taskId,
        status: "open",
        triageNotes: nextTriageNote,
        lastTriagedAt: timestamp,
        staleCandidateAt: isStale ? timestamp : null,
        retireCandidateAt: isRetireCandidate ? timestamp : null
      });
    })
  );

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question,
    answer,
    expectationState,
    mismatchState,
    scaleDirection,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  const guidanceRefreshResult = await generateCadenceTriggerGuidance({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  const scheduleRefreshResult = await generateCadenceSchedule({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  return {
    ok: true,
    pulsePath,
    pulsePayload,
    triagedTasks,
    confirmationResult,
    guidanceRefreshResult,
    scheduleRefreshResult
  };
}

export async function recordFrameworkSelfAudit({
  projectRoot,
  auditId,
  scope,
  summary,
  detectedGap,
  resultState = null,
  nextAction,
  relatedTaskIds = [],
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  nextValueSliceContent = null,
  maxEntries = 3
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const recordedAt = nowIso();
  const payload = {
    audit_type: "framework-self-audit",
    recorded_at: recordedAt,
    audit_id: auditId,
    scope,
    summary,
    detected_gap: detectedGap,
    result_state: resultState,
    next_action: nextAction,
    related_task_ids: relatedTaskIds,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-self-audit.schema.json", "framework self-audit");
  const auditPath = path.join(activeContextRoot, FRAMEWORK_SELF_AUDIT_FILE);
  await writeJsonArtifact(auditPath, payload);

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question: "framework self-audit で次に残る gap は何か",
    answer: detectedGap,
    expectationState: summary,
    mismatchState: detectedGap,
    scaleDirection: nextAction,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  let nextValueSliceResult = null;
  if (nextValueSliceContent) {
    nextValueSliceResult = await writeGoalProjection({
      projectRoot,
      goalType: "next-value-slice",
      content: nextValueSliceContent,
      agreedWithHuman: null,
      sourceSessionId,
      sourceDecisionRecordId,
      declaredComplete: false
    });
  }

  const guidanceRefreshResult = await generateCadenceTriggerGuidance({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  const scheduleRefreshResult = await generateCadenceSchedule({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  return {
    ok: true,
    auditPath,
    payload,
    confirmationResult,
    nextValueSliceResult,
    guidanceRefreshResult,
    scheduleRefreshResult
  };
}

export async function recordRetireCandidateReview({
  projectRoot,
  resolution,
  taskIds,
  note,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3
}) {
  if (!["retire", "keep-open"].includes(resolution)) {
    throw new Error(`Unsupported retire-candidate resolution: ${resolution}`);
  }

  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const recordedAt = nowIso();
  const payload = {
    review_type: "retire-candidate-review",
    recorded_at: recordedAt,
    resolution,
    reviewed_task_ids: taskIds,
    note,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-retire-review.schema.json", "retire candidate review");
  const reviewPath = path.join(activeContextRoot, RETIRE_REVIEW_FILE);
  await writeJsonArtifact(reviewPath, payload);

  const updatedTasks = await Promise.all(
    taskIds.map(async (taskId) => {
      const nextStatus = resolution === "retire" ? "retired" : "open";
      const nextTriageNote = resolution === "retire"
        ? `${note} [retired]`
        : `${note} [kept-open]`;

      return updateTaskArtifact({
        projectRoot,
        taskId,
        status: nextStatus,
        triageNotes: nextTriageNote,
        lastTriagedAt: recordedAt,
        staleCandidateAt: resolution === "keep-open" ? null : undefined,
        retireCandidateAt: resolution === "keep-open" ? null : recordedAt
      });
    })
  );

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question: "retire candidate review で何を決めたか",
    answer: note,
    expectationState: resolution === "retire"
      ? "retire-candidate task was retired through runtime-backed review"
      : "retire-candidate task stayed open after runtime-backed review",
    mismatchState: null,
    scaleDirection: resolution === "retire"
      ? "continue with the remaining open tasks"
      : "keep the task visible in the next cadence review",
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  const guidanceRefreshResult = await generateCadenceTriggerGuidance({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  const scheduleRefreshResult = await generateCadenceSchedule({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  return {
    ok: true,
    reviewPath,
    payload,
    updatedTasks,
    confirmationResult,
    guidanceRefreshResult,
    scheduleRefreshResult
  };
}

export async function generateCadenceTriggerGuidance({
  projectRoot,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3,
  recordConfirmation = true
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const openTasks = await listTaskArtifacts({ projectRoot, status: "open" });
  const retireReviewCandidateIds = openTasks.tasks
    .filter((task) => Boolean(task.payload.retire_candidate_at))
    .map((task) => task.payload.task_id);

  const alignmentPulse = await loadJsonFileOrNull(path.join(activeContextRoot, ALIGNMENT_PULSE_FILE));
  const selfAudit = await loadJsonFileOrNull(path.join(activeContextRoot, FRAMEWORK_SELF_AUDIT_FILE));

  const recommendedActions = [];
  const suggestedCommands = [];
  if (!alignmentPulse) {
    recommendedActions.push("run alignment-pulse");
    suggestedCommands.push({
      action: "run alignment-pulse",
      command: "node ./src/cli.js alignment-pulse --project . --question \"まだ解くべき問題は同じか\" --answer \"はい\"",
      reason: "No active alignment-pulse artifact is present."
    });
  }
  if (!selfAudit) {
    recommendedActions.push("run self-audit-record");
    suggestedCommands.push({
      action: "run self-audit-record",
      command: "node ./src/cli.js self-audit-record --project . --audit-id FSA-XXX --scope \"cadence review\" --summary \"current cadence state\" --detected-gap \"remaining gap\" --next-action \"next operating move\"",
      reason: "No active framework-self-audit artifact is present."
    });
  }
  if (retireReviewCandidateIds.length > 0) {
    recommendedActions.push("run retire-candidate-review");
    suggestedCommands.push({
      action: "run retire-candidate-review",
      command: `node ./src/cli.js retire-candidate-review --project . --resolution keep-open ${retireReviewCandidateIds.map((taskId) => `--task-id ${taskId}`).join(" ")} --note "Reviewed during cadence guidance follow-through"`,
      reason: `${retireReviewCandidateIds.length} open task(s) are marked as retire candidates.`
    });
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push("keep normal cadence monitoring");
    suggestedCommands.push({
      action: "keep normal cadence monitoring",
      command: "No immediate cadence command is required.",
      reason: "Active cadence surfaces are present and there are no retire-review candidates."
    });
  }

  const actionableCount = recommendedActions.filter((action) => action !== "keep normal cadence monitoring").length;
  const triggerState = actionableCount === 0 ? "idle" : "follow-through-recommended";
  const batchingMode = actionableCount === 0
    ? "none"
    : actionableCount === 1
      ? "single-action"
      : "batched-follow-through";
  const policyReason = actionableCount === 0
    ? "No unresolved cadence trigger was detected."
    : batchingMode === "single-action"
      ? "One cadence action is sufficient to restore follow-through."
      : "Multiple cadence actions are simultaneously recommended, so batching reduces operator overhead.";

  const summary = retireReviewCandidateIds.length > 0
    ? `Retire review is recommended for ${retireReviewCandidateIds.length} open task(s).`
    : recommendedActions.includes("keep normal cadence monitoring")
      ? "Current cadence surfaces are present; continue normal cadence monitoring."
      : `Cadence guidance recommends: ${recommendedActions.join(", ")}.`;

  const recordedAt = nowIso();
  const payload = {
    guidance_type: "cadence-trigger-guidance",
    recorded_at: recordedAt,
    open_task_count: openTasks.tasks.length,
    retire_review_candidate_ids: retireReviewCandidateIds,
    trigger_state: triggerState,
    batching_mode: batchingMode,
    policy_reason: policyReason,
    recommended_actions: recommendedActions,
    suggested_commands: suggestedCommands,
    summary,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-trigger-guidance.schema.json", "cadence trigger guidance");
  const guidancePath = path.join(activeContextRoot, CADENCE_TRIGGER_GUIDANCE_FILE);
  await writeJsonArtifact(guidancePath, payload);

  const confirmationResult = recordConfirmation
    ? await recordRecentConfirmation({
        projectRoot,
        question: "cadence guidance では次に何をすべきか",
        answer: summary,
        expectationState: "cadence surfaces are runtime-backed and can be inspected through a guidance artifact",
        mismatchState: recommendedActions.includes("keep normal cadence monitoring") ? null : summary,
        scaleDirection: recommendedActions.join("; "),
        sourceSessionId,
        sourceDecisionRecordId,
        maxEntries
      })
    : null;

  return {
    ok: true,
    guidancePath,
    payload,
    confirmationResult
  };
}

export async function executeCadenceFollowThrough({
  projectRoot,
  resolution = null,
  note = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const guidancePath = path.join(activeContextRoot, CADENCE_TRIGGER_GUIDANCE_FILE);
  const guidance = await loadJsonFileOrNull(guidancePath);
  if (!guidance) {
    throw new Error("No active cadence-trigger-guidance artifact is present.");
  }

  const recordedAt = nowIso();
  let executedAction = "noop";
  let skippedReason = null;
  let taskIds = [];
  let executionResult = null;
  const actionResults = [];
  let effectiveResolution = resolution;
  let effectiveNote = note;

  const resolveRetireReviewInputs = () => ({
    resolution: resolution ?? "keep-open",
    note: note ?? "Retain the task during runtime cadence follow-through"
  });

  if (guidance.trigger_state === "idle") {
    skippedReason = "Guidance is idle; no cadence follow-through action is required.";
  } else if (guidance.batching_mode === "batched-follow-through") {
    executedAction = "batched-follow-through";

    if (guidance.recommended_actions.includes("run alignment-pulse")) {
      actionResults.push({
        action: "run alignment-pulse",
        status: "skipped",
        reason: "Alignment pulse still requires explicit question and answer inputs."
      });
    }

    if (guidance.recommended_actions.includes("run self-audit-record")) {
      actionResults.push({
        action: "run self-audit-record",
        status: "skipped",
        reason: "Framework self-audit still requires explicit audit context inputs."
      });
    }

    if (guidance.recommended_actions.includes("run retire-candidate-review")) {
      const retireReviewTaskIds = guidance.retire_review_candidate_ids ?? [];
      const retireReviewInputs = resolveRetireReviewInputs();
      effectiveResolution = retireReviewInputs.resolution;
      effectiveNote = retireReviewInputs.note;
      taskIds = retireReviewTaskIds;
      executionResult = await recordRetireCandidateReview({
        projectRoot,
        resolution: retireReviewInputs.resolution,
        taskIds,
        note: retireReviewInputs.note,
        sourceSessionId,
        sourceDecisionRecordId,
        maxEntries
      });
      actionResults.push({
        action: "run retire-candidate-review",
        status: "executed",
        reason: resolution || note
          ? `Retire candidate review was executed for ${retireReviewTaskIds.length} task(s).`
          : `Retire candidate review was executed for ${retireReviewTaskIds.length} task(s) using the conservative keep-open default.`,
        task_ids: retireReviewTaskIds
      });
    }

    if (!actionResults.some((result) => result.status === "executed")) {
      skippedReason = "Batched cadence follow-through found no action with enough runtime inputs to execute.";
    }
  } else if (guidance.recommended_actions.includes("run retire-candidate-review")) {
    const retireReviewInputs = resolveRetireReviewInputs();
    effectiveResolution = retireReviewInputs.resolution;
    effectiveNote = retireReviewInputs.note;
    executedAction = "run retire-candidate-review";
    taskIds = guidance.retire_review_candidate_ids ?? [];
    executionResult = await recordRetireCandidateReview({
      projectRoot,
      resolution: retireReviewInputs.resolution,
      taskIds,
      note: retireReviewInputs.note,
      sourceSessionId,
      sourceDecisionRecordId,
      maxEntries
    });
    actionResults.push({
      action: "run retire-candidate-review",
      status: "executed",
      reason: resolution || note
        ? `Retire candidate review was executed for ${taskIds.length} task(s).`
        : `Retire candidate review was executed for ${taskIds.length} task(s) using the conservative keep-open default.`,
      task_ids: taskIds
    });
  } else {
    skippedReason = "Current single-action follow-through is only implemented for retire-candidate-review.";
  }

  const payload = {
    follow_through_type: "cadence-follow-through",
    recorded_at: recordedAt,
    guidance_trigger_state: guidance.trigger_state,
    guidance_batching_mode: guidance.batching_mode,
    executed_action: executedAction,
    resolution: effectiveResolution,
    task_ids: taskIds,
    note: effectiveNote,
    action_results: actionResults,
    skipped_reason: skippedReason,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-follow-through.schema.json", "cadence follow-through");
  const followThroughPath = path.join(activeContextRoot, CADENCE_FOLLOW_THROUGH_FILE);
  await writeJsonArtifact(followThroughPath, payload);

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question: "cadence follow-through で何を実行したか",
    answer: skippedReason ?? `${executedAction} was executed through cadence follow-through`,
    expectationState: skippedReason
      ? "cadence follow-through remained partially operator-mediated"
      : guidance.batching_mode === "batched-follow-through"
        ? "batched cadence follow-through can now execute supported runtime actions while preserving skipped follow-up work"
        : "single-action cadence follow-through can now execute through runtime",
    mismatchState: skippedReason,
    scaleDirection: skippedReason
      ? "keep refining bundled or autonomous follow-through"
      : guidance.batching_mode === "batched-follow-through"
        ? "continue by reducing skipped batched actions or automating their required inputs"
        : "focus next on autonomous timing and bundled execution",
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  const scheduleRefreshResult = await generateCadenceSchedule({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });

  return {
    ok: true,
    followThroughPath,
    payload,
    executionResult,
    confirmationResult,
    scheduleRefreshResult
  };
}

function hoursSince(timestamp, nowMs) {
  if (!timestamp) {
    return null;
  }
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return (nowMs - parsed) / (1000 * 60 * 60);
}

function roundHours(value) {
  return Math.round(value * 1000) / 1000;
}

function recommendedPollIntervalMinutes(staleAfterHours) {
  return Math.max(15, Math.min(60, Math.floor((staleAfterHours * 60) / 4)));
}

function formatCronEveryMinutes(minutes) {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = Math.max(1, Math.floor(minutes / 60));
    if (hours === 1) {
      return "0 * * * *";
    }
    return `0 */${hours} * * *`;
  }
  return `*/${minutes} * * * *`;
}

export async function evaluateCadenceTiming({
  projectRoot,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  staleAfterHours = 24
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const alignmentPulse = await loadJsonFileOrNull(path.join(activeContextRoot, ALIGNMENT_PULSE_FILE));
  const selfAudit = await loadJsonFileOrNull(path.join(activeContextRoot, FRAMEWORK_SELF_AUDIT_FILE));
  const cadenceTick = await loadJsonFileOrNull(path.join(activeContextRoot, CADENCE_TICK_FILE));
  const openTasks = await listTaskArtifacts({ projectRoot, status: "open" });

  const latestOpenTaskTriagedAt = openTasks.tasks
    .map((task) => task.payload.last_triaged_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const nowMs = Date.now();
  let timingState = "not-due";
  let reason = "Cadence surfaces are fresh enough; no self-start is required right now.";

  if (!alignmentPulse) {
    timingState = "due-now";
    reason = "No active alignment-pulse artifact is present.";
  } else if (!selfAudit) {
    timingState = "due-now";
    reason = "No active framework-self-audit artifact is present.";
  } else if (!cadenceTick) {
    timingState = "due-now";
    reason = "No cadence-tick artifact has been recorded yet.";
  } else if (openTasks.tasks.some((task) => !task.payload.last_triaged_at)) {
    timingState = "due-now";
    reason = "At least one open task has never been triaged by the cadence loop.";
  } else {
    const latestTaskAgeHours = hoursSince(latestOpenTaskTriagedAt, nowMs);
    const lastTickAgeHours = hoursSince(cadenceTick.recorded_at ?? null, nowMs);

    if (latestTaskAgeHours !== null && latestTaskAgeHours >= staleAfterHours) {
      timingState = "due-now";
      reason = `Open task triage freshness exceeded the ${staleAfterHours}-hour cadence threshold.`;
    } else if (lastTickAgeHours !== null && lastTickAgeHours >= staleAfterHours) {
      timingState = "due-now";
      reason = `Cadence tick freshness exceeded the ${staleAfterHours}-hour cadence threshold.`;
    }
  }

  const payload = {
    timing_type: "cadence-timing",
    recorded_at: nowIso(),
    timing_state: timingState,
    reason,
    stale_after_hours: staleAfterHours,
    last_alignment_pulse_at: alignmentPulse?.triggered_at ?? null,
    last_framework_self_audit_at: selfAudit?.recorded_at ?? null,
    last_cadence_tick_at: cadenceTick?.recorded_at ?? null,
    latest_open_task_triaged_at: latestOpenTaskTriagedAt,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-timing.schema.json", "cadence timing");
  const timingPath = path.join(activeContextRoot, CADENCE_TIMING_FILE);
  await writeJsonArtifact(timingPath, payload);

  return {
    ok: true,
    timingPath,
    payload
  };
}

export async function generateCadenceSchedule({
  projectRoot,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3,
  staleAfterHours = 24,
  recordConfirmation = true
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const timingResult = await evaluateCadenceTiming({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    staleAfterHours
  });

  const cadenceCycle = await loadJsonFileOrNull(path.join(activeContextRoot, CADENCE_CYCLE_FILE));
  const cadenceTick = await loadJsonFileOrNull(path.join(activeContextRoot, CADENCE_TICK_FILE));

  let schedulerState = "poll-later";
  let recommendedCommand = "No immediate cadence command is required.";
  let recommendedNextCheckAt = null;
  let recommendedNextCheckAfterHours = null;

  if (timingResult.payload.timing_state === "due-now") {
    schedulerState = "invoke-now";
    recommendedCommand = `node ./src/cli.js cadence-cycle --project . --stale-after-hours ${staleAfterHours}`;
    recommendedNextCheckAt = nowIso();
    recommendedNextCheckAfterHours = 0;
  } else {
    const nowMs = Date.now();
    const dueCandidates = [
      timingResult.payload.last_cadence_tick_at,
      timingResult.payload.latest_open_task_triaged_at
    ]
      .filter(Boolean)
      .map((timestamp) => Date.parse(timestamp) + (staleAfterHours * 60 * 60 * 1000))
      .filter((value) => !Number.isNaN(value));

    if (dueCandidates.length > 0) {
      const nextCheckMs = Math.min(...dueCandidates);
      recommendedNextCheckAt = new Date(nextCheckMs).toISOString();
      recommendedNextCheckAfterHours = roundHours(Math.max(0, (nextCheckMs - nowMs) / (1000 * 60 * 60)));
    }
  }

  const payload = {
    schedule_type: "cadence-schedule",
    recorded_at: nowIso(),
    timing_state: timingResult.payload.timing_state,
    scheduler_state: schedulerState,
    reason: timingResult.payload.reason,
    external_scheduler_required: true,
    recommended_command: recommendedCommand,
    recommended_next_check_at: recommendedNextCheckAt,
    recommended_next_check_after_hours: recommendedNextCheckAfterHours,
    current_cycle_state: cadenceCycle?.cycle_state ?? null,
    current_tick_state: cadenceTick?.tick_state ?? null,
    stale_after_hours: staleAfterHours,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-schedule.schema.json", "cadence schedule");
  const schedulePath = path.join(activeContextRoot, CADENCE_SCHEDULE_FILE);
  await writeJsonArtifact(schedulePath, payload);

  const confirmationResult = recordConfirmation
    ? await recordRecentConfirmation({
        projectRoot,
        question: "external cadence scheduler は次に何をすべきか",
        answer: schedulerState === "invoke-now"
          ? "Run cadence-cycle now."
          : `Poll cadence again around ${recommendedNextCheckAt ?? "the next cadence check window"}.`,
        expectationState: schedulerState === "invoke-now"
          ? "cadence scheduling is now machine-readable for an external scheduler"
          : "cadence scheduling can now defer external polling until the next due window",
        mismatchState: null,
        scaleDirection: schedulerState === "invoke-now"
          ? "connect this schedule surface to a real external scheduler"
          : "keep the external scheduler aligned with the recommended next check window",
        sourceSessionId,
        sourceDecisionRecordId,
        maxEntries
      })
    : null;

  return {
    ok: true,
    schedulePath,
    payload,
    timingResult,
    confirmationResult
  };
}

export async function generateCadenceSchedulerBinding({
  projectRoot,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3,
  staleAfterHours = 24,
  recordConfirmation = true
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const scheduleResult = await generateCadenceSchedule({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    staleAfterHours,
    recordConfirmation: false
  });

  const pollIntervalMinutes = recommendedPollIntervalMinutes(staleAfterHours);
  const dispatchCommand = `node ./src/cli.js cadence-dispatch --project . --stale-after-hours ${staleAfterHours}`;
  const cronExpression = formatCronEveryMinutes(pollIntervalMinutes);

  const payload = {
    binding_type: "cadence-scheduler-binding",
    recorded_at: nowIso(),
    scheduler_state: scheduleResult.payload.scheduler_state,
    reason: scheduleResult.payload.reason,
    recommended_poll_interval_minutes: pollIntervalMinutes,
    dispatch_command: dispatchCommand,
    profiles: {
      cron: {
        schedule_expression: cronExpression,
        command: dispatchCommand,
        reason: "Use a recurring cron trigger to poll cadence-dispatch conservatively before the stale threshold."
      },
      github_actions: {
        cron_expression: cronExpression,
        command: dispatchCommand,
        reason: "Use a scheduled GitHub Actions workflow when the repository already relies on Actions for operational cadence."
      },
      agent_loop: {
        interval_minutes: pollIntervalMinutes,
        command: dispatchCommand,
        reason: "Use an always-on agent loop when cadence should stay close to the Orchestrator runtime."
      }
    },
    recommended_next_check_at: scheduleResult.payload.recommended_next_check_at ?? null,
    recommended_next_check_after_hours: scheduleResult.payload.recommended_next_check_after_hours ?? null,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-scheduler-binding.schema.json", "cadence scheduler binding");
  const bindingPath = path.join(activeContextRoot, CADENCE_SCHEDULER_BINDING_FILE);
  await writeJsonArtifact(bindingPath, payload);

  const confirmationResult = recordConfirmation
    ? await recordRecentConfirmation({
        projectRoot,
        question: "external scheduler は cadence-dispatch をどう起動すべきか",
        answer: `Use cadence-dispatch on a ${pollIntervalMinutes}-minute cadence, or invoke immediately when scheduler_state is invoke-now.`,
        expectationState: "scheduler binding is now explicit for cron, GitHub Actions, and agent-loop profiles",
        mismatchState: null,
        scaleDirection: "choose one scheduler profile and bind it to cadence-dispatch in real operation",
        sourceSessionId,
        sourceDecisionRecordId,
        maxEntries
      })
    : null;

  return {
    ok: true,
    bindingPath,
    payload,
    scheduleResult,
    confirmationResult
  };
}

export async function runCadenceTick({
  projectRoot,
  resolution = null,
  note = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3,
  staleAfterHours = 24
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const timingResult = await evaluateCadenceTiming({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    staleAfterHours
  });

  const guidanceResult = await generateCadenceTriggerGuidance({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    recordConfirmation: false
  });
  const guidance = guidanceResult.payload;

  let tickState = "idle";
  let followThroughResult = null;
  let reason = "No cadence trigger requires follow-through right now.";

  if (timingResult.payload.timing_state === "not-due") {
    tickState = "idle";
    reason = timingResult.payload.reason;
  } else if (guidance.trigger_state !== "idle") {
    followThroughResult = await executeCadenceFollowThrough({
      projectRoot,
      resolution,
      note,
      sourceSessionId,
      sourceDecisionRecordId,
      maxEntries
    });

    const didExecute =
      followThroughResult.payload.executed_action !== "noop" &&
      (
        !Array.isArray(followThroughResult.payload.action_results) ||
        followThroughResult.payload.action_results.some((entry) => entry.status === "executed")
      );

    if (didExecute) {
      tickState = "follow-through-executed";
      reason = `Cadence tick executed ${followThroughResult.payload.executed_action}.`;
    } else {
      tickState = "follow-through-pending-input";
      reason = followThroughResult.payload.skipped_reason ?? "Cadence follow-through still needs explicit operator input.";
    }
  } else {
    tickState = "due-no-follow-through";
    reason = `${timingResult.payload.reason} Current cadence guidance does not require follow-through beyond normal monitoring.`;
  }

  const recordedAt = nowIso();
  const payload = {
    tick_type: "cadence-tick",
    recorded_at: recordedAt,
    timing_state: timingResult.payload.timing_state,
    guidance_trigger_state: guidance.trigger_state,
    guidance_batching_mode: guidance.batching_mode,
    tick_state: tickState,
    reason,
    follow_through_executed_action: followThroughResult?.payload.executed_action ?? null,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-tick.schema.json", "cadence tick");
  const tickPath = path.join(activeContextRoot, CADENCE_TICK_FILE);
  await writeJsonArtifact(tickPath, payload);

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question: "cadence tick は何を判断したか",
    answer: reason,
    expectationState: tickState === "follow-through-executed"
      ? "cadence tick can now decide and start follow-through within one runtime step"
      : "cadence tick can now evaluate cadence state even when follow-through still needs more explicit input",
    mismatchState: tickState === "follow-through-pending-input" ? reason : null,
    scaleDirection: tickState === "follow-through-executed"
      ? "reduce remaining operator input needs or deepen autonomous scheduling"
      : "reduce remaining operator input needs for cadence follow-through",
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  const scheduleRefreshResult = await generateCadenceSchedule({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    staleAfterHours,
    recordConfirmation: false
  });

  return {
    ok: true,
    tickPath,
    payload,
    timingResult,
    guidanceResult,
    followThroughResult,
    confirmationResult,
    scheduleRefreshResult
  };
}

export async function runCadenceCycle({
  projectRoot,
  resolution = null,
  note = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3,
  staleAfterHours = 24
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const timingResult = await evaluateCadenceTiming({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    staleAfterHours
  });

  let cycleState = "deferred-not-due";
  let reason = timingResult.payload.reason;
  let tickResult = null;

  if (timingResult.payload.timing_state === "due-now") {
    tickResult = await runCadenceTick({
      projectRoot,
      resolution,
      note,
      sourceSessionId,
      sourceDecisionRecordId,
      maxEntries,
      staleAfterHours
    });
    cycleState = "tick-executed";
    reason = tickResult.payload.reason;
  }

  const recordedAt = nowIso();
  const payload = {
    cycle_type: "cadence-cycle",
    recorded_at: recordedAt,
    timing_state: timingResult.payload.timing_state,
    cycle_state: cycleState,
    reason,
    tick_state: tickResult?.payload.tick_state ?? null,
    follow_through_executed_action: tickResult?.payload.follow_through_executed_action ?? null,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-cycle.schema.json", "cadence cycle");
  const cyclePath = path.join(activeContextRoot, CADENCE_CYCLE_FILE);
  await writeJsonArtifact(cyclePath, payload);

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question: "cadence cycle は何を実行したか",
    answer: reason,
    expectationState: cycleState === "tick-executed"
      ? "cadence cycle can now self-start cadence processing when timing says due-now"
      : "cadence cycle can now defer cadence work when the runtime says it is not due",
    mismatchState: tickResult?.payload.tick_state === "follow-through-pending-input" ? tickResult.payload.reason : null,
    scaleDirection: cycleState === "tick-executed"
      ? "reduce remaining self-start ambiguity or remaining semantic input dependencies"
      : "keep checking timing until cadence becomes due-now",
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  const scheduleRefreshResult = await generateCadenceSchedule({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    staleAfterHours,
    recordConfirmation: false
  });

  return {
    ok: true,
    cyclePath,
    payload,
    timingResult,
    tickResult,
    confirmationResult,
    scheduleRefreshResult
  };
}

export async function runCadenceDispatch({
  projectRoot,
  resolution = null,
  note = null,
  sourceSessionId = null,
  sourceDecisionRecordId = null,
  maxEntries = 3,
  staleAfterHours = 24
}) {
  const aofRoot = resolveAofRoot(projectRoot);
  const activeContextRoot = path.join(aofRoot, "context", "active");
  await ensureDir(activeContextRoot);

  const scheduleResult = await generateCadenceSchedule({
    projectRoot,
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries,
    staleAfterHours,
    recordConfirmation: false
  });

  let dispatchState = "deferred-poll-later";
  let reason = scheduleResult.payload.reason;
  let cycleResult = null;

  if (scheduleResult.payload.scheduler_state === "invoke-now") {
    cycleResult = await runCadenceCycle({
      projectRoot,
      resolution,
      note,
      sourceSessionId,
      sourceDecisionRecordId,
      maxEntries,
      staleAfterHours
    });
    dispatchState = "cycle-invoked";
    reason = cycleResult.payload.reason;
  }

  const payload = {
    dispatch_type: "cadence-dispatch",
    recorded_at: nowIso(),
    scheduler_state: scheduleResult.payload.scheduler_state,
    dispatch_state: dispatchState,
    reason,
    cycle_state: cycleResult?.payload.cycle_state ?? null,
    tick_state: cycleResult?.payload.tick_state ?? null,
    follow_through_executed_action: cycleResult?.payload.follow_through_executed_action ?? null,
    recommended_next_check_at: scheduleResult.payload.recommended_next_check_at ?? null,
    recommended_next_check_after_hours: scheduleResult.payload.recommended_next_check_after_hours ?? null,
    source_session_id: sourceSessionId,
    source_decision_record_id: sourceDecisionRecordId
  };

  await validateWithBundledSchema(payload, "aof-cadence-dispatch.schema.json", "cadence dispatch");
  const dispatchPath = path.join(activeContextRoot, CADENCE_DISPATCH_FILE);
  await writeJsonArtifact(dispatchPath, payload);

  const confirmationResult = await recordRecentConfirmation({
    projectRoot,
    question: "external cadence dispatch は何を実行したか",
    answer: dispatchState === "cycle-invoked"
      ? "Cadence dispatch invoked cadence-cycle immediately."
      : `Cadence dispatch deferred execution and will poll again around ${scheduleResult.payload.recommended_next_check_at ?? "the next cadence window"}.`,
    expectationState: dispatchState === "cycle-invoked"
      ? "external cadence scheduling can now hand off directly into cadence-cycle"
      : "external cadence scheduling can now defer safely using the runtime schedule artifact",
    mismatchState: cycleResult?.payload.tick_state === "follow-through-pending-input"
      ? cycleResult.payload.reason
      : null,
    scaleDirection: dispatchState === "cycle-invoked"
      ? "keep reducing any remaining semantic input dependencies inside cadence follow-through"
      : "connect this dispatch surface to a concrete external scheduler",
    sourceSessionId,
    sourceDecisionRecordId,
    maxEntries
  });

  return {
    ok: true,
    dispatchPath,
    payload,
    scheduleResult,
    cycleResult,
    confirmationResult
  };
}
