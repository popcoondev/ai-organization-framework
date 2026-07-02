import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { makeId, nowIso, writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";

const VERDICTS = ["pass", "conditional-pass", "fail", "needs-evidence"];
const NON_PASS_VERDICTS = ["conditional-pass", "fail", "needs-evidence"];

export function resolveQifJudgmentsRoot(projectRoot) {
  return path.join(projectRoot, ".aof", "artifacts", "qif", "judgments");
}

async function digestFile(projectRoot, ref, label) {
  const absolutePath = path.isAbsolute(ref) ? ref : path.join(projectRoot, ref);
  let content;
  try {
    content = await fs.readFile(absolutePath);
  } catch {
    throw new Error(`${label} '${ref}' does not exist or is not readable, so it cannot be judged as evidence.`);
  }
  return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}

export async function verifyQifJudgmentDigests(projectRoot, judgment) {
  const mismatches = [];
  const subjectDigest = await digestFile(projectRoot, judgment.subject_ref, "qif judgment subject");
  if (subjectDigest !== judgment.subject_digest) {
    mismatches.push({
      ref: judgment.subject_ref,
      expected_digest: judgment.subject_digest,
      actual_digest: subjectDigest
    });
  }
  for (const entry of judgment.evidence) {
    const evidenceDigest = await digestFile(projectRoot, entry.evidence_ref, "qif judgment evidence");
    if (evidenceDigest !== entry.evidence_digest) {
      mismatches.push({
        ref: entry.evidence_ref,
        expected_digest: entry.evidence_digest,
        actual_digest: evidenceDigest
      });
    }
  }
  return {
    ok: mismatches.length === 0,
    mismatches
  };
}

export async function qifJudgmentRecordCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const judgmentId = options.judgmentId || makeId("QIF");

  if (!VERDICTS.includes(options.verdict)) {
    throw new Error(`--verdict must be one of: ${VERDICTS.join(", ")}.`);
  }

  const confidence = Number(options.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("--confidence must be a number between 0 and 1.");
  }

  const producedByRef = options.producedByRef;
  const judgedByRef = options.judgedByRef;
  const selfJudgment = producedByRef === judgedByRef;
  if (selfJudgment && options.verdict === "pass") {
    throw new Error(
      "A qif-judgment where judged_by_ref equals produced_by_ref cannot record verdict 'pass'. " +
        "Self-judgment is capped at 'conditional-pass' and must carry a governance_trigger that routes the final pass to an independent checker."
    );
  }

  const governanceTrigger = options.governanceTriggerCondition || options.governanceRequiredAction
    ? {
        trigger_condition: options.governanceTriggerCondition,
        required_action: options.governanceRequiredAction,
        escalation_ref: options.governanceEscalationRef || null
      }
    : null;
  if ((selfJudgment || NON_PASS_VERDICTS.includes(options.verdict)) && !governanceTrigger) {
    throw new Error(
      "A self-judged or non-pass qif-judgment requires --governance-trigger-condition and --governance-required-action, " +
        "so the judgment names who resolves it instead of ending with the producer's own verdict."
    );
  }

  const evidenceRefs = options.evidenceRefs ?? [];
  if (evidenceRefs.length === 0) {
    throw new Error("At least one --evidence-ref is required; a qif-judgment without evidence is an opinion, not a judgment.");
  }

  const subjectDigest = await digestFile(projectRoot, options.subjectRef, "qif judgment subject");
  const evidence = [];
  for (const evidenceRef of evidenceRefs) {
    evidence.push({
      evidence_ref: evidenceRef,
      evidence_digest: await digestFile(projectRoot, evidenceRef, "qif judgment evidence"),
      evidence_role: null
    });
  }

  const payload = {
    artifact_type: "qif-judgment",
    recorded_at: nowIso(),
    judgment_id: judgmentId,
    subject_ref: options.subjectRef,
    subject_digest: subjectDigest,
    produced_by_ref: producedByRef,
    judged_by_ref: judgedByRef,
    self_judgment: selfJudgment,
    quality_intent: options.qualityIntent,
    risk: options.risk,
    loss_boundary: options.lossBoundary,
    evidence,
    verdict: options.verdict,
    confidence,
    uncertainty_note: options.uncertaintyNote,
    governance_trigger: governanceTrigger,
    source_task_id: options.sourceTaskId || null,
    source_parent_session_id: options.sourceParentSessionId || null,
    source_decision_record_id: options.sourceDecisionRecordId || null
  };

  await validateWithBundledSchema(payload, "aof-qif-judgment.schema.json", "qif judgment");
  const artifactPath = await writeJsonArtifact(
    options.artifactPath || path.join(resolveQifJudgmentsRoot(projectRoot), `${judgmentId}.json`),
    payload
  );

  return {
    ok: true,
    projectRoot,
    artifactPath,
    judgmentId,
    payload
  };
}
