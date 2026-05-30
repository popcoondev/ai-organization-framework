import path from "node:path";
import { nowIso, writeJsonArtifact, writeTextArtifact } from "../runtime/utils.js";
import { readJson, resolveBundlePath } from "./verify-history.js";

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }
  return String(value);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildLayerSnapshots(historyArtifact, logArtifact, indexArtifact) {
  return {
    history: {
      latest_action: historyArtifact.summary?.recommendation?.latest_action ?? null,
      latest_urgency: historyArtifact.summary?.recommendation?.latest_urgency ?? null,
      latest_transition: historyArtifact.summary?.recommendation?.latest_transition ?? null,
      distinct_actions: historyArtifact.summary?.recommendation?.distinct_actions ?? []
    },
    log: {
      latest_action: logArtifact.operator_recommendation?.action ?? null,
      latest_urgency: logArtifact.operator_recommendation?.urgency ?? null,
      latest_transition: logArtifact.recommendation_trend?.latest_transition ?? null,
      distinct_actions: unique((logArtifact.recommendation_trend?.timeline ?? []).map((item) => item.action))
    },
    index: {
      latest_action: indexArtifact.operator_recommendation?.action ?? null,
      latest_urgency: indexArtifact.operator_recommendation?.urgency ?? null,
      latest_transition: indexArtifact.recommendation_summary?.latest_transition ?? null,
      previous_action: indexArtifact.recommendation_summary?.previous_action ?? null
    }
  };
}

function buildLineageTimeline(historyArtifact, logArtifact, indexArtifact) {
  const historyTimeline = (historyArtifact.summary?.recommendation?.timeline ?? []).map((item) => ({
    layer: "history",
    generated_at: item.generated_at ?? null,
    action: item.action ?? null,
    urgency: item.urgency ?? null
  }));
  const logTimeline = (logArtifact.recommendation_trend?.timeline ?? []).map((item) => ({
    layer: "log",
    generated_at: item.source_generated_at ?? null,
    action: item.action ?? null,
    urgency: item.urgency ?? null
  }));
  const indexTimeline = [{
    layer: "index",
    generated_at: indexArtifact.recommendation_summary?.latest_generated_at ?? null,
    action: indexArtifact.recommendation_summary?.latest_action ?? null,
    urgency: indexArtifact.recommendation_summary?.latest_urgency ?? null
  }];

  return [...historyTimeline, ...logTimeline, ...indexTimeline].filter((item) => item.action);
}

function buildLineageSummary(historyArtifact, logArtifact, indexArtifact, layerSnapshots, timeline) {
  return {
    current_action: indexArtifact.operator_recommendation?.action ?? null,
    current_urgency: indexArtifact.operator_recommendation?.urgency ?? null,
    current_transition: indexArtifact.recommendation_summary?.latest_transition ?? null,
    history_transition: historyArtifact.summary?.recommendation?.latest_transition ?? null,
    log_transition: logArtifact.recommendation_trend?.latest_transition ?? null,
    distinct_actions: unique([
      ...(historyArtifact.summary?.recommendation?.distinct_actions ?? []),
      ...(logArtifact.recommendation_trend?.timeline ?? []).map((item) => item.action),
      indexArtifact.recommendation_summary?.latest_action ?? null,
      indexArtifact.recommendation_summary?.previous_action ?? null
    ]),
    distinct_urgencies: unique([
      ...(historyArtifact.summary?.recommendation?.distinct_urgencies ?? []),
      ...(logArtifact.recommendation_trend?.timeline ?? []).map((item) => item.urgency),
      indexArtifact.recommendation_summary?.latest_urgency ?? null,
      indexArtifact.recommendation_summary?.previous_urgency ?? null
    ]),
    layer_snapshots: layerSnapshots,
    timeline_entry_count: timeline.length
  };
}

function formatLineageReport(lineage) {
  const lines = [
    "# Verification Recommendation Lineage Report",
    "",
    `- generated at: ${formatValue(lineage.generated_at)}`,
    `- current action: ${formatValue(lineage.summary?.current_action)}`,
    `- current urgency: ${formatValue(lineage.summary?.current_urgency)}`,
    `- current transition: ${formatValue(lineage.summary?.current_transition)}`,
    `- history transition: ${formatValue(lineage.summary?.history_transition)}`,
    `- log transition: ${formatValue(lineage.summary?.log_transition)}`,
    `- distinct actions: ${formatValue(lineage.summary?.distinct_actions)}`,
    `- distinct urgencies: ${formatValue(lineage.summary?.distinct_urgencies)}`,
    ""
  ];

  lines.push("## Layer Snapshots");
  for (const [layer, snapshot] of Object.entries(lineage.summary?.layer_snapshots ?? {})) {
    lines.push(`- ${layer}: action=${formatValue(snapshot.latest_action)}, urgency=${formatValue(snapshot.latest_urgency)}, transition=${formatValue(snapshot.latest_transition)}, distinct_actions=${formatValue(snapshot.distinct_actions)}, previous_action=${formatValue(snapshot.previous_action)}`);
  }
  lines.push("");

  lines.push("## Timeline");
  for (const item of lineage.timeline ?? []) {
    lines.push(`- ${item.layer}: generated_at=${formatValue(item.generated_at)}, action=${formatValue(item.action)}, urgency=${formatValue(item.urgency)}`);
  }
  lines.push("");

  lines.push("## Sources");
  lines.push(`- history: ${formatValue(lineage.sources?.history)}`);
  lines.push(`- log: ${formatValue(lineage.sources?.log)}`);
  lines.push(`- index: ${formatValue(lineage.sources?.index)}`);
  lines.push("");

  return lines.join("\n");
}

export async function verifyLineageCommand(options) {
  if (!options.historyInput || !options.logInput || !options.indexInput) {
    throw new Error("Missing --history-input, --log-input, or --index-input for `verify-lineage`.");
  }
  if (!options.artifactDir) {
    throw new Error("Missing --artifact-dir for `verify-lineage`.");
  }

  const artifactDir = path.resolve(options.artifactDir);
  const historyPath = await resolveBundlePath(options.historyInput).catch(() => path.resolve(options.historyInput));
  const logPath = await resolveBundlePath(options.logInput).catch(() => path.resolve(options.logInput));
  const indexPath = await resolveBundlePath(options.indexInput).catch(() => path.resolve(options.indexInput));

  const historyArtifact = await readJson(historyPath, "verification history artifact");
  const logArtifact = await readJson(logPath, "verification log artifact");
  const indexArtifact = await readJson(indexPath, "verification index artifact");

  const layerSnapshots = buildLayerSnapshots(historyArtifact, logArtifact, indexArtifact);
  const timeline = buildLineageTimeline(historyArtifact, logArtifact, indexArtifact);
  const summary = buildLineageSummary(historyArtifact, logArtifact, indexArtifact, layerSnapshots, timeline);

  const lineage = {
    artifact_type: "verification-lineage",
    generated_at: nowIso(),
    sources: {
      history: historyPath,
      log: logPath,
      index: indexPath
    },
    summary,
    timeline
  };

  const lineageJsonPath = await writeJsonArtifact(path.join(artifactDir, "verification-lineage.json"), lineage);
  const lineageReportPath = await writeTextArtifact(path.join(artifactDir, "verification-lineage.md"), formatLineageReport(lineage));

  return {
    ok: true,
    status: "completed",
    artifactDir,
    lineageJsonPath,
    lineageReportPath,
    currentAction: summary.current_action,
    currentTransition: summary.current_transition,
    distinctActions: summary.distinct_actions
  };
}
