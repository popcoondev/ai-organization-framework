import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { alternativeAnalysisRecordCommand } from "./alternative-analysis-record.js";
import { anomalyLogRecordCommand } from "./anomaly-log-record.js";
import { assumptionMapRecordCommand } from "./assumption-map-record.js";
import { discoveryHandoffRecordCommand } from "./discovery-handoff-record.js";
import { discoveryJudgmentPacketCommand } from "./discovery-judgment-packet.js";
import { discoveryQuestionSetRecordCommand } from "./discovery-question-set-record.js";
import { initProjectCommand } from "./init-project.js";
import { needValidationRecordCommand } from "./need-validation-record.js";
import { problemStatementRecordCommand } from "./problem-statement-record.js";
import { projectCharterRecordCommand } from "./project-charter-record.js";
import { taskOpenCommand } from "./task-open.js";
import { valueHypothesisRecordCommand } from "./value-hypothesis-record.js";
import { writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { visibilityExportCommand } from "./visibility-export.js";

function pass(detail, evidence = []) {
  return { status: "pass", detail, evidence };
}

function fail(detail, evidence = []) {
  return { status: "fail", detail, evidence };
}

async function createBenchmarkProject() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aof-mission-control-benchmark-"));
  const projectRoot = path.join(tempRoot, "project");
  await fs.mkdir(projectRoot, { recursive: true });
  await initProjectCommand({
    project: projectRoot,
    topology: "managed-project",
    projectType: "web-app",
    domainSummary: "Mission Control benchmark fixture",
    installMode: "runtime-on"
  });
  return { tempRoot, projectRoot };
}

async function captureMissionSnapshot(projectRoot, label) {
  const exportResult = await visibilityExportCommand({ project: projectRoot });
  const mission = exportResult.payloads.mission_control;
  return {
    label,
    stage: mission.mission_overview.current_runtime_stage,
    step: mission.runtime_position.current_step_label ?? null,
    blockers: Array.isArray(mission.blockers) ? mission.blockers.length : 0,
    next: mission.next_action.recommended_action,
    anchor: mission.mission_overview.chain_anchor_ref ?? null
  };
}

async function createDiscoveryHandoff(projectRoot, sourceTaskId) {
  const questionSet = await discoveryQuestionSetRecordCommand({
    project: projectRoot,
    discoveryObjective: "Define the next Mission Control release slice",
    keyQuestions: ["Which runtime state must be visible without reading raw JSON?"],
    targetUserOrMarketSlice: "AOF operators",
    targetAssumptions: ["Mission Control must show lineage, blockers, and next action together."],
    targetAnomalies: ["Operator must manually reconstruct the chain today."],
    signals: ["handoff when the upstream evidence is explicit"],
    sourceTaskId
  });
  const assumptionMap = await assumptionMapRecordCommand({
    project: projectRoot,
    subject: "Mission Control visibility direction",
    assumptions: [{
      assumption: "A bounded visibility layer is enough for the next release.",
      assumption_type: "technology",
      confidence: 0.7,
      evidence_state: "moderate",
      break_test_question: "Can Mission Control show truthful stage changes from real artifacts?"
    }],
    sourceTaskId
  });
  const anomalyLog = await anomalyLogRecordCommand({
    project: projectRoot,
    subject: "Mission Control visibility direction",
    anomalies: [{
      observed_anomaly: "Operators can see status but not lineage or next action in one place.",
      why_it_matters: "The runtime remains inspectable only by reading multiple artifacts manually.",
      challenged_assumption: "Existing visibility views are enough for runtime truthfulness.",
      follow_up_recommendation: "Promote a bounded Mission Control slice."
    }],
    sourceTaskId
  });
  await discoveryJudgmentPacketCommand({
    project: projectRoot,
    councilId: "discovery-council",
    judgmentStatus: "synthesize-handoff",
    decisionSummary: "The Mission Control slice is narrow enough to hand off.",
    rationale: "The visibility gap is specific and artifact-backed.",
    desirabilityAssessment: "Operators need a single truthful surface.",
    feasibilityAssessment: "The runtime already emits most source artifacts.",
    riskAssessment: "Keep Mission Control bounded to observation rather than autonomy claims.",
    evidenceQualityState: "sufficient",
    recommendedNextStep: "Create a discovery handoff and run Need Validation.",
    questionSetRefs: [path.relative(projectRoot, questionSet.artifactPath).replaceAll("\\", "/")],
    artifactRefs: [
      path.relative(projectRoot, assumptionMap.artifactPath).replaceAll("\\", "/"),
      path.relative(projectRoot, anomalyLog.artifactPath).replaceAll("\\", "/")
    ],
    promotionReady: true,
    handoffRequired: true,
    sourceTaskId
  });

  return discoveryHandoffRecordCommand({
    project: projectRoot,
    selectedNeed: "Make Mission Control show truthful runtime progress",
    intendedUserOrSegment: "AOF operators",
    contextSummary: "Visibility exists, but stage lineage and next action still require manual reconstruction.",
    hypothesis: "A bounded Mission Control layer will reduce operator reconstruction cost.",
    evidenceRefs: ["docs/v3.6-direction-runtime-review.md"],
    rejectedAlternatives: ["Expand runtime autonomy before improving visibility"],
    explicitRisks: ["Mission Control could overclaim if it stops reflecting raw artifacts"],
    deliveryValidationRequirements: ["Need Validation remains the approval boundary"],
    need: "Show runtime stage, blockers, and next action from one bounded surface",
    intent: "Promote Mission Control into a release-grade visibility contract",
    context: "AOF is self-hosting and must remain truthful about artifact lineage",
    sourceTaskId
  });
}

async function createNeedValidationChain(projectRoot, discoveryHandoffRef, sourceTaskId) {
  const problem = await problemStatementRecordCommand({
    project: projectRoot,
    affectedParty: "AOF operators",
    actualProblem: "Mission Control does not yet show truthful runtime transitions from one bounded view.",
    whyItMatters: "Operators must reconstruct stage lineage manually.",
    whyNow: "The visibility layer is becoming release-grade.",
    evidenceRefs: ["docs/v3.6-direction-runtime-review.md"],
    sourceTaskId
  });
  const value = await valueHypothesisRecordCommand({
    project: projectRoot,
    expectedValueCreation: "Faster and more reliable operator understanding of runtime state.",
    beneficiary: "AOF operators",
    supportingEvidence: ["Discovery and runtime review both identified the same visibility gap."],
    successCriteria: ["Mission Control shows truthful stage transitions"],
    sourceTaskId
  });
  const alternatives = await alternativeAnalysisRecordCommand({
    project: projectRoot,
    subjectNeed: "Improve Mission Control visibility",
    alternativeSolutions: ["Add a bounded Mission Control layer backed by runtime artifacts"],
    stopOptions: ["Do not create a project if visibility truthfulness cannot be demonstrated"],
    sourceTaskId
  });
  const charter = await projectCharterRecordCommand({
    project: projectRoot,
    validatedNeedRef: ".aof/artifacts/need-validation/records/NVR-MCB-001.json",
    validatedObjective: "Deliver a bounded Mission Control slice that shows truthful runtime transitions.",
    scope: ["mission overview", "artifact graph", "blockers", "next action"],
    constraints: ["Need Validation remains the approval authority"],
    expectedOutcomes: ["Operators can see runtime stage changes without manual reconstruction"],
    sourceTaskId,
    artifactPath: path.join(projectRoot, ".aof", "artifacts", "need-validation", "project-charters", "PCH-MCB-001.json")
  });
  const validation = await needValidationRecordCommand({
    project: projectRoot,
    rawNeed: "Improve Mission Control visibility",
    validationStatus: "validated",
    validatedNeed: "Deliver a bounded Mission Control slice that shows truthful runtime transitions.",
    decisionSummary: "The visibility gap is specific enough to authorize planning.",
    authorityAction: "approve-project-charter",
    projectCreationRecommendation: "create-project",
    validationQuestionsAnswered: [
      { question: "Who is affected?", answer: "AOF operators", evidence_state: "sufficient" }
    ],
    hiddenAssumptions: [],
    evidenceGaps: ["Implementation task is not open yet."],
    problemStatementRef: path.relative(projectRoot, problem.artifactPath).replaceAll("\\", "/"),
    valueHypothesisRef: path.relative(projectRoot, value.artifactPath).replaceAll("\\", "/"),
    alternativeAnalysisRef: path.relative(projectRoot, alternatives.artifactPath).replaceAll("\\", "/"),
    projectCharterRef: path.relative(projectRoot, charter.artifactPath).replaceAll("\\", "/"),
    discoveryHandoffRef,
    sourceTaskId,
    artifactPath: path.join(projectRoot, ".aof", "artifacts", "need-validation", "records", "NVR-MCB-001.json")
  });

  const charterPayload = JSON.parse(await fs.readFile(charter.artifactPath, "utf8"));
  charterPayload.validated_need_ref = path.relative(projectRoot, validation.artifactPath).replaceAll("\\", "/");
  await fs.writeFile(charter.artifactPath, `${JSON.stringify(charterPayload, null, 2)}\n`, "utf8");

  return validation;
}

export async function missionControlBenchmarkCommand(options) {
  const requestedProjectRoot = path.resolve(options.project || ".");
  const { tempRoot, projectRoot } = await createBenchmarkProject();
  const sourceTaskId = "TASK-MCB-001";

  try {
    const snapshots = [];
    snapshots.push(await captureMissionSnapshot(projectRoot, "00-baseline"));

    const handoff = await createDiscoveryHandoff(projectRoot, sourceTaskId);
    const handoffRef = path.relative(projectRoot, handoff.artifactPath).replaceAll("\\", "/");
    snapshots.push(await captureMissionSnapshot(projectRoot, "01-discovery-handoff"));

    await createNeedValidationChain(projectRoot, handoffRef, sourceTaskId);
    snapshots.push(await captureMissionSnapshot(projectRoot, "02-need-validation"));

    await taskOpenCommand({
      project: projectRoot,
      title: "Implement v3.6 bounded Mission Control visibility layer",
      description: "Mission Control should show truthful runtime stage changes, blockers, and next action.",
      triageNotes: "mission control v3.6 benchmark fixture"
    });
    snapshots.push(await captureMissionSnapshot(projectRoot, "03-implementation-ready"));

    const byLabel = Object.fromEntries(snapshots.map((entry) => [entry.label, entry]));
    const summary = {
      artifact_type: "mission-control-benchmark",
      generated_at: new Date().toISOString(),
      project_root: requestedProjectRoot,
      benchmark_project_root: projectRoot,
      snapshots,
      benchmarks: {
        "MC-001": byLabel["00-baseline"]?.stage === "visibility-baseline"
          ? pass("Mission Control starts at the baseline stage before discovery evidence exists.", [byLabel["00-baseline"].stage])
          : fail("Mission Control did not start at visibility-baseline.", [JSON.stringify(byLabel["00-baseline"] ?? null)]),
        "MC-002": byLabel["01-discovery-handoff"]?.stage === "discovery-handoff"
          ? pass("Mission Control promotes into discovery-handoff when the discovery handoff artifact exists.", [byLabel["01-discovery-handoff"].next])
          : fail("Mission Control did not promote into discovery-handoff after discovery artifacts were recorded.", [JSON.stringify(byLabel["01-discovery-handoff"] ?? null)]),
        "MC-003": byLabel["02-need-validation"]?.stage === "planning-ready"
          ? pass("Mission Control promotes into planning-ready after Need Validation and project charter are recorded.", [String(byLabel["02-need-validation"].blockers)])
          : fail("Mission Control did not promote into planning-ready after Need Validation.", [JSON.stringify(byLabel["02-need-validation"] ?? null)]),
        "MC-004": byLabel["03-implementation-ready"]?.stage === "implementation-ready"
          ? pass("Mission Control promotes into implementation-ready when the implementation task is opened.", [byLabel["03-implementation-ready"].next])
          : fail("Mission Control did not promote into implementation-ready after the implementation task was opened.", [JSON.stringify(byLabel["03-implementation-ready"] ?? null)]),
        "MC-005": byLabel["00-baseline"]?.next === "Complete the current visibility direction-setting chain before implementation." &&
          byLabel["01-discovery-handoff"]?.next === "Run Need Validation on the current discovery handoff." &&
          byLabel["02-need-validation"]?.next === "Open an implementation task for the bounded Mission Control visibility slice." &&
          /^Start TASK-\d+: Implement v3\.6 bounded Mission Control visibility layer$/.test(byLabel["03-implementation-ready"]?.next ?? "")
          ? pass("Mission Control recommends the correct next action at each stage transition.", snapshots.map((entry) => `${entry.label}:${entry.next}`))
          : fail("Mission Control next-action guidance did not evolve correctly across the benchmark chain.", snapshots.map((entry) => `${entry.label}:${entry.next}`))
      }
    };

    await validateWithBundledSchema(summary, "aof-mission-control-benchmark.schema.json", "mission control benchmark");

    const artifactPath = options.artifactPath
      ? await writeJsonArtifact(options.artifactPath, summary)
      : null;

    return {
      ok: Object.values(summary.benchmarks).every((entry) => entry.status === "pass"),
      artifactPath,
      summary
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}
