import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

async function readJsonView(filePath, expectedType) {
  const resolvedPath = path.resolve(filePath);
  const raw = await fs.readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed.view_type !== expectedType) {
    throw new Error(
      `Expected ${expectedType} at ${resolvedPath}, but found ${parsed.view_type ?? "unknown"}.`
    );
  }
  return {
    path: resolvedPath,
    payload: parsed
  };
}

function deriveMissionControlFallback(statusCard = {}, timelineFeed = {}, flowSnapshot = {}, derived = {}) {
  const latestEntry = Array.isArray(timelineFeed.entries) ? timelineFeed.entries[0] ?? null : null;
  const blockers = Array.isArray(statusCard.open_signals)
    ? statusCard.open_signals.map((signal) => ({
        summary: signal,
        severity: "signal",
        artifact_ref: statusCard.latest_artifact_ref ?? null
      }))
    : [];

  return {
    view_type: "mission_control",
    generated_at: statusCard.as_of ?? latestEntry?.at ?? null,
    mission_overview: {
      mission: statusCard.owner ?? null,
      release_version: null,
      release_definition_ref: null,
      operating_goal: statusCard.current_goal ?? null,
      next_value_slice: statusCard.next_checkpoint ?? null,
      current_runtime_stage: statusCard.current_phase ?? null,
      chain_anchor_ref: statusCard.latest_artifact_ref ?? null
    },
    artifact_graph: {
      nodes: (Array.isArray(flowSnapshot.ordered_nodes) ? flowSnapshot.ordered_nodes : flowSnapshot.nodes ?? []).map((node) => ({
        id: node.id,
        label: node.label ?? node.id ?? "-",
        kind: "flow",
        state: node.state ?? "unknown",
        artifact_ref: null
      })),
      edges: Array.isArray(flowSnapshot.edges)
        ? flowSnapshot.edges.map((edge) => ({
            from: edge.from,
            to: edge.to,
            relation: edge.reason ?? "sequence"
          }))
        : [],
      current_node_id: flowSnapshot.current_node ?? null
    },
    runtime_position: {
      current_phase: statusCard.current_phase ?? null,
      current_step_label: derived?.current_node_detail?.node_label ?? null,
      current_step_state: derived?.current_node_detail?.node_state ?? null
    },
    blockers,
    next_action: {
      recommended_action: statusCard.next_checkpoint ?? null,
      rationale: latestEntry?.next ?? null,
      artifact_ref: statusCard.latest_artifact_ref ?? null
    }
  };
}

function deriveEvidenceDrillDownFallback(missionControl = {}) {
  const nextAction = missionControl.next_action ?? {};
  const blockerRefs = Array.isArray(missionControl.blockers)
    ? missionControl.blockers.map((entry) => entry.artifact_ref).filter(Boolean)
    : [];
  return {
    view_type: "evidence_drill_down",
    generated_at: missionControl.generated_at ?? null,
    brief_ref: null,
    current_state: {
      release_version: missionControl.mission_overview?.release_version ?? null,
      active_release_track: null,
      release_definition_ref: missionControl.mission_overview?.release_definition_ref ?? null,
      current_runtime_stage: missionControl.mission_overview?.current_runtime_stage ?? null,
      primary_frontier_task: null
    },
    answer_to_proof: {
      headline: {
        claim: missionControl.mission_overview?.operating_goal ?? null,
        rationale: "Fallback drill-down derived from Mission Control because no explicit evidence packet was provided.",
        evidence_refs: [missionControl.mission_overview?.chain_anchor_ref].filter(Boolean),
        evidence_items: [missionControl.mission_overview?.chain_anchor_ref].filter(Boolean).map((artifactRef) => ({
          artifact_ref: artifactRef,
          why_it_matters: "Provides the fallback chain anchor for the current mission state."
        }))
      },
      blockers: {
        claim: blockerRefs.length > 0
          ? `${blockerRefs.length} blocker signal(s) are visible from Mission Control.`
          : "No blocker is currently visible from Mission Control.",
        rationale: "Fallback blocker explanation derived from Mission Control.",
        entries: Array.isArray(missionControl.blockers) ? missionControl.blockers : [],
        evidence_refs: blockerRefs,
        evidence_items: blockerRefs.map((artifactRef) => ({
          artifact_ref: artifactRef,
          why_it_matters: "Supports the current blocker summary."
        }))
      },
      next_action: {
        claim: nextAction.recommended_action ?? null,
        rationale: nextAction.rationale ?? null,
        artifact_ref: nextAction.artifact_ref ?? null,
        evidence_refs: [nextAction.artifact_ref].filter(Boolean),
        evidence_items: [nextAction.artifact_ref].filter(Boolean).map((artifactRef) => ({
          artifact_ref: artifactRef,
          why_it_matters: "Provides the fallback source for the current recommended next action."
        }))
      }
    },
    bounded_path: [],
    operator_questions: {
      why_headline_true: "Fallback drill-down is active because no explicit evidence packet was supplied.",
      what_proves_blockers: "Use Mission Control blocker refs as the current fallback proof path.",
      what_proves_next_action: "Use the next-action artifact ref as the current fallback proof path."
    }
  };
}

function deriveOperatorProgressFallback(statusCard = {}, timelineFeed = {}, missionControl = {}) {
  const latestEntry = Array.isArray(timelineFeed.entries) ? timelineFeed.entries[0] ?? null : null;
  return {
    view_type: "operator_progress",
    generated_at: missionControl.generated_at ?? statusCard.as_of ?? null,
    current_checkpoint: {
      stage: missionControl.mission_overview?.current_runtime_stage ?? statusCard.current_phase ?? null,
      frontier_task_id: null,
      summary: missionControl.next_action?.recommended_action ?? statusCard.next_checkpoint ?? "No current checkpoint.",
      artifact_ref: missionControl.next_action?.artifact_ref ?? statusCard.latest_artifact_ref ?? null
    },
    previous_checkpoint: {
      summary: latestEntry?.summary ?? "No previous checkpoint is currently visible.",
      artifact_ref: latestEntry?.refs?.[0] ?? null
    },
    changes_since_last_checkpoint: latestEntry
      ? [{
          kind: latestEntry.event_type ?? "timeline-event",
          summary: latestEntry.summary ?? "Recent timeline change.",
          artifact_ref: latestEntry.refs?.[0] ?? null
        }]
      : [],
    progress_answer: {
      what_changed: latestEntry?.summary ?? "No recent change is currently visible.",
      why_it_matters: latestEntry?.rationale ?? "Use the timeline as the fallback change explanation.",
      next_checkpoint: missionControl.next_action?.recommended_action ?? statusCard.next_checkpoint ?? "Define the next checkpoint."
    }
  };
}

function deriveTreePositionFallback(missionControl = {}) {
  return {
    view_type: "tree_position",
    generated_at: missionControl.generated_at ?? null,
    trunk: {
      label: "AOF release evolution",
      active_release_version: missionControl.mission_overview?.release_version ?? null,
      active_release_track: null,
      release_definition_ref: missionControl.mission_overview?.release_definition_ref ?? null
    },
    branch: {
      frontier_track: null,
      frontier_task_id: null,
      frontier_task_title: missionControl.next_action?.recommended_action ?? null,
      artifact_ref: missionControl.next_action?.artifact_ref ?? null,
      branch_summary: missionControl.mission_overview?.next_value_slice ?? null
    },
    roadmap_path: [],
    tree_answer: {
      where_are_we: missionControl.next_action?.recommended_action ?? "No current branch is visible.",
      why_this_branch: missionControl.mission_overview?.operating_goal ?? null,
      what_branch_comes_next: missionControl.next_action?.recommended_action ?? "Define the next branch."
    }
  };
}

function deriveFlowSteps(flowSnapshot = {}) {
  const nodes = Array.isArray(flowSnapshot.nodes) ? flowSnapshot.nodes : [];
  const edges = Array.isArray(flowSnapshot.edges) ? flowSnapshot.edges : [];
  const incomingCount = new Map(nodes.map((node) => [node.id, 0]));

  for (const edge of edges) {
    incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
  }

  const ordered = [];
  const visited = new Set();
  const starters = nodes.filter((node) => (incomingCount.get(node.id) ?? 0) === 0);
  const queue = starters.length > 0 ? starters.map((node) => node.id) : nodes.map((node) => node.id);

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || visited.has(id)) {
      continue;
    }
    visited.add(id);
    const node = nodes.find((candidate) => candidate.id === id);
    if (node) {
      ordered.push(node);
    }
    for (const edge of edges.filter((candidate) => candidate.from === id)) {
      if (!visited.has(edge.to)) {
        queue.push(edge.to);
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      ordered.push(node);
    }
  }

  return ordered;
}

function formatNodeLabel(node = {}) {
  return node.label ?? node.id ?? "-";
}

function deriveFlowMetrics(flowSnapshot = {}) {
  const orderedNodes = Array.isArray(flowSnapshot.ordered_nodes)
    ? flowSnapshot.ordered_nodes
    : deriveFlowSteps(flowSnapshot);
  const currentNodeId = flowSnapshot.current_node ?? null;
  const currentIndex = orderedNodes.findIndex((node) => node.id === currentNodeId);
  const completedNodes = orderedNodes.filter((node) => node.state === "done");
  const pendingNodes = orderedNodes.filter((node) => node.state === "pending");
  const currentNode = currentIndex >= 0 ? orderedNodes[currentIndex] : null;
  const remainingAfterCurrent = currentIndex >= 0
    ? orderedNodes.slice(currentIndex + 1).filter((node) => node.state !== "done")
    : pendingNodes;

  return {
    total_steps: orderedNodes.length,
    completed_steps: completedNodes.length,
    pending_steps: pendingNodes.length,
    current_step_index: currentIndex >= 0 ? currentIndex + 1 : null,
    current_step_label: currentNode ? formatNodeLabel(currentNode) : null,
    remaining_after_current: remainingAfterCurrent.length,
    immediate_next_step: remainingAfterCurrent[0] ? formatNodeLabel(remainingAfterCurrent[0]) : null,
    next_steps: remainingAfterCurrent.map((node) => formatNodeLabel(node)),
    ordered_step_labels: orderedNodes.map((node) => formatNodeLabel(node)),
    completion_ratio: orderedNodes.length > 0
      ? Number((completedNodes.length / orderedNodes.length).toFixed(2))
      : 0
  };
}

function deriveTimelineMetrics(timelineFeed = {}) {
  const entries = Array.isArray(timelineFeed.entries) ? timelineFeed.entries : [];
  const latestEntry = entries[0] ?? null;
  return {
    entry_count: entries.length,
    latest_actor: latestEntry?.actor ?? null,
    latest_event_type: latestEntry?.event_type ?? null,
    latest_at: latestEntry?.at ?? null,
    latest_summary: latestEntry?.summary ?? null
  };
}

function deriveCurrentNodeDetail(flowSnapshot = {}, flowMetrics = {}) {
  const orderedNodes = Array.isArray(flowSnapshot.ordered_nodes) ? flowSnapshot.ordered_nodes : [];
  const currentNodeId = flowSnapshot.current_node ?? null;
  const currentNode = orderedNodes.find((node) => node.id === currentNodeId) ?? null;
  const substeps = Array.isArray(currentNode?.substeps) ? currentNode.substeps : [];
  const branches = Array.isArray(currentNode?.branches) ? currentNode.branches : [];
  const loopbacks = Array.isArray(currentNode?.loopbacks)
    ? currentNode.loopbacks
    : (Array.isArray(flowSnapshot.edges) ? flowSnapshot.edges : [])
        .filter((edge) => edge.from === currentNodeId)
        .filter((edge) => {
          const fromIndex = orderedNodes.findIndex((node) => node.id === edge.from);
          const toIndex = orderedNodes.findIndex((node) => node.id === edge.to);
          return fromIndex >= 0 && toIndex >= 0 && toIndex <= fromIndex;
        })
        .map((edge) => ({
          to: edge.to,
          label: edge.reason ?? `return to ${edge.to}`
        }));
  const doneSubsteps = substeps.filter((step) => step.state === "done").length;
  const currentSubstep = substeps.find((step) => step.state === "current") ?? null;
  const nextSubstep = substeps.find((step) => step.state === "pending") ?? null;

  return {
    node_id: currentNode?.id ?? null,
    node_label: currentNode ? formatNodeLabel(currentNode) : null,
    node_state: currentNode?.state ?? null,
    step_progress: flowMetrics.current_step_index && flowMetrics.total_steps
      ? `${flowMetrics.current_step_index} / ${flowMetrics.total_steps}`
      : null,
    substeps,
    substep_progress: substeps.length > 0 ? `${doneSubsteps} / ${substeps.length}` : null,
    current_substep_label: currentSubstep?.label ?? null,
    next_substep_label: nextSubstep?.label ?? null,
    branches,
    loopbacks
  };
}

function deriveNarrative(statusCard = {}, flowMetrics = {}, timelineMetrics = {}) {
  return {
    project_plan: flowMetrics.ordered_step_labels ?? [],
    current_position: {
      phase: statusCard.current_phase ?? null,
      step_progress: flowMetrics.current_step_index && flowMetrics.total_steps
        ? `${flowMetrics.current_step_index} / ${flowMetrics.total_steps}`
        : null,
      current_step_label: flowMetrics.current_step_label ?? null,
      completion_ratio: flowMetrics.completion_ratio ?? 0
    },
    next_action: {
      checkpoint: statusCard.next_checkpoint ?? null,
      immediate_next_step: flowMetrics.immediate_next_step ?? null,
      latest_driver: timelineMetrics.latest_summary ?? null
    },
    remaining_work: {
      remaining_steps_after_current: flowMetrics.remaining_after_current ?? 0,
      next_steps: flowMetrics.next_steps ?? []
    }
  };
}

function deriveCadenceSummary(statusCard = {}) {
  const hasCadence =
    statusCard.cadence_timing_state ||
    statusCard.cadence_scheduler_state ||
    statusCard.cadence_dispatch_state ||
    statusCard.cadence_scheduler_profile ||
    statusCard.cadence_next_check_at ||
    statusCard.cadence_reason;

  if (!hasCadence) {
    return {
      present: false,
      timing_state: null,
      scheduler_state: null,
      dispatch_state: null,
      scheduler_profile: null,
      next_check_at: null,
      reason: null
    };
  }

  return {
    present: true,
    timing_state: statusCard.cadence_timing_state ?? null,
    scheduler_state: statusCard.cadence_scheduler_state ?? null,
    dispatch_state: statusCard.cadence_dispatch_state ?? null,
    scheduler_profile: statusCard.cadence_scheduler_profile ?? null,
    next_check_at: statusCard.cadence_next_check_at ?? null,
    reason: statusCard.cadence_reason ?? null
  };
}

export function buildVisibilityPageHtml(title) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f1ea;
        --panel: #fffdf7;
        --ink: #1f1b16;
        --muted: #6c6257;
        --line: #d7cbbd;
        --accent: #326273;
        --accent-soft: #e7f1f4;
        --good: #245c3f;
        --good-soft: #eef7f1;
        --warn: #8a5b00;
        --warn-soft: #fff7e2;
        --bad: #8e2f2f;
        --bad-soft: #fff0f0;
      }
      * { box-sizing: border-box; }
      html, body {
        height: 100%;
      }
      body {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", serif;
        background: linear-gradient(180deg, #f8f6f0 0%, var(--bg) 100%);
        color: var(--ink);
        overflow: hidden;
      }
      #fit-stage {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        display: grid;
        place-items: start center;
        padding: 6px;
      }
      #app-shell {
        width: 1320px;
        height: 780px;
        transform-origin: top center;
      }
      header {
        padding: 16px 20px 8px;
        border-bottom: 1px solid var(--line);
        background: rgba(255,253,247,0.92);
        backdrop-filter: blur(12px);
        z-index: 1;
      }
      header h1 { margin: 0 0 4px; font-size: 24px; }
      header p { margin: 0; color: var(--muted); }
      .dashboard {
        height: calc(100% - 70px);
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 10px;
        padding: 10px 12px 12px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 2.2fr) 240px 160px 160px;
        gap: 10px;
        align-items: stretch;
      }
      .hero-focus {
        padding: 14px 16px;
        background: linear-gradient(180deg, #fffdf7 0%, #f8f2e9 100%);
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: 0 12px 30px rgba(54, 44, 34, 0.06);
        display: grid;
        gap: 8px;
        min-width: 0;
        min-height: 122px;
      }
      .hero-focus .eyebrow {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .hero-focus .title {
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
      }
      .hero-focus .subtitle {
        font-size: 17px;
        font-weight: 700;
        line-height: 1.2;
      }
      .hero-focus .next-line {
        font-size: 15px;
        line-height: 1.3;
      }
      .hero-flags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      main {
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(320px, 1.05fr) minmax(350px, 1.12fr) minmax(320px, 1.05fr);
        gap: 10px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: 0 12px 30px rgba(54, 44, 34, 0.06);
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .metric {
        padding: 12px 14px;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 14px;
        box-shadow: 0 12px 30px rgba(54, 44, 34, 0.06);
        min-height: 122px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .metric .label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .metric .value {
        margin-top: 4px;
        font-size: 21px;
        font-weight: 600;
      }
      .panel h2 {
        margin: 0;
        padding: 14px 14px 0;
        font-size: 16px;
      }
      .card-body, .timeline-body, .flow-body {
        padding: 12px 14px 14px;
        min-height: 0;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: #c7b8a8 transparent;
        position: relative;
      }
      .card-body::-webkit-scrollbar,
      .timeline-body::-webkit-scrollbar,
      .flow-body::-webkit-scrollbar {
        width: 8px;
      }
      .card-body::-webkit-scrollbar-thumb,
      .timeline-body::-webkit-scrollbar-thumb,
      .flow-body::-webkit-scrollbar-thumb {
        background: #c7b8a8;
        border-radius: 999px;
      }
      .card-body::-webkit-scrollbar-track,
      .timeline-body::-webkit-scrollbar-track,
      .flow-body::-webkit-scrollbar-track {
        background: transparent;
      }
      .timeline-body::after {
        content: "";
        position: sticky;
        left: 0;
        right: 0;
        bottom: 0;
        display: block;
        height: 22px;
        margin-top: -22px;
        background: linear-gradient(180deg, rgba(255,253,247,0) 0%, rgba(255,253,247,0.92) 70%, rgba(255,253,247,1) 100%);
        pointer-events: none;
      }
      dl {
        margin: 0;
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 10px 12px;
      }
      dt {
        color: var(--muted);
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      dd {
        margin: 0;
        font-size: 14px;
        line-height: 1.35;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid var(--line);
        background: #f6efe4;
      }
      .badge.good { color: var(--good); border-color: #b7d5c4; background: #eef7f1; }
      .badge.warn { color: var(--warn); border-color: #e1cb94; background: #fff8e5; }
      .badge.bad { color: var(--bad); border-color: #dfb0b0; background: #fff0f0; }
      .timeline-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }
      .timeline-entry {
        padding-left: 12px;
        border-left: 3px solid var(--line);
      }
      .timeline-entry .meta {
        color: var(--muted);
        font-size: 11px;
        margin-bottom: 6px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .timeline-entry .summary {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 5px;
      }
      .timeline-entry .detail {
        margin: 3px 0 0;
        color: var(--ink);
        font-size: 13px;
        line-height: 1.3;
      }
      .flow-steps {
        display: grid;
        gap: 8px;
      }
      .flow-step {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid var(--line);
        background: #fcfaf4;
      }
      .flow-step.current {
        border-color: var(--accent);
        background: var(--accent-soft);
      }
      .flow-step.done {
        background: var(--good-soft);
        border-color: #b7d5c4;
      }
      .flow-step .name {
        font-weight: 600;
      }
      .flow-step .state-pill,
      .node-step .state-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 76px;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border: 1px solid var(--line);
      }
      .state-pill.done {
        background: var(--good-soft);
        color: var(--good);
        border-color: #b7d5c4;
      }
      .state-pill.current {
        background: var(--accent-soft);
        color: var(--accent);
        border-color: #b7d2dd;
      }
      .state-pill.pending {
        background: var(--warn-soft);
        color: var(--warn);
        border-color: #e3cc92;
      }
      .state-pill.unknown {
        background: #f6efe4;
        color: var(--muted);
      }
      .node-step {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fcfaf4;
      }
      .node-step.current {
        border-color: var(--accent);
        background: var(--accent-soft);
      }
      .node-step.done {
        background: var(--good-soft);
        border-color: #b7d5c4;
      }
      .node-step .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--line);
        flex: 0 0 auto;
      }
      .node-step.done .dot { background: var(--good); }
      .node-step.current .dot { background: var(--accent); }
      .node-step.pending .dot { background: var(--warn); }
      .branch-list, .chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: #f8f3ea;
        font-size: 13px;
      }
      .node-connector {
        margin: 3px 0 3px 14px;
        width: 2px;
        height: 12px;
        background: linear-gradient(180deg, #bcd0d7 0%, #d7cbbd 100%);
        border-radius: 999px;
      }
      .flow-connector {
        margin: 4px 0 4px 18px;
        width: 2px;
        height: 12px;
        background: linear-gradient(180deg, #bcd0d7 0%, #d7cbbd 100%);
        border-radius: 999px;
      }
      .empty {
        color: var(--muted);
        font-style: italic;
      }
      .donut-wrap {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 10px;
        align-items: center;
        padding: 10px 12px;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: 0 12px 30px rgba(54, 44, 34, 0.06);
        min-height: 122px;
      }
      .donut {
        --progress: 0deg;
        width: 104px;
        height: 104px;
        border-radius: 50%;
        background: conic-gradient(var(--accent) 0 var(--progress), #e8ddd0 var(--progress) 360deg);
        display: grid;
        place-items: center;
      }
      .donut::before {
        content: "";
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: var(--panel);
        border: 1px solid var(--line);
      }
      .donut-value {
        position: absolute;
        font-size: 18px;
        font-weight: 700;
      }
      .donut-stack {
        position: relative;
        display: grid;
        place-items: center;
      }
      .overview-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .overview-card {
        padding: 10px 12px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fcfaf4;
      }
      .overview-card .label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .overview-card .value {
        margin-top: 4px;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.25;
      }
      .sources {
        margin-top: 8px;
        color: var(--muted);
        font-size: 12px;
      }
      .plan-list, .next-list {
        margin: 0;
        padding-left: 18px;
      }
      .tight-stack {
        display: grid;
        gap: 8px;
      }
    </style>
  </head>
  <body>
    <div id="fit-stage">
    <div id="app-shell">
    <header>
      <h1>${escapeHtml(title)}</h1>
      <p>Mission Control viewer for status, progress, tree position, proof, blockers, and next action.</p>
    </header>
    <div class="dashboard">
    <section class="hero">
      <div class="hero-focus" id="hero-root"></div>
      <div class="donut-wrap">
        <div class="donut-stack">
          <div class="donut" id="progress-donut"></div>
          <div class="donut-value" id="donut-value">-</div>
        </div>
        <div>
          <div class="label" style="color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px;">Overall Progress</div>
          <div style="margin-top: 6px; font-size: 18px; font-weight: 600;" id="donut-summary">-</div>
          <div class="sources" id="donut-detail">-</div>
        </div>
      </div>
      <div class="metric">
        <div class="label">Remaining</div>
        <div class="value" id="metric-remaining">-</div>
      </div>
      <div class="metric">
        <div class="label">Next Step</div>
        <div class="value" id="metric-next">-</div>
      </div>
    </section>
    <main>
      <section class="panel">
        <h2>Project State</h2>
        <div class="card-body tight-stack">
          <div id="status-root"></div>
          <div id="overview-root" class="overview-grid"></div>
        </div>
      </section>
      <section class="panel">
        <h2>Mission Lineage</h2>
        <div class="flow-body tight-stack">
          <div id="node-root"></div>
        </div>
      </section>
      <section style="display:grid; gap:16px; min-height:0;">
        <section class="panel">
          <h2>Flow</h2>
          <div class="flow-body" id="flow-root"></div>
        </section>
        <section class="panel">
          <h2>Recent Decisions</h2>
          <div class="timeline-body" id="timeline-root"></div>
        </section>
      </section>
    </main>
    </div>
    </div>
    </div>
    <script>
      function escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function formatArray(value) {
        return Array.isArray(value) && value.length > 0 ? value.join(", ") : "none";
      }

      function badgeClass(state) {
        if (state === "present") return "badge good";
        if (state === "partial") return "badge warn";
        return "badge bad";
      }

      function stateClass(state) {
        if (state === "done" || state === "completed") return "done";
        if (state === "current" || state === "active" || state === "in_progress") return "current";
        if (state === "pending" || state === "queued") return "pending";
        return "unknown";
      }

      function renderStatus(status) {
        const root = document.getElementById("status-root");
        const cadenceRows = status.cadence_timing_state || status.cadence_scheduler_state || status.cadence_dispatch_state || status.cadence_scheduler_profile || status.cadence_next_check_at || status.cadence_reason
          ? \`
            <dt>Cadence Timing</dt><dd>\${escapeHtml(status.cadence_timing_state ?? "-")}</dd>
            <dt>Scheduler</dt><dd>\${escapeHtml(status.cadence_scheduler_state ?? "-")}</dd>
            <dt>Dispatch</dt><dd>\${escapeHtml(status.cadence_dispatch_state ?? "-")}</dd>
            <dt>Profile</dt><dd>\${escapeHtml(status.cadence_scheduler_profile ?? "-")}</dd>
            <dt>Next Check</dt><dd>\${escapeHtml(status.cadence_next_check_at ?? "-")}</dd>
            <dt>Cadence Why</dt><dd>\${escapeHtml(status.cadence_reason ?? "-")}</dd>
          \`
          : "";
        root.innerHTML = \`
          <div class="\${badgeClass(status.runtime_evidence_state)}">\${escapeHtml(status.runtime_evidence_state ?? "unknown")}</div>
          <dl>
            <dt>As of</dt><dd>\${escapeHtml(status.as_of ?? "-")}</dd>
            <dt>Usage</dt><dd>\${escapeHtml(status.usage_level ?? "-")}</dd>
            <dt>Phase</dt><dd>\${escapeHtml(status.current_phase ?? "-")}</dd>
            <dt>Goal</dt><dd>\${escapeHtml(status.current_goal ?? "-")}</dd>
            <dt>Owner</dt><dd>\${escapeHtml(status.owner ?? "-")}</dd>
            <dt>Signals</dt><dd>\${escapeHtml(formatArray(status.open_signals))}</dd>
            <dt>Next</dt><dd>\${escapeHtml(status.next_checkpoint ?? "-")}</dd>
            <dt>Artifact</dt><dd>\${escapeHtml(status.latest_artifact_ref ?? "-")}</dd>
            \${cadenceRows}
          </dl>
        \`;
      }

      function renderHero(status, derived) {
        const root = document.getElementById("hero-root");
        const narrative = derived?.narrative ?? {};
        const currentNode = derived?.current_node_detail ?? {};
        const mission = derived?.mission_control ?? {};
        const cadence = derived?.cadence_summary ?? {};
        const signalList = Array.isArray(status.open_signals) ? status.open_signals : [];
        const flags = [];
        flags.push('<span class="' + badgeClass(status.runtime_evidence_state) + '">' + escapeHtml(status.runtime_evidence_state ?? "unknown") + '</span>');
        flags.push('<span class="chip">' + escapeHtml(status.usage_level ?? "-") + '</span>');
        if (cadence.present) {
          flags.push('<span class="chip">Cadence: ' + escapeHtml(cadence.scheduler_state ?? cadence.timing_state ?? "-") + '</span>');
          if (cadence.scheduler_profile) {
            flags.push('<span class="chip">Scheduler: ' + escapeHtml(cadence.scheduler_profile) + '</span>');
          }
        }
        if (signalList.length > 0) {
          flags.push('<span class="chip">Signals: ' + escapeHtml(signalList.join(", ")) + '</span>');
        } else {
          flags.push('<span class="chip">Signals: none</span>');
        }
        root.innerHTML =
          '<div class="eyebrow">Now</div>' +
          '<div class="title">' + escapeHtml(mission.runtime_position?.current_step_label ?? currentNode.node_label ?? narrative.current_position?.current_step_label ?? "-") + '</div>' +
          '<div class="subtitle">' + escapeHtml(mission.next_action?.recommended_action ?? currentNode.current_substep_label ?? narrative.next_action?.immediate_next_step ?? "-") + '</div>' +
          '<div class="next-line"><strong>Next action:</strong> ' + escapeHtml(mission.next_action?.recommended_action ?? narrative.next_action?.checkpoint ?? status.next_checkpoint ?? "-") + '</div>' +
          '<div class="next-line"><strong>Owner:</strong> ' + escapeHtml(status.owner ?? "-") + ' · <strong>Goal:</strong> ' + escapeHtml(status.current_goal ?? "-") + '</div>' +
          '<div class="hero-flags">' + flags.join("") + '</div>';
      }

      function renderOverview(status, derived) {
        const root = document.getElementById("overview-root");
        const narrative = derived?.narrative ?? {};
        const flowMetrics = derived?.flow_metrics ?? {};
        const currentNode = derived?.current_node_detail ?? {};
        const mission = derived?.mission_control ?? {};
        const cadence = derived?.cadence_summary ?? {};
        const cadenceCards = cadence.present
          ? \`
          <div class="overview-card">
            <div class="label">Cadence</div>
            <div class="value">\${escapeHtml(cadence.scheduler_state ?? cadence.timing_state ?? "-")}</div>
          </div>
          <div class="overview-card">
            <div class="label">Scheduler Profile</div>
            <div class="value">\${escapeHtml(cadence.scheduler_profile ?? "-")}</div>
          </div>
          <div class="overview-card">
            <div class="label">Next Cadence Check</div>
            <div class="value">\${escapeHtml(cadence.next_check_at ?? "-")}</div>
          </div>
          \`
          : "";
        root.innerHTML = \`
          <div class="overview-card">
            <div class="label">Completed</div>
            <div class="value">\${escapeHtml(String(flowMetrics.completed_steps ?? "-"))}</div>
          </div>
          <div class="overview-card">
            <div class="label">Current Step</div>
            <div class="value">\${escapeHtml(narrative.current_position?.step_progress ?? "-")}</div>
          </div>
          <div class="overview-card">
            <div class="label">Current Node</div>
            <div class="value">\${escapeHtml(mission.runtime_position?.current_step_label ?? currentNode.node_label ?? narrative.current_position?.current_step_label ?? "-")}</div>
          </div>
          <div class="overview-card">
            <div class="label">Runtime Stage</div>
            <div class="value">\${escapeHtml(mission.mission_overview?.current_runtime_stage ?? currentNode.current_substep_label ?? "-")}</div>
          </div>
          <div class="overview-card">
            <div class="label">Next Action</div>
            <div class="value">\${escapeHtml(mission.next_action?.recommended_action ?? narrative.next_action?.checkpoint ?? "-")}</div>
          </div>
          <div class="overview-card">
            <div class="label">Blockers</div>
            <div class="value">\${escapeHtml((mission.blockers ?? []).length > 0 ? String((mission.blockers ?? []).length) : formatArray(status.open_signals))}</div>
          </div>
          <div class="overview-card">
            <div class="label">Remaining Steps</div>
            <div class="value">\${escapeHtml(String(narrative.remaining_work?.remaining_steps_after_current ?? "-"))}</div>
          </div>
          <div class="overview-card">
            <div class="label">Release</div>
            <div class="value">\${escapeHtml(mission.mission_overview?.release_version ?? currentNode.substep_progress ?? "-")}</div>
          </div>
          \${cadenceCards}
        \`;
      }

      function renderProgress(derived) {
        const narrative = derived?.narrative ?? {};
        const flowMetrics = derived?.flow_metrics ?? {};
        const percent = Math.round((flowMetrics.completion_ratio ?? 0) * 100);
        const donut = document.getElementById("progress-donut");
        donut.style.setProperty("--progress", percent * 3.6 + "deg");
        document.getElementById("donut-value").textContent = String(percent) + "%";
        document.getElementById("donut-summary").textContent =
          String(flowMetrics.completed_steps ?? 0) + " done · " +
          String(narrative.remaining_work?.remaining_steps_after_current ?? 0) + " left";
        document.getElementById("donut-detail").textContent =
          "Current: " + String(narrative.current_position?.current_step_label ?? "-") +
          " (" + String(narrative.current_position?.step_progress ?? "-") + ")";
        document.getElementById("metric-remaining").textContent = String(narrative.remaining_work?.remaining_steps_after_current ?? "-");
        document.getElementById("metric-next").textContent = narrative.next_action?.immediate_next_step ?? "-";
      }

      function renderCurrentNodeDetail(derived) {
        const root = document.getElementById("node-root");
        const currentNode = derived?.current_node_detail ?? {};
        const mission = derived?.mission_control ?? {};
        const progress = derived?.operator_progress ?? {};
        const tree = derived?.tree_position ?? {};
        const evidence = derived?.evidence_drill_down ?? {};
        const substeps = Array.isArray(currentNode.substeps) ? currentNode.substeps : [];
        const branches = Array.isArray(currentNode.branches) ? currentNode.branches : [];
        const loopbacks = Array.isArray(currentNode.loopbacks) ? currentNode.loopbacks : [];
        const graph = mission.artifact_graph ?? {};
        const graphNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const graphEdges = Array.isArray(graph.edges) ? graph.edges : [];
        const blockers = Array.isArray(mission.blockers) ? mission.blockers : [];
        const headlineProof = evidence.answer_to_proof?.headline ?? {};
        const blockerProof = evidence.answer_to_proof?.blockers ?? {};
        const nextActionProof = evidence.answer_to_proof?.next_action ?? {};
        const progressRows = progress.view_type === "operator_progress"
          ? '<div style="margin-top:16px;">' +
              '<div class="label" style="color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin-bottom: 8px;">What Changed</div>' +
              '<div class="tight-stack">' +
                '<div class="overview-card"><div class="label">Current Checkpoint</div><div class="value">' + escapeHtml(progress.current_checkpoint?.summary ?? "-") + '</div><div class="sources">' + escapeHtml(progress.current_checkpoint?.artifact_ref ?? "-") + '</div></div>' +
                '<div class="overview-card"><div class="label">Previous Checkpoint</div><div class="value">' + escapeHtml(progress.previous_checkpoint?.summary ?? "-") + '</div><div class="sources">' + escapeHtml(progress.previous_checkpoint?.artifact_ref ?? "-") + '</div></div>' +
                '<div class="overview-card"><div class="label">Change Summary</div><div class="value">' + escapeHtml(progress.progress_answer?.what_changed ?? "-") + '</div><div class="sources">' + escapeHtml(progress.progress_answer?.why_it_matters ?? "-") + '</div></div>' +
              '</div>' +
            '</div>'
          : "";
        const treeRows = tree.view_type === "tree_position"
          ? '<div style="margin-top:16px;">' +
              '<div class="label" style="color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin-bottom: 8px;">Where In The Tree</div>' +
              '<div class="tight-stack">' +
                '<div class="overview-card"><div class="label">Trunk</div><div class="value">' + escapeHtml(tree.trunk?.active_release_track ?? tree.trunk?.active_release_version ?? "-") + '</div><div class="sources">' + escapeHtml(tree.trunk?.release_definition_ref ?? "-") + '</div></div>' +
                '<div class="overview-card"><div class="label">Branch</div><div class="value">' + escapeHtml(tree.branch?.frontier_task_title ?? "-") + '</div><div class="sources">' + escapeHtml(tree.branch?.artifact_ref ?? "-") + '</div></div>' +
                '<div class="overview-card"><div class="label">Tree Answer</div><div class="value">' + escapeHtml(tree.tree_answer?.where_are_we ?? "-") + '</div><div class="sources">' + escapeHtml(tree.tree_answer?.why_this_branch ?? "-") + '</div></div>' +
              '</div>' +
            '</div>'
          : "";
        const proofRows = evidence.view_type === "evidence_drill_down"
          ? '<div style="margin-top:16px;">' +
              '<div class="label" style="color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin-bottom: 8px;">Evidence Drill-Down</div>' +
              '<div class="tight-stack">' +
                '<div class="overview-card"><div class="label">Headline Proof</div><div class="value">' + escapeHtml(headlineProof.claim ?? "-") + '</div><div class="sources">' + escapeHtml((headlineProof.evidence_refs ?? []).join(" | ") || "-") + '</div></div>' +
                '<div class="overview-card"><div class="label">Blocker Proof</div><div class="value">' + escapeHtml(blockerProof.claim ?? "-") + '</div><div class="sources">' + escapeHtml((blockerProof.evidence_refs ?? []).join(" | ") || "-") + '</div></div>' +
                '<div class="overview-card"><div class="label">Next Action Proof</div><div class="value">' + escapeHtml(nextActionProof.claim ?? "-") + '</div><div class="sources">' + escapeHtml((nextActionProof.evidence_refs ?? []).join(" | ") || "-") + '</div></div>' +
              '</div>' +
            '</div>'
          : "";

        if (graphNodes.length > 0) {
          const edgeMap = new Map();
          for (const edge of graphEdges) {
            if (!edgeMap.has(edge.from)) {
              edgeMap.set(edge.from, []);
            }
            edgeMap.get(edge.from).push(edge);
          }

          root.innerHTML =
            '<div class="overview-grid">' +
              '<div class="overview-card">' +
                '<div class="label">Mission</div>' +
                '<div class="value">' + escapeHtml(mission.mission_overview?.mission ?? "-") + '</div>' +
              '</div>' +
              '<div class="overview-card">' +
                '<div class="label">Operating Goal</div>' +
                '<div class="value">' + escapeHtml(mission.mission_overview?.operating_goal ?? "-") + '</div>' +
              '</div>' +
              '<div class="overview-card">' +
                '<div class="label">Current Stage</div>' +
                '<div class="value">' + escapeHtml(mission.mission_overview?.current_runtime_stage ?? "-") + '</div>' +
              '</div>' +
              '<div class="overview-card">' +
                '<div class="label">Chain Anchor</div>' +
                '<div class="value">' + escapeHtml(mission.mission_overview?.chain_anchor_ref ?? "-") + '</div>' +
              '</div>' +
            '</div>' +
            '<div>' +
              '<div class="label" style="color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin-bottom: 8px;">Artifact Graph</div>' +
              '<div class="tight-stack">' + graphNodes.map((node, index) =>
                '<div>' +
                  '<div class="node-step ' + escapeHtml(node.state ?? "") + '">' +
                    '<span class="dot"></span>' +
                    '<div style="flex:1;">' +
                      '<div style="font-weight:600;">' + escapeHtml(node.label ?? node.id ?? "-") + '</div>' +
                      '<div class="sources">' + escapeHtml(node.artifact_ref ?? "-") + '</div>' +
                    '</div>' +
                    '<div class="state-pill ' + stateClass(node.state) + '">' + escapeHtml(node.state ?? "-") + '</div>' +
                  '</div>' +
                  ((edgeMap.get(node.id)?.length ?? 0) > 0
                    ? '<div class="sources" style="margin:6px 0 0 22px;">' + escapeHtml(edgeMap.get(node.id).map((edge) => edge.relation + " -> " + edge.to).join(" | ")) + '</div>'
                    : '') +
                  (index < graphNodes.length - 1 ? '<div class="node-connector"></div>' : '') +
                '</div>'
              ).join('') + '</div>' +
            '</div>' +
            '<div>' +
              '<div class="label" style="color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin-bottom: 8px;">Blockers</div>' +
              ((blockers.length > 0)
                ? '<div class="tight-stack">' + blockers.map((blocker) =>
                    '<div class="overview-card"><div class="value">' + escapeHtml(blocker.summary ?? "-") + '</div><div class="sources">' + escapeHtml(blocker.artifact_ref ?? "-") + '</div></div>'
                  ).join("") + '</div>'
                : '<p class="empty">No blocker is currently derived from the runtime artifact set.</p>') +
            '</div>' +
            progressRows +
            treeRows +
            proofRows;
          return;
        }

        const substepHtml = substeps.length > 0
          ? '<div class="tight-stack">' + substeps.map((step, index) =>
              '<div>' +
                '<div class="node-step ' + escapeHtml(step.state ?? "") + '">' +
                  '<span class="dot"></span>' +
                  '<div style="flex:1;">' +
                    '<div style="font-weight:600;">' + escapeHtml(step.label ?? step.id ?? ("step-" + (index + 1))) + '</div>' +
                    '<div class="sources">' + escapeHtml(step.note ?? step.id ?? "-") + '</div>' +
                  '</div>' +
                  '<div class="state-pill ' + stateClass(step.state) + '">' + escapeHtml(step.state ?? "-") + '</div>' +
                '</div>' +
                (index < substeps.length - 1 ? '<div class="node-connector"></div>' : '') +
              '</div>'
            ).join("") + '</div>'
          : '<p class="empty">No substeps defined for the current node.</p>';

        const branchHtml = branches.length > 0
          ? '<div class="branch-list">' + branches.map((branch) =>
              '<span class="chip">' + escapeHtml(branch.label ?? branch.condition ?? branch.to ?? "-") + '</span>'
            ).join("") + '</div>'
          : '<p class="empty">No open branches.</p>';

        const loopbackHtml = loopbacks.length > 0
          ? '<div class="branch-list">' + loopbacks.map((item) =>
              '<span class="chip">Return: ' + escapeHtml(item.label ?? item.to ?? "-") + '</span>'
            ).join("") + '</div>'
          : '<p class="empty">No return paths.</p>';

        root.innerHTML =
          '<div class="overview-grid">' +
            '<div class="overview-card">' +
              '<div class="label">Node</div>' +
              '<div class="value">' + escapeHtml(currentNode.node_label ?? "-") + '</div>' +
            '</div>' +
            '<div class="overview-card">' +
              '<div class="label">Step Progress</div>' +
              '<div class="value">' + escapeHtml(currentNode.step_progress ?? "-") + '</div>' +
            '</div>' +
            '<div class="overview-card">' +
              '<div class="label">Substeps</div>' +
              '<div class="value">' + escapeHtml(currentNode.substep_progress ?? "-") + '</div>' +
            '</div>' +
            '<div class="overview-card">' +
              '<div class="label">Next Substep</div>' +
              '<div class="value">' + escapeHtml(currentNode.next_substep_label ?? "-") + '</div>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="label" style="color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin-bottom: 8px;">Node Flow</div>' +
            substepHtml +
          '</div>' +
          '<div>' +
            '<div class="label" style="color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin-bottom: 8px;">Branch Options</div>' +
            branchHtml +
          '</div>' +
          '<div>' +
            '<div class="label" style="color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; margin-bottom: 8px;">Return Paths</div>' +
            loopbackHtml +
          '</div>' +
          progressRows +
          treeRows +
          proofRows;
      }

      function renderTimeline(timeline) {
        const root = document.getElementById("timeline-root");
        if (!Array.isArray(timeline.entries) || timeline.entries.length === 0) {
          root.innerHTML = '<p class="empty">No timeline entries available.</p>';
          return;
        }
        const entries = timeline.entries.slice(0, 4);
        root.innerHTML = '<ol class="timeline-list">' + entries.map((entry) => \`
          <li class="timeline-entry">
            <div class="meta">
              <span>\${escapeHtml(entry.at ?? "-")}</span>
              <span>\${escapeHtml(entry.actor ?? "-")}</span>
              <span>\${escapeHtml(entry.event_type ?? "-")}</span>
            </div>
            <div class="summary">\${escapeHtml(entry.summary ?? "-")}</div>
            <p class="detail">Why: \${escapeHtml(entry.rationale ?? "-")}</p>
            <p class="detail">Next: \${escapeHtml(entry.next ?? "-")}</p>
            <p class="detail">Refs: \${escapeHtml(formatArray(entry.refs))}</p>
          </li>
        \`).join("") + '</ol>';
      }

      function renderFlow(flow) {
        const root = document.getElementById("flow-root");
        if (!Array.isArray(flow.nodes) || flow.nodes.length === 0) {
          root.innerHTML = '<p class="empty">No flow nodes available.</p>';
          return;
        }
        const steps = Array.isArray(flow.ordered_nodes) ? flow.ordered_nodes : flow.nodes;
        root.innerHTML = '<div class="flow-steps">' + steps.map((node, index) => \`
          <div>
            <div class="flow-step \${escapeHtml(node.state ?? "")}">
              <div>
                <div class="name">\${escapeHtml(node.label ?? node.id ?? "-")}</div>
                <div class="detail">Node: \${escapeHtml(node.id ?? "-")}</div>
              </div>
              <div class="state-pill \${stateClass(node.state)}">\${escapeHtml(node.state ?? "-")}</div>
            </div>
            \${index < steps.length - 1 ? '<div class="flow-connector"></div>' : ""}
          </div>
        \`).join("") + '</div>' +
        '<div class="sources">Current node: ' + escapeHtml(flow.current_node ?? "-") + '<br>Open branches: ' + escapeHtml(formatArray(flow.open_branches)) + '</div>';
      }

      function fitDashboardToViewport() {
        const shell = document.getElementById("app-shell");
        const stage = document.getElementById("fit-stage");
        if (!shell || !stage) return;
        shell.style.transform = "scale(1)";
        const naturalWidth = shell.offsetWidth;
        const naturalHeight = shell.offsetHeight;
        const availableWidth = Math.max(window.innerWidth - 12, 320);
        const availableHeight = Math.max(window.innerHeight - 12, 320);
        const scale = Math.min(
          availableWidth / naturalWidth,
          availableHeight / naturalHeight,
          1
        );
        shell.style.transform = "scale(" + scale + ")";
        stage.style.alignItems = scale < 1 ? "start" : "center";
      }

      async function refresh() {
        const response = await fetch("/api/views", { cache: "no-store" });
        const payload = await response.json();
        renderHero(payload.status_card ?? {}, payload.derived ?? {});
        renderStatus(payload.status_card ?? {});
        renderOverview(payload.status_card ?? {}, payload.derived ?? {});
        renderProgress(payload.derived ?? {});
        renderCurrentNodeDetail(payload.derived ?? {});
        renderTimeline(payload.timeline_feed ?? {});
        renderFlow(payload.flow_snapshot ?? {});
        fitDashboardToViewport();
      }

      refresh().catch((error) => {
        const text = '<p class="empty">Failed to load visibility payload: ' + escapeHtml(error.message) + '</p>';
        document.getElementById("hero-root").innerHTML = text;
        document.getElementById("status-root").innerHTML = text;
        document.getElementById("overview-root").innerHTML = text;
        document.getElementById("node-root").innerHTML = text;
        document.getElementById("timeline-root").innerHTML = text;
        document.getElementById("flow-root").innerHTML = text;
        fitDashboardToViewport();
      });
      window.addEventListener("resize", fitDashboardToViewport);
      setInterval(() => {
        refresh().catch(() => {});
      }, 30000);
    </script>
  </body>
</html>`;
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

export async function loadVisibilityViews(options) {
  const status = await readJsonView(options.statusInput, "status_card");
  const timeline = await readJsonView(options.timelineInput, "timeline_feed");
  const flow = await readJsonView(options.flowInput, "flow_snapshot");
  const flowSnapshot = {
    ...flow.payload,
    ordered_nodes: deriveFlowSteps(flow.payload)
  };
  const flowMetrics = deriveFlowMetrics(flowSnapshot);
  const timelineMetrics = deriveTimelineMetrics(timeline.payload);
  const currentNodeDetail = deriveCurrentNodeDetail(flowSnapshot, flowMetrics);
  const narrative = deriveNarrative(status.payload, flowMetrics, timelineMetrics);
  const cadenceSummary = deriveCadenceSummary(status.payload);
  const mission = options.missionInput
    ? await readJsonView(options.missionInput, "mission_control")
    : {
        path: null,
        payload: deriveMissionControlFallback(status.payload, timeline.payload, flowSnapshot, {
          current_node_detail: currentNodeDetail,
          narrative
        })
      };
  const progress = options.progressInput
    ? await readJsonView(options.progressInput, "operator_progress")
    : {
        path: null,
        payload: deriveOperatorProgressFallback(status.payload, timeline.payload, mission.payload)
      };
  const tree = options.treeInput
    ? await readJsonView(options.treeInput, "tree_position")
    : {
        path: null,
        payload: deriveTreePositionFallback(mission.payload)
      };
  const evidence = options.evidenceInput
    ? await readJsonView(options.evidenceInput, "evidence_drill_down")
    : {
        path: null,
        payload: deriveEvidenceDrillDownFallback(mission.payload)
      };

  return {
    status_card: status.payload,
    timeline_feed: timeline.payload,
    flow_snapshot: flowSnapshot,
    mission_control: mission.payload,
    operator_progress: progress.payload,
    tree_position: tree.payload,
    evidence_drill_down: evidence.payload,
    derived: {
      flow_metrics: flowMetrics,
      timeline_metrics: timelineMetrics,
      current_node_detail: currentNodeDetail,
      narrative,
      cadence_summary: cadenceSummary,
      mission_control: mission.payload,
      operator_progress: progress.payload,
      tree_position: tree.payload,
      evidence_drill_down: evidence.payload
    },
    sources: {
      status_input: status.path,
      timeline_input: timeline.path,
      flow_input: flow.path,
      mission_input: mission.path,
      progress_input: progress.path,
      tree_input: tree.path,
      evidence_input: evidence.path
    }
  };
}

export async function visibilityServeCommand(options, runtimeOptions = {}) {
  if (!options.statusInput || !options.timelineInput || !options.flowInput) {
    throw new Error("Missing --status-input, --timeline-input, or --flow-input for `visibility-serve`.");
  }

  const host = options.host || "127.0.0.1";
  const requestedPort = options.port ?? 4174;
  const title = options.title || "AOF Visibility Viewer";
  await loadVisibilityViews(options);

  const html = buildVisibilityPageHtml(title);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${host}:${requestedPort}`);
      if (url.pathname === "/") {
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        });
        res.end(html);
        return;
      }

      if (url.pathname === "/api/views") {
        const views = await loadVisibilityViews(options);
        writeJson(res, 200, views);
        return;
      }

      if (url.pathname === "/api/health") {
        writeJson(res, 200, { ok: true });
        return;
      }

      writeJson(res, 404, { error: "Not Found" });
    } catch (error) {
      writeJson(res, 500, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(requestedPort, host, () => resolve());
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : requestedPort;
  const close = () => new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  if (runtimeOptions.installSignalHandlers !== false) {
    const shutdown = async () => {
      server.removeAllListeners("error");
      await close().catch(() => {});
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  }

  return {
    ok: true,
    host,
    port,
    title,
    url: `http://${host}:${port}`,
    sources: {
      statusInput: path.resolve(options.statusInput),
      timelineInput: path.resolve(options.timelineInput),
      flowInput: path.resolve(options.flowInput),
      missionInput: options.missionInput ? path.resolve(options.missionInput) : null,
      progressInput: options.progressInput ? path.resolve(options.progressInput) : null,
      treeInput: options.treeInput ? path.resolve(options.treeInput) : null,
      evidenceInput: options.evidenceInput ? path.resolve(options.evidenceInput) : null
    },
    close
  };
}
