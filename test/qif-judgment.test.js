import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { qifJudgmentRecordCommand, verifyQifJudgmentDigests } from "../src/commands/qif-judgment-record.js";

async function createJudgmentFixtureRoot() {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-qif-"));
  await fs.writeFile(path.join(projectRoot, "subject.md"), "# Subject artifact\n");
  await fs.writeFile(path.join(projectRoot, "evidence-a.md"), "evidence a\n");
  await fs.writeFile(path.join(projectRoot, "evidence-b.md"), "evidence b\n");
  return projectRoot;
}

function baseOptions(projectRoot) {
  return {
    project: projectRoot,
    subjectRef: "subject.md",
    producedByRef: "builder",
    judgedByRef: "guardian",
    qualityIntent: "The subject must state a verifiable claim, not an activity report.",
    risk: "A false pass lets an unverified claim reach release state.",
    lossBoundary: "Release claims drift from runtime truth and operator trust is lost.",
    evidenceRefs: ["evidence-a.md", "evidence-b.md"],
    verdict: "pass",
    confidence: 0.8,
    uncertaintyNote: "Evidence covers structure, not external adoption.",
    sourceTaskId: "TASK-056"
  };
}

test("qifJudgmentRecordCommand records an independent pass with content digests", async () => {
  const projectRoot = await createJudgmentFixtureRoot();
  const result = await qifJudgmentRecordCommand(baseOptions(projectRoot));

  assert.equal(result.ok, true);
  assert.equal(result.payload.artifact_type, "qif-judgment");
  assert.equal(result.payload.self_judgment, false);
  assert.match(result.payload.subject_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(result.payload.evidence.length, 2);
  for (const entry of result.payload.evidence) {
    assert.match(entry.evidence_digest, /^sha256:[0-9a-f]{64}$/);
  }

  const stored = JSON.parse(await fs.readFile(result.artifactPath, "utf8"));
  assert.equal(stored.judgment_id, result.judgmentId);
  const digestCheck = await verifyQifJudgmentDigests(projectRoot, stored);
  assert.equal(digestCheck.ok, true);
});

test("qifJudgmentRecordCommand rejects a self-judged pass verdict", async () => {
  const projectRoot = await createJudgmentFixtureRoot();
  await assert.rejects(
    qifJudgmentRecordCommand({
      ...baseOptions(projectRoot),
      judgedByRef: "builder"
    }),
    /cannot record verdict 'pass'/
  );
});

test("qifJudgmentRecordCommand allows self-judged conditional-pass only with a governance trigger", async () => {
  const projectRoot = await createJudgmentFixtureRoot();
  await assert.rejects(
    qifJudgmentRecordCommand({
      ...baseOptions(projectRoot),
      judgedByRef: "builder",
      verdict: "conditional-pass"
    }),
    /governance/
  );

  const result = await qifJudgmentRecordCommand({
    ...baseOptions(projectRoot),
    judgedByRef: "builder",
    verdict: "conditional-pass",
    governanceTriggerCondition: "self_judgment is true",
    governanceRequiredAction: "route to independent guardian review before release claim"
  });
  assert.equal(result.payload.self_judgment, true);
  assert.equal(result.payload.verdict, "conditional-pass");
  assert.equal(result.payload.governance_trigger.trigger_condition, "self_judgment is true");
});

test("qifJudgmentRecordCommand rejects missing evidence and missing evidence files", async () => {
  const projectRoot = await createJudgmentFixtureRoot();
  await assert.rejects(
    qifJudgmentRecordCommand({
      ...baseOptions(projectRoot),
      evidenceRefs: []
    }),
    /At least one --evidence-ref/
  );

  await assert.rejects(
    qifJudgmentRecordCommand({
      ...baseOptions(projectRoot),
      evidenceRefs: ["missing-evidence.md"]
    }),
    /does not exist/
  );
});

test("verifyQifJudgmentDigests detects post-judgment tampering of the subject", async () => {
  const projectRoot = await createJudgmentFixtureRoot();
  const result = await qifJudgmentRecordCommand(baseOptions(projectRoot));

  await fs.writeFile(path.join(projectRoot, "subject.md"), "# Subject artifact edited after judgment\n");
  const digestCheck = await verifyQifJudgmentDigests(projectRoot, result.payload);
  assert.equal(digestCheck.ok, false);
  assert.equal(digestCheck.mismatches.length, 1);
  assert.equal(digestCheck.mismatches[0].ref, "subject.md");
});

test("qifJudgmentRecordCommand rejects out-of-range confidence and unknown verdicts", async () => {
  const projectRoot = await createJudgmentFixtureRoot();
  await assert.rejects(
    qifJudgmentRecordCommand({
      ...baseOptions(projectRoot),
      confidence: 1.5
    }),
    /between 0 and 1/
  );
  await assert.rejects(
    qifJudgmentRecordCommand({
      ...baseOptions(projectRoot),
      verdict: "looks-good"
    }),
    /--verdict must be one of/
  );
});
