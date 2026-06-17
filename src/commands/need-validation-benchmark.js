import fs from "node:fs/promises";
import path from "node:path";

import { resolveAofRoot } from "../runtime/project-memory.js";
import { writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";

async function listJson(dirPath) {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.filter((name) => name.endsWith(".json")).map((name) => path.join(dirPath, name));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function pass(detail, evidence = []) {
  return { status: "pass", detail, evidence };
}

function fail(detail, evidence = []) {
  return { status: "fail", detail, evidence };
}

export async function needValidationBenchmarkCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const aofRoot = resolveAofRoot(projectRoot);
  const recordsRoot = path.join(aofRoot, "artifacts", "need-validation", "records");
  const recordPaths = await listJson(recordsRoot);

  const records = [];
  for (const filePath of recordPaths) {
    const record = await loadJson(filePath);
    await validateWithBundledSchema(record, "aof-need-validation-record.schema.json", "need validation record");
    records.push({
      path: path.relative(projectRoot, filePath).replaceAll("\\", "/"),
      record
    });
  }

  const rejectedOrWeak = records.filter(({ record }) =>
    ["rejected", "deferred", "evidence-requested", "experiment-required"].includes(record.validation_status)
  );
  const falseProblemRejections = records.filter(({ record }) =>
    ["do-not-create-project", "hold-project"].includes(record.project_creation_recommendation)
  );

  const qualityFailures = [];
  const alternativeFailures = [];
  const experimentFailures = [];
  const readinessFailures = [];

  for (const { path: recordPath, record } of records) {
    const valueHypothesisPath = path.resolve(projectRoot, record.value_hypothesis_ref);
    const alternativeAnalysisPath = path.resolve(projectRoot, record.alternative_analysis_ref);
    const valueHypothesis = await loadJson(valueHypothesisPath);
    const alternativeAnalysis = await loadJson(alternativeAnalysisPath);
    await validateWithBundledSchema(valueHypothesis, "aof-value-hypothesis.schema.json", "value hypothesis");
    await validateWithBundledSchema(alternativeAnalysis, "aof-alternative-analysis.schema.json", "alternative analysis");

    if (!Array.isArray(valueHypothesis.supporting_evidence) || valueHypothesis.supporting_evidence.length === 0 ||
      !Array.isArray(valueHypothesis.success_criteria) || valueHypothesis.success_criteria.length === 0) {
      qualityFailures.push(recordPath);
    }

    if (!Array.isArray(alternativeAnalysis.alternative_solutions) || alternativeAnalysis.alternative_solutions.length === 0 ||
      !Array.isArray(alternativeAnalysis.stop_options) || alternativeAnalysis.stop_options.length === 0) {
      alternativeFailures.push(recordPath);
    }

    if (record.validation_status === "experiment-required") {
      if (!record.experiment_proposal_ref) {
        experimentFailures.push(recordPath);
      } else {
        const experiment = await loadJson(path.resolve(projectRoot, record.experiment_proposal_ref));
        await validateWithBundledSchema(experiment, "aof-experiment-proposal.schema.json", "experiment proposal");
        if (!experiment.smallest_testable_validation || !experiment.expected_cost || !experiment.success_threshold) {
          experimentFailures.push(recordPath);
        }
      }
    }

    if (record.project_creation_recommendation === "create-project") {
      if (!record.project_charter_ref || !record.validated_need) {
        readinessFailures.push(recordPath);
      }
    }
  }

  const summary = {
    artifact_type: "need-validation-benchmark",
    generated_at: new Date().toISOString(),
    project_root: projectRoot,
    records_evaluated: records.length,
    benchmarks: {
      "NV-001": rejectedOrWeak.length > 0
        ? pass("At least one weak or incorrect need was blocked before project creation.", rejectedOrWeak.map(({ path }) => path))
        : fail("No rejected/deferred/evidence-requested/experiment-required need validation record was found."),
      "NV-002": falseProblemRejections.length > 0
        ? pass("At least one project recommendation explicitly prevented project creation.", falseProblemRejections.map(({ path }) => path))
        : fail("No do-not-create-project or hold-project recommendation was found."),
      "NV-003": qualityFailures.length === 0
        ? pass("Value hypotheses are evidence-backed in the evaluated records.", records.map(({ path }) => path))
        : fail("Some value hypotheses are missing evidence or success criteria.", qualityFailures),
      "NV-004": alternativeFailures.length === 0
        ? pass("Alternative analyses include both alternative and stop paths.", records.map(({ path }) => path))
        : fail("Some alternative analyses are incomplete.", alternativeFailures),
      "NV-005": experimentFailures.length === 0
        ? pass("Experiment-required records include minimal experiment proposals.", records.filter(({ record }) => record.validation_status === "experiment-required").map(({ path }) => path))
        : fail("Some experiment-required records are missing adequate experiment proposals.", experimentFailures),
      "NV-006": readinessFailures.length === 0
        ? pass("Project-ready records include validated need and project charter links.", records.filter(({ record }) => record.project_creation_recommendation === "create-project").map(({ path }) => path))
        : fail("Some project-ready records are missing validated need or project charter linkage.", readinessFailures)
    }
  };

  const artifactPath = options.artifactPath
    ? await writeJsonArtifact(options.artifactPath, summary)
    : null;

  return {
    ok: Object.values(summary.benchmarks).every((entry) => entry.status === "pass"),
    artifactPath,
    summary
  };
}
