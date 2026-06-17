import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import * as discoveryRoots from "./discovery-artifact-helpers.js";

export async function problemStatementRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const problemStatementId = options.problemStatementId || makeId("PST");
  const payload = {
    artifact_type: "problem-statement",
    recorded_at: nowIso(),
    problem_statement_id: problemStatementId,
    affected_party: options.affectedParty,
    actual_problem: options.actualProblem,
    why_it_matters: options.whyItMatters,
    why_now: options.whyNow,
    evidence_refs: options.evidenceRefs ?? [],
    source_task_id: options.sourceTaskId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-problem-statement.schema.json", "problem statement");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(discoveryRoots.resolveProblemStatementsRoot(projectRoot), `${problemStatementId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    problemStatementId,
    payload
  };
}
