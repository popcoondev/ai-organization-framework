import path from "node:path";

import { resolveBreakthroughPatternsRoot } from "./discovery-artifact-helpers.js";
import { listJsonFiles, readJson } from "./operator-surface-helpers.js";

function summarizeBySourceDomain(records) {
  const counts = new Map();
  for (const record of records) {
    const domain = record.source_domain ?? "unknown";
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source_domain, pattern_count]) => ({ source_domain, pattern_count }))
    .sort((left, right) => right.pattern_count - left.pattern_count || left.source_domain.localeCompare(right.source_domain));
}

export async function breakthroughLibraryRegisterCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const root = resolveBreakthroughPatternsRoot(projectRoot);
  const jsonPaths = await listJsonFiles(root);

  const patterns = await Promise.all(
    jsonPaths.map(async (jsonPath) => {
      const record = await readJson(jsonPath, `breakthrough pattern ${path.basename(jsonPath)}`);
      return {
        pattern_id: record.pattern_id ?? path.basename(jsonPath, ".json"),
        source_domain: record.source_domain ?? null,
        triggering_tension: record.triggering_tension ?? null,
        transfer_hypothesis: record.transfer_hypothesis ?? null,
        expected_relevance: record.expected_relevance ?? null,
        evidence_ref_count: Array.isArray(record.evidence_refs) ? record.evidence_refs.length : 0,
        source_task_id: record.source_task_id ?? null,
        notes_present: typeof record.notes === "string" && record.notes.length > 0,
        recorded_at: record.recorded_at ?? null,
        json_path: path.relative(projectRoot, jsonPath)
      };
    })
  );

  patterns.sort((left, right) => {
    const rightAt = right.recorded_at ?? "";
    const leftAt = left.recorded_at ?? "";
    return rightAt.localeCompare(leftAt);
  });

  return {
    ok: true,
    projectRoot,
    pattern_count: patterns.length,
    domain_summary: summarizeBySourceDomain(patterns),
    patterns
  };
}
