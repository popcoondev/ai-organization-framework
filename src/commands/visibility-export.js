import fs from "node:fs/promises";
import path from "node:path";

import { organizationStatusCommand } from "./organization-status.js";
import { organizationAnalyticsSnapshotCommand } from "./organization-analytics-snapshot.js";
import { learningLoopSnapshotCommand } from "./learning-loop-snapshot.js";
import { metricsSnapshotCommand } from "./metrics-snapshot.js";
import { buildOperatorBriefView } from "./operator-brief.js";
import { buildOperatorProgressView } from "./operator-progress.js";
import { buildTreePositionView } from "./tree-position.js";
import { buildEvidenceDrillDownView } from "./evidence-drill-down.js";
import { roadmapStatusCommand } from "./roadmap-status.js";
import { extractTrackFromText, loadSituationAssessmentSummary, normalizeTrackLabel } from "./situation-assess.js";
import { loadLatestSkillfulActorHriProjection } from "./skillful-actor-hri-projection.js";
import { resolveAofRoot } from "../runtime/project-paths.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { writeJsonArtifact } from "../runtime/utils.js";

async function readJson(filePath, label) {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function listJsonFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(dirPath, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function listLatestDoneTasks(aofRoot, limit = 3) {
  const taskPaths = await listJsonFiles(path.join(aofRoot, "tasks", "done"));
  const tasks = await Promise.all(taskPaths.map((taskPath) => readJson(taskPath, `task ${path.basename(taskPath)}`)));
  return tasks
    .sort((left, right) => String(right.updated_at ?? "").localeCompare(String(left.updated_at ?? "")))
    .slice(0, limit);
}

async function listOpenTasks(aofRoot) {
  const taskPaths = await listJsonFiles(path.join(aofRoot, "tasks", "open"));
  const tasks = await Promise.all(taskPaths.map((taskPath) => readJson(taskPath, `task ${path.basename(taskPath)}`)));
  return tasks.sort((left, right) => String(right.updated_at ?? "").localeCompare(String(left.updated_at ?? "")));
}

async function maybeReadJsonByRef(projectRoot, ref, label) {
  if (!ref) {
    return null;
  }
  const targetPath = path.resolve(projectRoot, ref);
  try {
    return await readJson(targetPath, label);
  } catch {
    return null;
  }
}

async function loadDiscoveryContext(projectRoot, discoveryHandoffRef, discoveryHandoffPayload = null) {
  const discoveryHandoff = discoveryHandoffPayload ?? await maybeReadJsonByRef(projectRoot, discoveryHandoffRef, "discovery handoff");
  const discoveryRefs = {
    discovery_handoff: discoveryHandoffRef ?? null,
    discovery_judgment: null,
    discovery_question_set: null,
    assumption_map: null,
    anomaly_log: null
  };
  let discoveryJudgment = null;

  if (discoveryHandoff?.evidence_refs?.length) {
    const judgmentRef = discoveryHandoff.evidence_refs.find((entry) => /\/judgments\/|DJP-/.test(String(entry)));
    if (judgmentRef) {
      discoveryRefs.discovery_judgment = judgmentRef;
      discoveryJudgment = await maybeReadJsonByRef(projectRoot, judgmentRef, "discovery judgment");
    }
  }

  let questionSet = null;
  let assumptionMap = null;
  let anomalyLog = null;
  if (discoveryJudgment) {
    discoveryRefs.discovery_question_set = discoveryJudgment.question_set_refs?.[0] ?? null;
    discoveryRefs.assumption_map = discoveryJudgment.artifact_refs?.find((entry) => /\/assumption-maps\/|ASM-/.test(String(entry))) ?? null;
    discoveryRefs.anomaly_log = discoveryJudgment.artifact_refs?.find((entry) => /\/anomaly-logs\/|ANL-/.test(String(entry))) ?? null;
    [questionSet, assumptionMap, anomalyLog] = await Promise.all([
      maybeReadJsonByRef(projectRoot, discoveryRefs.discovery_question_set, "discovery question set"),
      maybeReadJsonByRef(projectRoot, discoveryRefs.assumption_map, "assumption map"),
      maybeReadJsonByRef(projectRoot, discoveryRefs.anomaly_log, "anomaly log")
    ]);
  }

  return {
    refs: discoveryRefs,
    discoveryHandoff,
    discoveryJudgment,
    questionSet,
    assumptionMap,
    anomalyLog
  };
}

async function loadLatestNeedValidationChain(projectRoot, aofRoot) {
  const recordPaths = await listJsonFiles(path.join(aofRoot, "artifacts", "need-validation", "records"));
  if (recordPaths.length === 0) {
    const handoffPaths = await listJsonFiles(path.join(aofRoot, "artifacts", "discovery", "handoffs"));
    if (handoffPaths.length === 0) {
      return null;
    }
    const handoffs = await Promise.all(
      handoffPaths.map(async (handoffPath) => ({
        path: handoffPath,
        payload: await readJson(handoffPath, `discovery handoff ${path.basename(handoffPath)}`)
      }))
    );
    const latestHandoff = handoffs.sort((left, right) => String(right.payload.recorded_at ?? "").localeCompare(String(left.payload.recorded_at ?? "")))[0];
    const discoveryContext = await loadDiscoveryContext(
      projectRoot,
      path.relative(projectRoot, latestHandoff.path),
      latestHandoff.payload
    );
    return {
      refs: {
        need_validation: null,
        problem_statement: null,
        value_hypothesis: null,
        alternative_analysis: null,
        project_charter: null,
        ...discoveryContext.refs
      },
      needValidation: null,
      problemStatement: null,
      valueHypothesis: null,
      alternativeAnalysis: null,
      projectCharter: null,
      ...discoveryContext
    };
  }

  const records = await Promise.all(
    recordPaths.map(async (recordPath) => ({
      path: recordPath,
      payload: await readJson(recordPath, `need validation record ${path.basename(recordPath)}`)
    }))
  );
  const latest = records.sort((left, right) => String(right.payload.recorded_at ?? "").localeCompare(String(left.payload.recorded_at ?? "")))[0];
  const needValidation = latest.payload;
  const refs = {
    need_validation: path.relative(projectRoot, latest.path),
    problem_statement: needValidation.problem_statement_ref,
    value_hypothesis: needValidation.value_hypothesis_ref,
    alternative_analysis: needValidation.alternative_analysis_ref,
    project_charter: needValidation.project_charter_ref,
    discovery_handoff: needValidation.discovery_handoff_ref
  };

  const [problemStatement, valueHypothesis, alternativeAnalysis, projectCharter, discoveryHandoff] = await Promise.all([
    maybeReadJsonByRef(projectRoot, refs.problem_statement, "problem statement"),
    maybeReadJsonByRef(projectRoot, refs.value_hypothesis, "value hypothesis"),
    maybeReadJsonByRef(projectRoot, refs.alternative_analysis, "alternative analysis"),
    maybeReadJsonByRef(projectRoot, refs.project_charter, "project charter"),
    maybeReadJsonByRef(projectRoot, refs.discovery_handoff, "discovery handoff")
  ]);
  const discoveryContext = await loadDiscoveryContext(projectRoot, refs.discovery_handoff, discoveryHandoff);

  return {
    refs: {
      ...refs,
      ...discoveryContext.refs
    },
    needValidation,
    problemStatement,
    valueHypothesis,
    alternativeAnalysis,
    projectCharter,
    ...discoveryContext
  };
}

function pickCurrentVisibilityTask(situation, roadmapStatus) {
  if (situation?.primary_frontier_task) {
    return situation.primary_frontier_task;
  }

  const orderedTracks = Object.keys(roadmapStatus.release_tracks ?? {}).sort((left, right) => right.localeCompare(left));
  for (const track of orderedTracks) {
    const tasks = Array.isArray(roadmapStatus.release_tracks?.[track]) ? roadmapStatus.release_tracks[track] : [];
    const liveTask = tasks.find((task) => task.status === "open" || task.status === "assigned");
    if (liveTask) {
      return liveTask;
    }
  }
  return null;
}

function buildStatusCard({
  currentTask,
  nextValueSlice,
  metricsArtifactRef,
  analytics
}) {
  return {
    view_type: "status_card",
    as_of: analytics.generated_at,
    usage_level: "runtime-backed",
    current_phase: currentTask?.title ?? "organization_operating",
    current_goal: nextValueSlice ?? "No next value slice is currently projected.",
    owner: "AOF Runtime",
    open_signals: analytics.observations.filter((entry) => entry !== "No immediate organization bottleneck was detected from the current local artifact set."),
    next_checkpoint: currentTask?.title ?? nextValueSlice ?? "Review the next open organization task.",
    latest_artifact_ref: metricsArtifactRef,
    runtime_evidence_state: "present"
  };
}

function buildRuntimeExecutionView({
  generatedAt,
  executionLogRef,
  commandRuns,
  refreshedArtifactRefs
}) {
  const commands = Array.isArray(commandRuns) ? commandRuns : [];
  const artifacts = Array.isArray(refreshedArtifactRefs) ? refreshedArtifactRefs.filter(Boolean) : [];
  const incompleteReasons = [];

  if (commands.length < 1) {
    incompleteReasons.push("No runtime command execution was recorded for the current answer surface.");
  }
  if (!executionLogRef) {
    incompleteReasons.push("No execution log ref was recorded for the current answer surface.");
  }
  if (artifacts.length < 1) {
    incompleteReasons.push("No refreshed artifact refs were recorded for the current answer surface.");
  }

  return {
    view_type: "runtime_execution",
    generated_at: generatedAt,
    runtime_backing_required: {
      required_for: ["direction", "review", "self-review", "retrospective"],
      minimum_runtime_commands: 1,
      require_execution_log_ref: true,
      require_refreshed_artifact_ref: true,
      rule_summary: "Direction, review, self-review, and retrospective claims are incomplete unless at least one runtime command executed and both execution-log and refreshed-artifact refs are present."
    },
    last_execution: {
      status: incompleteReasons.length === 0 ? "pass" : "incomplete",
      executed_at: generatedAt,
      primary_command: commands[0]?.command ?? null,
      command_runs: commands,
      refreshed_artifact_refs: artifacts,
      execution_log_ref: executionLogRef,
      incomplete_reasons: incompleteReasons
    }
  };
}

function buildTimelineEntries({
  nextValueSlice,
  nextValueUpdatedAt,
  metrics,
  analytics,
  doneTasks
}) {
  const entries = [];

  if (nextValueSlice && nextValueUpdatedAt) {
    entries.push({
      at: nextValueUpdatedAt,
      actor: "AOF Runtime",
      event_type: "next_value_slice_updated",
      summary: nextValueSlice,
      rationale: "Project memory was updated to reflect the current operating focus.",
      next: "Project the current slice into operator visibility outputs.",
      refs: [".aof/goals/next-value-slice.json"]
    });
  }

  entries.push({
    at: metrics.generated_at,
    actor: "Verification Team",
    event_type: "metrics_snapshot",
    summary: `Allocation review load is ${metrics.observed_metrics.find((entry) => entry.metric_key === "allocation-review-load")?.value ?? 0}.`,
    rationale: "The current runtime metrics summarize review pressure and task inventory from live artifacts.",
    next: "Use the visibility packet to inspect operator-facing runtime health.",
    refs: [".aof/context/active/metrics-snapshot.json"]
  });

  entries.push({
    at: analytics.generated_at,
    actor: "Operations Council",
    event_type: "organization_analytics",
    summary: analytics.observations[0] ?? "No immediate organization bottleneck was detected.",
    rationale: "Organization analytics compress current task, dependency, contract, and escalation health.",
    next: "Review the highest-leverage open release task.",
    refs: [".aof/context/active/organization-analytics.json"]
  });

  for (const task of doneTasks) {
    entries.push({
      at: task.updated_at ?? task.done_at ?? task.created_at ?? metrics.generated_at,
      actor: "AOF Runtime",
      event_type: "task_completed",
      summary: task.title,
      rationale: "Completed tasks show the latest closed release work in the runtime task archive.",
      next: "Continue with the next open bridge-release task.",
      refs: [`.aof/tasks/done/${task.task_id}.json`]
    });
  }

  return entries
    .sort((left, right) => String(right.at).localeCompare(String(left.at)))
    .slice(0, 6);
}

function buildFlowSnapshot(hasFrontierTask) {
  const nodes = [
    { id: "operator_surfaces", label: "operator_surfaces", state: "done" },
    { id: "execution_contracts", label: "execution_contracts", state: "done" },
    { id: "governed_allocation", label: "governed_allocation", state: "done" },
    { id: "visibility_projection", label: "visibility_projection", state: "done" },
    { id: "runtime_loop_proof", label: "runtime_loop_proof", state: hasFrontierTask ? "done" : "current" },
    { id: "operator_progress", label: "operator_progress", state: hasFrontierTask ? "done" : "pending" },
    { id: "evidence_drill_down", label: "evidence_drill_down", state: hasFrontierTask ? "current" : "pending" }
  ];

  const edges = [
    { from: "operator_surfaces", to: "execution_contracts", reason: "operator model became execution-aware" },
    { from: "execution_contracts", to: "governed_allocation", reason: "execution artifacts enabled governed assignment planning" },
    { from: "governed_allocation", to: "visibility_projection", reason: "allocation state should become operator-visible automatically" },
    { from: "visibility_projection", to: "runtime_loop_proof", reason: "runtime proof should consume the same inspectable visibility layer" },
    { from: "runtime_loop_proof", to: "operator_progress", reason: "truthful runtime judgment should explain visible progress over time" },
    { from: "operator_progress", to: "evidence_drill_down", reason: "operator answers should drill down into the proof path" }
  ];

  return {
    view_type: "flow_snapshot",
    nodes,
    edges,
    current_node: hasFrontierTask ? "evidence_drill_down" : "runtime_loop_proof",
    ordered_nodes: nodes
  };
}

function deriveChainStage(chain) {
  if (chain?.projectCharter) {
    return "planning-ready";
  }
  if (chain?.needValidation) {
    return "need-validated";
  }
  if (chain?.discoveryHandoff) {
    return "discovery-handoff";
  }
  return "visibility-baseline";
}

function buildArtifactGraph(chain) {
  if (!chain) {
    return {
      nodes: [],
      edges: [],
      current_node_id: null
    };
  }

  const nodes = [];
  const edges = [];
  const pushNode = (id, label, kind, state, artifactRef) => {
    if (!artifactRef) {
      return;
    }
    nodes.push({ id, label, kind, state, artifact_ref: artifactRef });
  };
  const pushEdge = (from, to, relation, condition = true) => {
    if (condition) {
      edges.push({ from, to, relation });
    }
  };

  pushNode("discovery-question-set", "Discovery Question Set", "discovery", chain.questionSet ? "done" : "pending", chain.refs.discovery_question_set);
  pushNode("assumption-map", "Assumption Map", "discovery", chain.assumptionMap ? "done" : "pending", chain.refs.assumption_map);
  pushNode("anomaly-log", "Anomaly Log", "discovery", chain.anomalyLog ? "done" : "pending", chain.refs.anomaly_log);
  pushNode("discovery-judgment", "Discovery Judgment", "discovery", chain.discoveryJudgment ? "done" : "pending", chain.refs.discovery_judgment);
  pushNode("discovery-handoff", "Discovery Handoff", "discovery", chain.discoveryHandoff ? "done" : "pending", chain.refs.discovery_handoff);
  pushNode("problem-statement", "Problem Statement", "need-validation", chain.problemStatement ? "done" : "pending", chain.refs.problem_statement);
  pushNode("value-hypothesis", "Value Hypothesis", "need-validation", chain.valueHypothesis ? "done" : "pending", chain.refs.value_hypothesis);
  pushNode("alternative-analysis", "Alternative Analysis", "need-validation", chain.alternativeAnalysis ? "done" : "pending", chain.refs.alternative_analysis);
  pushNode("need-validation", "Need Validation Record", "need-validation", chain.needValidation ? "done" : "pending", chain.refs.need_validation);
  pushNode("project-charter", "Project Charter", "planning", chain.projectCharter ? "current" : "pending", chain.refs.project_charter);

  pushEdge("discovery-question-set", "discovery-judgment", "questions shape judgment", Boolean(chain.refs.discovery_question_set && chain.refs.discovery_judgment));
  pushEdge("assumption-map", "discovery-judgment", "assumptions inform judgment", Boolean(chain.refs.assumption_map && chain.refs.discovery_judgment));
  pushEdge("anomaly-log", "discovery-judgment", "anomalies inform judgment", Boolean(chain.refs.anomaly_log && chain.refs.discovery_judgment));
  pushEdge("discovery-judgment", "discovery-handoff", "judgment promotes handoff", Boolean(chain.refs.discovery_judgment && chain.refs.discovery_handoff));
  pushEdge("discovery-handoff", "need-validation", "handoff strengthens validation", Boolean(chain.refs.discovery_handoff));
  pushEdge("problem-statement", "need-validation", "problem definition supports validation", Boolean(chain.refs.problem_statement));
  pushEdge("value-hypothesis", "need-validation", "value hypothesis supports validation", Boolean(chain.refs.value_hypothesis));
  pushEdge("alternative-analysis", "need-validation", "alternatives constrain validation", Boolean(chain.refs.alternative_analysis));
  pushEdge("need-validation", "project-charter", "validated need authorizes planning", Boolean(chain.refs.project_charter));

  const currentNodeId = chain.projectCharter
    ? "project-charter"
    : chain.needValidation
      ? "need-validation"
      : chain.discoveryHandoff
        ? "discovery-handoff"
        : chain.discoveryJudgment
          ? "discovery-judgment"
          : null;

  return {
    nodes,
    edges,
    current_node_id: currentNodeId
  };
}

function summarizeSkillfulActorProjection(projection) {
  if (!projection) {
    return null;
  }
  return {
    projection_ref: projection.artifactRef,
    projection_id: projection.payload.projection_id,
    actor: projection.payload.actor,
    visible_state: projection.payload.visible_state,
    proof_chain: projection.payload.self_hosting_proof_chain.map((entry) => ({
      step: entry.step,
      artifact_ref: entry.artifact_ref,
      state: entry.state
    }))
  };
}

function buildMissionControl({
  organizationStatus,
  roadmapStatus,
  analytics,
  chain,
  situation,
  skillfulActorProjection = null
}) {
  const graph = buildArtifactGraph(chain);
  const skillfulActorSummary = summarizeSkillfulActorProjection(skillfulActorProjection);
  const activeTrack = normalizeTrackLabel(organizationStatus.active_release?.release_version ?? "");
  const goalTrack = extractTrackFromText(organizationStatus.goals.next_value_slice ?? organizationStatus.goals.operating_goal ?? "");
  const includeChainGaps = !goalTrack || !activeTrack || goalTrack === activeTrack;
  const useChainStageFallback = situation.current_runtime_stage === "frontier-definition-needed"
    && !situation.primary_frontier_task
    && (situation.current_truth_conflicts?.length ?? 0) === 0
    && includeChainGaps;
  const currentStage = useChainStageFallback ? deriveChainStage(chain) : situation.current_runtime_stage;
  const blockers = [];

  if (includeChainGaps) {
    for (const gap of chain?.needValidation?.evidence_gaps ?? []) {
      blockers.push({
        summary: gap,
        severity: "attention",
        artifact_ref: chain?.refs?.need_validation ?? null
      });
    }
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

  for (const conflict of situation.current_truth_conflicts ?? []) {
    blockers.push({
      summary: conflict.summary,
      severity: conflict.severity,
      artifact_ref: conflict.artifact_ref
    });
  }

  const nextAction = useChainStageFallback
    ? {
        recommended_action: chain?.projectCharter
          ? "Open an implementation task for the bounded Mission Control visibility slice."
          : chain?.discoveryHandoff
            ? "Run Need Validation on the current discovery handoff."
            : "Complete the current visibility direction-setting chain before implementation.",
        rationale: chain?.projectCharter
          ? "Need Validation and project charter are already present, so the next move is execution planning."
          : chain?.discoveryHandoff
            ? "Discovery is complete enough to promote into Need Validation, but project authorization is not yet recorded."
            : "The runtime chain is not yet complete enough to justify implementation claims.",
        artifact_ref: chain?.refs?.project_charter ?? chain?.refs?.need_validation ?? chain?.refs?.discovery_handoff ?? null
      }
    : situation.recommended_action;

  return {
    view_type: "mission_control",
    generated_at: analytics.generated_at,
    mission_overview: {
      mission: organizationStatus.mission,
      release_version: organizationStatus.active_release?.release_version ?? null,
      release_definition_ref: roadmapStatus.roadmap_refs?.current_release_definition ?? null,
      operating_goal: organizationStatus.goals.operating_goal,
      next_value_slice: organizationStatus.goals.next_value_slice,
      current_runtime_stage: currentStage,
      chain_anchor_ref: chain?.refs.need_validation ?? null
    },
    artifact_graph: graph,
    runtime_position: {
      current_phase: currentStage,
      current_step_label: graph.current_node_id
        ? graph.nodes.find((node) => node.id === graph.current_node_id)?.label ?? null
        : null,
      current_step_state: graph.current_node_id
        ? graph.nodes.find((node) => node.id === graph.current_node_id)?.state ?? null
        : null
    },
    blockers,
    next_action: nextAction,
    skillful_actor_projection: skillfulActorSummary
  };
}

export async function visibilityExportCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const artifactDir = path.resolve(options.artifactDir || path.join(aofRoot, "artifacts", "visibility", "current"));

  const [organizationStatus, roadmapStatus, metricsResult, analyticsResult, learningLoopResult, doneTasks, latestChain, situation, skillfulActorProjection] = await Promise.all([
    organizationStatusCommand({ project: projectRoot }),
    roadmapStatusCommand({ project: projectRoot }),
    metricsSnapshotCommand({ project: projectRoot }),
    organizationAnalyticsSnapshotCommand({ project: projectRoot }),
    learningLoopSnapshotCommand({ project: projectRoot }),
    listLatestDoneTasks(aofRoot),
    loadLatestNeedValidationChain(projectRoot, aofRoot),
    loadSituationAssessmentSummary(projectRoot),
    loadLatestSkillfulActorHriProjection(projectRoot)
  ]);

  const currentTask = pickCurrentVisibilityTask(situation, roadmapStatus);
  const nextValueSlice = organizationStatus.goals.next_value_slice;
  const nextValueUpdatedAt = learningLoopResult.payload.current_next_value_slice?.updated_at ?? metricsResult.payload.generated_at;
  const metricsArtifactRef = path.relative(projectRoot, metricsResult.artifactPath);

  const statusCard = buildStatusCard({
    currentTask,
    nextValueSlice,
    metricsArtifactRef,
    analytics: analyticsResult.payload
  });
  const timelineFeed = {
    view_type: "timeline_feed",
    entries: buildTimelineEntries({
      nextValueSlice,
      nextValueUpdatedAt,
      metrics: metricsResult.payload,
      analytics: analyticsResult.payload,
      doneTasks
    })
  };
  const flowSnapshot = buildFlowSnapshot(Boolean(currentTask));
  const missionControl = buildMissionControl({
    organizationStatus,
    roadmapStatus,
    analytics: analyticsResult.payload,
    chain: latestChain,
    situation,
    skillfulActorProjection
  });
  const operatorBrief = buildOperatorBriefView({
    organizationStatus,
    roadmapStatus,
    analytics: analyticsResult.payload,
    situation,
    skillfulActorProjection
  });
  const operatorProgress = buildOperatorProgressView({
    organizationStatus,
    situation,
    latestDoneTask: doneTasks[0] ? {
      payload: doneTasks[0],
      taskPath: path.join(aofRoot, "tasks", "done", `${doneTasks[0].task_id}.json`)
    } : null
  });
  const treePosition = buildTreePositionView({
    organizationStatus,
    roadmapStatus,
    situation
  });
  const evidenceDrillDown = buildEvidenceDrillDownView({
    organizationStatus,
    roadmapStatus,
    analytics: analyticsResult.payload,
    situation,
    brief: operatorBrief
  });

  const runtimeExecutionPathRef = path.join(artifactDir, "runtime-execution.json");
  const commandRuns = [
    { command: "visibility-export", artifact_ref: path.relative(projectRoot, runtimeExecutionPathRef) },
    { command: "organization-status", artifact_ref: ".aof/context/active/active-release-manifest.json" },
    { command: "roadmap-status", artifact_ref: roadmapStatus.roadmap_refs?.current_release_definition ?? null },
    { command: "organization-analytics-snapshot", artifact_ref: ".aof/context/active/organization-analytics.json" },
    { command: "metrics-snapshot", artifact_ref: ".aof/context/active/metrics-snapshot.json" },
    { command: "situation-assess", artifact_ref: treePosition.branch?.artifact_ref ?? operatorBrief.current_state?.primary_frontier_task?.artifact_ref ?? null },
    { command: "operator-brief", artifact_ref: ".aof/artifacts/visibility/current/operator-brief.json" },
    { command: "operator-progress", artifact_ref: ".aof/artifacts/visibility/current/operator-progress.json" },
    { command: "tree-position", artifact_ref: ".aof/artifacts/visibility/current/tree-position.json" },
    { command: "evidence-drill-down", artifact_ref: ".aof/artifacts/visibility/current/evidence-drill-down.json" },
    { command: "skillful-actor-hri-projection", artifact_ref: skillfulActorProjection?.artifactRef ?? null }
  ];
  const runtimeExecution = buildRuntimeExecutionView({
    generatedAt: operatorBrief.generated_at,
    executionLogRef: path.relative(projectRoot, runtimeExecutionPathRef),
    commandRuns,
    refreshedArtifactRefs: [
      ".aof/artifacts/visibility/current/status-card.json",
      ".aof/artifacts/visibility/current/timeline-feed.json",
      ".aof/artifacts/visibility/current/flow-snapshot.json",
      ".aof/artifacts/visibility/current/mission-control.json",
      ".aof/artifacts/visibility/current/operator-brief.json",
      ".aof/artifacts/visibility/current/operator-progress.json",
      ".aof/artifacts/visibility/current/tree-position.json",
      ".aof/artifacts/visibility/current/evidence-drill-down.json"
    ]
  });

  await validateWithBundledSchema(statusCard, "aof-status-card-view.schema.json", "status card view");
  await validateWithBundledSchema(timelineFeed, "aof-timeline-feed-view.schema.json", "timeline feed view");
  await validateWithBundledSchema(flowSnapshot, "aof-flow-snapshot-view.schema.json", "flow snapshot view");
  await validateWithBundledSchema(missionControl, "aof-mission-control-view.schema.json", "mission control view");
  await validateWithBundledSchema(operatorBrief, "aof-operator-brief-view.schema.json", "operator brief view");
  await validateWithBundledSchema(operatorProgress, "aof-operator-progress-view.schema.json", "operator progress view");
  await validateWithBundledSchema(treePosition, "aof-tree-position-view.schema.json", "tree position view");
  await validateWithBundledSchema(evidenceDrillDown, "aof-evidence-drill-down-view.schema.json", "evidence drill-down view");
  await validateWithBundledSchema(runtimeExecution, "aof-runtime-execution-view.schema.json", "runtime execution view");

  const statusPath = await writeJsonArtifact(path.join(artifactDir, "status-card.json"), statusCard);
  const timelinePath = await writeJsonArtifact(path.join(artifactDir, "timeline-feed.json"), timelineFeed);
  const flowPath = await writeJsonArtifact(path.join(artifactDir, "flow-snapshot.json"), flowSnapshot);
  const missionPath = await writeJsonArtifact(path.join(artifactDir, "mission-control.json"), missionControl);
  const operatorBriefPath = await writeJsonArtifact(path.join(artifactDir, "operator-brief.json"), operatorBrief);
  const operatorProgressPath = await writeJsonArtifact(path.join(artifactDir, "operator-progress.json"), operatorProgress);
  const treePositionPath = await writeJsonArtifact(path.join(artifactDir, "tree-position.json"), treePosition);
  const evidenceDrillDownPath = await writeJsonArtifact(path.join(artifactDir, "evidence-drill-down.json"), evidenceDrillDown);
  const runtimeExecutionPath = await writeJsonArtifact(runtimeExecutionPathRef, runtimeExecution);

  return {
    ok: true,
    projectRoot,
    artifactDir,
    statusPath,
    timelinePath,
    flowPath,
    missionPath,
    operatorBriefPath,
    operatorProgressPath,
    treePositionPath,
    evidenceDrillDownPath,
    runtimeExecutionPath,
    payloads: {
      status_card: statusCard,
      timeline_feed: timelineFeed,
      flow_snapshot: flowSnapshot,
      mission_control: missionControl,
      operator_brief: operatorBrief,
      operator_progress: operatorProgress,
      tree_position: treePosition,
      evidence_drill_down: evidenceDrillDown,
      runtime_execution: runtimeExecution
    }
  };
}
