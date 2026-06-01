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
        --good: #245c3f;
        --warn: #8a5b00;
        --bad: #8e2f2f;
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
        grid-template-columns: 280px repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      main {
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(300px, 360px) minmax(320px, 1fr) minmax(260px, 340px);
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
        padding-left: 10px;
        border-left: 2px solid var(--line);
      }
      .timeline-entry .meta {
        color: var(--muted);
        font-size: 13px;
        margin-bottom: 4px;
      }
      .timeline-entry .summary {
        font-weight: 600;
        margin-bottom: 4px;
      }
      .timeline-entry .detail {
        margin: 4px 0 0;
        color: var(--ink);
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
        background: #eef6f8;
      }
      .flow-step.done {
        background: #f4f8f5;
      }
      .flow-step .name {
        font-weight: 600;
      }
      .flow-step .state {
        color: var(--muted);
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
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
        background: #eef6f8;
      }
      .node-step.done {
        background: #f4f8f5;
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
      .arrow {
        margin: -4px 0 -2px 12px;
        color: var(--muted);
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
      <p>Human Visibility Layer viewer for status, timeline, and flow.</p>
    </header>
    <div class="dashboard">
    <section class="hero">
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
        <div class="label">Current Step</div>
        <div class="value" id="metric-step">-</div>
      </div>
      <div class="metric">
        <div class="label">Completed</div>
        <div class="value" id="metric-completed">-</div>
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
        <h2>Now</h2>
        <div class="card-body tight-stack">
          <div id="status-root"></div>
          <div id="overview-root" class="overview-grid"></div>
        </div>
      </section>
      <section class="panel">
        <h2>Current Node Detail</h2>
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

      function renderStatus(status) {
        const root = document.getElementById("status-root");
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
          </dl>
        \`;
      }

      function renderOverview(status, derived) {
        const root = document.getElementById("overview-root");
        const narrative = derived?.narrative ?? {};
        const flowMetrics = derived?.flow_metrics ?? {};
        const currentNode = derived?.current_node_detail ?? {};
        root.innerHTML = \`
          <div class="overview-card">
            <div class="label">Current Node</div>
            <div class="value">\${escapeHtml(currentNode.node_label ?? narrative.current_position?.current_step_label ?? "-")}</div>
          </div>
          <div class="overview-card">
            <div class="label">Current Substep</div>
            <div class="value">\${escapeHtml(currentNode.current_substep_label ?? "-")}</div>
          </div>
          <div class="overview-card">
            <div class="label">Next Action</div>
            <div class="value">\${escapeHtml(narrative.next_action?.checkpoint ?? "-")}</div>
          </div>
          <div class="overview-card">
            <div class="label">Open Signals</div>
            <div class="value">\${escapeHtml(formatArray(status.open_signals))}</div>
          </div>
          <div class="overview-card">
            <div class="label">Remaining Steps</div>
            <div class="value">\${escapeHtml(String(narrative.remaining_work?.remaining_steps_after_current ?? "-"))}</div>
          </div>
          <div class="overview-card">
            <div class="label">Substep Progress</div>
            <div class="value">\${escapeHtml(currentNode.substep_progress ?? "-")}</div>
          </div>
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
        document.getElementById("metric-step").textContent = narrative.current_position?.step_progress ?? "-";
        document.getElementById("metric-completed").textContent = String(flowMetrics.completed_steps ?? "-");
        document.getElementById("metric-remaining").textContent = String(narrative.remaining_work?.remaining_steps_after_current ?? "-");
        document.getElementById("metric-next").textContent = narrative.next_action?.immediate_next_step ?? "-";
      }

      function renderCurrentNodeDetail(derived) {
        const root = document.getElementById("node-root");
        const currentNode = derived?.current_node_detail ?? {};
        const substeps = Array.isArray(currentNode.substeps) ? currentNode.substeps : [];
        const branches = Array.isArray(currentNode.branches) ? currentNode.branches : [];
        const loopbacks = Array.isArray(currentNode.loopbacks) ? currentNode.loopbacks : [];

        const substepHtml = substeps.length > 0
          ? '<div class="tight-stack">' + substeps.map((step, index) =>
              '<div>' +
                '<div class="node-step ' + escapeHtml(step.state ?? "") + '">' +
                  '<span class="dot"></span>' +
                  '<div style="flex:1;">' +
                    '<div style="font-weight:600;">' + escapeHtml(step.label ?? step.id ?? ("step-" + (index + 1))) + '</div>' +
                    '<div class="sources">' + escapeHtml(step.note ?? step.id ?? "-") + '</div>' +
                  '</div>' +
                  '<div class="state">' + escapeHtml(step.state ?? "-") + '</div>' +
                '</div>' +
                (index < substeps.length - 1 ? '<div class="arrow">→</div>' : '') +
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
          '</div>';
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
            <div class="meta">\${escapeHtml(entry.at ?? "-")} · \${escapeHtml(entry.actor ?? "-")} · \${escapeHtml(entry.event_type ?? "-")}</div>
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
              <div class="state">\${escapeHtml(node.state ?? "-")}</div>
            </div>
            \${index < steps.length - 1 ? '<div class="arrow">↓</div>' : ""}
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
      }, 3000);
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

  return {
    status_card: status.payload,
    timeline_feed: timeline.payload,
    flow_snapshot: flowSnapshot,
    derived: {
      flow_metrics: flowMetrics,
      timeline_metrics: timelineMetrics,
      current_node_detail: currentNodeDetail,
      narrative
    },
    sources: {
      status_input: status.path,
      timeline_input: timeline.path,
      flow_input: flow.path
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
      flowInput: path.resolve(options.flowInput)
    },
    close
  };
}
