import path from "node:path";

import { operatorBriefCommand } from "./operator-brief.js";
import { evidenceDrillDownCommand } from "./evidence-drill-down.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { writeJsonArtifact } from "../runtime/utils.js";

function result(status, detail, evidence = []) {
  return { status, detail, evidence };
}

function pass(detail, evidence = []) {
  return result("pass", detail, evidence);
}

function fail(detail, evidence = []) {
  return result("fail", detail, evidence);
}

export async function evidenceDrillDownBenchmarkCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const artifactPath = options.artifactPath ? path.resolve(options.artifactPath) : null;

  const [briefResult, drillDownResult] = await Promise.all([
    operatorBriefCommand({ project: projectRoot }),
    evidenceDrillDownCommand({ project: projectRoot })
  ]);

  const brief = briefResult.brief;
  const drillDown = drillDownResult.drillDown;
  const headlineRefs = drillDown.answer_to_proof.headline.evidence_refs;
  const blockerRefs = drillDown.answer_to_proof.blockers.evidence_refs;
  const nextActionRefs = drillDown.answer_to_proof.next_action.evidence_refs;

  const benchmarks = {
    "ED-001": headlineRefs.length > 0
      ? pass("Headline proof path is present.", headlineRefs)
      : fail("Headline proof path is missing.", []),
    "ED-002": blockerRefs.length > 0
      ? pass("Blocker proof path is present.", blockerRefs)
      : fail("Blocker proof path is missing.", []),
    "ED-003": nextActionRefs.length > 0
      ? pass("Next-action proof path is present.", nextActionRefs)
      : fail("Next-action proof path is missing.", []),
    "ED-004": brief.current_state.primary_frontier_task?.task_id === drillDown.current_state.primary_frontier_task?.task_id
      ? pass(
          "Evidence drill-down follows the same live frontier as the operator brief.",
          [brief.current_state.primary_frontier_task?.artifact_ref ?? null].filter(Boolean)
        )
      : fail("Evidence drill-down is pointing at a different frontier than the operator brief.", []),
    "ED-005": !headlineRefs.some((ref) => /v3\.8-release-definition\.md/.test(ref))
      || drillDown.current_state.release_version === "3.8.0"
      ? pass("Drill-down proof remains aligned to the current release basis and does not drift independently.", headlineRefs)
      : fail("Drill-down proof appears to rely on a stale release basis.", headlineRefs)
  };

  const summary = {
    artifact_type: "evidence-drill-down-benchmark",
    generated_at: drillDown.generated_at,
    project_root: projectRoot,
    release_version: drillDown.current_state.release_version,
    frontier_task_id: drillDown.current_state.primary_frontier_task?.task_id ?? null,
    benchmarks
  };
  await validateWithBundledSchema(summary, "aof-evidence-drill-down-benchmark.schema.json", "evidence drill-down benchmark");

  let writtenArtifactPath = null;
  if (artifactPath) {
    writtenArtifactPath = await writeJsonArtifact(artifactPath, summary);
  }

  return {
    ok: true,
    artifactPath: writtenArtifactPath,
    summary
  };
}
