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
      body {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", serif;
        background: linear-gradient(180deg, #f8f6f0 0%, var(--bg) 100%);
        color: var(--ink);
      }
      header {
        padding: 24px 28px 12px;
        border-bottom: 1px solid var(--line);
        background: rgba(255,253,247,0.92);
        position: sticky;
        top: 0;
        backdrop-filter: blur(12px);
        z-index: 1;
      }
      header h1 { margin: 0 0 6px; font-size: 28px; }
      header p { margin: 0; color: var(--muted); }
      main {
        display: grid;
        grid-template-columns: minmax(260px, 340px) 1fr;
        gap: 20px;
        padding: 20px 24px 28px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        box-shadow: 0 12px 30px rgba(54, 44, 34, 0.06);
      }
      .panel h2 {
        margin: 0;
        padding: 18px 18px 0;
        font-size: 18px;
      }
      .card-body, .timeline-body, .flow-body {
        padding: 16px 18px 18px;
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
        font-size: 15px;
        line-height: 1.45;
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
        gap: 14px;
      }
      .timeline-entry {
        padding-left: 14px;
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
        gap: 12px;
      }
      .flow-step {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 14px 16px;
        border-radius: 14px;
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
      .arrow {
        margin: -4px 0 -2px 12px;
        color: var(--muted);
      }
      .empty {
        color: var(--muted);
        font-style: italic;
      }
      .sources {
        margin-top: 14px;
        color: var(--muted);
        font-size: 13px;
      }
      @media (max-width: 860px) {
        main { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>${escapeHtml(title)}</h1>
      <p>Human Visibility Layer viewer for status, timeline, and flow.</p>
    </header>
    <main>
      <section class="panel">
        <h2>Status</h2>
        <div class="card-body" id="status-root"></div>
      </section>
      <section style="display:grid; gap:20px;">
        <section class="panel">
          <h2>Timeline</h2>
          <div class="timeline-body" id="timeline-root"></div>
        </section>
        <section class="panel">
          <h2>Flow</h2>
          <div class="flow-body" id="flow-root"></div>
        </section>
      </section>
    </main>
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

      function renderTimeline(timeline) {
        const root = document.getElementById("timeline-root");
        if (!Array.isArray(timeline.entries) || timeline.entries.length === 0) {
          root.innerHTML = '<p class="empty">No timeline entries available.</p>';
          return;
        }
        root.innerHTML = '<ol class="timeline-list">' + timeline.entries.map((entry) => \`
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

      async function refresh() {
        const response = await fetch("/api/views", { cache: "no-store" });
        const payload = await response.json();
        renderStatus(payload.status_card ?? {});
        renderTimeline(payload.timeline_feed ?? {});
        renderFlow(payload.flow_snapshot ?? {});
      }

      refresh().catch((error) => {
        const text = '<p class="empty">Failed to load visibility payload: ' + escapeHtml(error.message) + '</p>';
        document.getElementById("status-root").innerHTML = text;
        document.getElementById("timeline-root").innerHTML = text;
        document.getElementById("flow-root").innerHTML = text;
      });
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

  return {
    status_card: status.payload,
    timeline_feed: timeline.payload,
    flow_snapshot: {
      ...flow.payload,
      ordered_nodes: deriveFlowSteps(flow.payload)
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
