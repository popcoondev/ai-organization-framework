import fs from "node:fs/promises";
import path from "node:path";

import { writeJsonArtifact } from "../runtime/utils.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import * as discoveryRoots from "./discovery-artifact-helpers.js";
import { listJsonFiles, readJson } from "./operator-surface-helpers.js";

function toRef(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replaceAll("\\", "/");
}

function pass(detail, evidence = []) {
  return { status: "pass", detail, evidence };
}

function fail(detail, evidence = []) {
  return { status: "fail", detail, evidence };
}

async function loadValidatedEntries(projectRoot, filePaths, schemaName, label) {
  const entries = [];
  for (const filePath of filePaths) {
    const payload = await readJson(filePath, `${label} ${path.basename(filePath)}`);
    await validateWithBundledSchema(payload, schemaName, label);
    entries.push({
      path: filePath,
      ref: toRef(projectRoot, filePath),
      payload
    });
  }
  return entries;
}

function indexByRef(entries) {
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.ref, entry);
  }
  return map;
}

function byTaskId(entries, taskId) {
  if (!taskId) {
    return [];
  }
  return entries.filter((entry) => entry.payload.source_task_id === taskId);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function discoveryHandoffBenchmarkCommand(options) {
  const projectRoot = path.resolve(options.project || ".");

  const questionSets = await loadValidatedEntries(
    projectRoot,
    await listJsonFiles(discoveryRoots.resolveDiscoveryQuestionSetsRoot(projectRoot)),
    "aof-discovery-question-set.schema.json",
    "discovery question set"
  );
  const assumptionMaps = await loadValidatedEntries(
    projectRoot,
    await listJsonFiles(discoveryRoots.resolveAssumptionMapsRoot(projectRoot)),
    "aof-assumption-map.schema.json",
    "assumption map"
  );
  const anomalyLogs = await loadValidatedEntries(
    projectRoot,
    await listJsonFiles(discoveryRoots.resolveAnomalyLogsRoot(projectRoot)),
    "aof-anomaly-log.schema.json",
    "anomaly log"
  );
  const judgments = await loadValidatedEntries(
    projectRoot,
    await listJsonFiles(discoveryRoots.resolveDiscoveryJudgmentsRoot(projectRoot)),
    "aof-discovery-judgment-packet.schema.json",
    "discovery judgment packet"
  );
  const handoffs = await loadValidatedEntries(
    projectRoot,
    await listJsonFiles(discoveryRoots.resolveDiscoveryHandoffsRoot(projectRoot)),
    "aof-discovery-handoff.schema.json",
    "discovery handoff"
  );
  const needValidationRecords = await loadValidatedEntries(
    projectRoot,
    await listJsonFiles(discoveryRoots.resolveNeedValidationRecordsRoot(projectRoot)),
    "aof-need-validation-record.schema.json",
    "need validation record"
  );

  const handoffByRef = indexByRef(handoffs);
  const linkedChains = [];
  const mandatoryFailures = [];
  const judgmentFailures = [];
  const completenessFailures = [];
  const linkageFailures = [];

  for (const recordEntry of needValidationRecords.filter((entry) => entry.payload.discovery_handoff_ref)) {
    const handoffRef = recordEntry.payload.discovery_handoff_ref;
    const handoffEntry = handoffByRef.get(handoffRef);
    const taskId = recordEntry.payload.source_task_id || handoffEntry?.payload.source_task_id || null;
    const chainId = taskId || recordEntry.ref;
    const chain = {
      chain_id: chainId,
      need_validation_record_ref: recordEntry.ref,
      discovery_handoff_ref: handoffRef,
      question_sets: byTaskId(questionSets, taskId),
      assumption_maps: byTaskId(assumptionMaps, taskId),
      anomaly_logs: byTaskId(anomalyLogs, taskId),
      judgments: byTaskId(judgments, taskId),
      handoff: handoffEntry,
      record: recordEntry
    };
    linkedChains.push(chain);

    const missing = [];
    if (!handoffEntry) {
      missing.push("discovery-handoff-record");
    }
    if (chain.question_sets.length === 0) {
      missing.push("discovery-question-set-record");
    }
    if (chain.assumption_maps.length === 0) {
      missing.push("assumption-map-record");
    }
    if (chain.anomaly_logs.length === 0) {
      missing.push("anomaly-log-record");
    }
    if (chain.judgments.length === 0) {
      missing.push("discovery-judgment-packet");
    }
    if (missing.length > 0) {
      mandatoryFailures.push(`${chainId}: ${missing.join(", ")}`);
    }

    const validJudgment = chain.judgments.find((entry) =>
      entry.payload.judgment_status === "synthesize-handoff" &&
      entry.payload.handoff_required === true &&
      entry.payload.promotion_ready === true &&
      Array.isArray(entry.payload.question_set_refs) &&
      entry.payload.question_set_refs.length > 0
    );
    if (!validJudgment) {
      judgmentFailures.push(chainId);
    }

    if (handoffEntry) {
      const handoff = handoffEntry.payload;
      if (
        !Array.isArray(handoff.evidence_refs) || handoff.evidence_refs.length === 0 ||
        !Array.isArray(handoff.rejected_alternatives) || handoff.rejected_alternatives.length === 0 ||
        !Array.isArray(handoff.explicit_risks) || handoff.explicit_risks.length === 0 ||
        !Array.isArray(handoff.delivery_validation_requirements) || handoff.delivery_validation_requirements.length === 0
      ) {
        completenessFailures.push(chainId);
      }
    } else {
      completenessFailures.push(chainId);
    }

    let linkedCharterOk = false;
    if (recordEntry.payload.project_charter_ref) {
      const charterPath = path.resolve(projectRoot, recordEntry.payload.project_charter_ref);
      if (await pathExists(charterPath)) {
        const charter = await readJson(charterPath, `project charter ${path.basename(charterPath)}`);
        await validateWithBundledSchema(charter, "aof-project-charter.schema.json", "project charter");
        linkedCharterOk = true;
      }
    }

    if (!handoffEntry || !recordEntry.payload.validated_need || !linkedCharterOk) {
      linkageFailures.push(chainId);
    }
  }

  const blockingJudgments = judgments.filter((entry) =>
    ["continue-exploration", "pivot", "stop"].includes(entry.payload.judgment_status)
  );

  const summary = {
    artifact_type: "discovery-handoff-benchmark",
    generated_at: new Date().toISOString(),
    project_root: projectRoot,
    linked_chain_count: linkedChains.length,
    blocking_example_count: blockingJudgments.length,
    benchmarks: {
      "DH-001": mandatoryFailures.length === 0 && linkedChains.length > 0
        ? pass("Linked discovery-to-need-validation chains include the mandatory discovery artifact set.", linkedChains.map((chain) => chain.chain_id))
        : fail("Some linked chains are missing mandatory discovery artifacts or no linked chain exists.", mandatoryFailures),
      "DH-002": judgmentFailures.length === 0 && linkedChains.length > 0
        ? pass("Linked chains include a valid synthesize-handoff discovery judgment.", linkedChains.map((chain) => chain.chain_id))
        : fail("Some linked chains are missing a valid synthesize-handoff judgment.", judgmentFailures),
      "DH-003": completenessFailures.length === 0 && linkedChains.length > 0
        ? pass("Discovery handoff packets contain explicit evidence, rejected alternatives, risks, and delivery validation requirements.", linkedChains.map((chain) => chain.chain_id))
        : fail("Some discovery handoff packets are incomplete.", completenessFailures),
      "DH-004": linkageFailures.length === 0 && linkedChains.length > 0
        ? pass("Discovery handoffs are linked into need validation and project-charter records.", linkedChains.map((chain) => chain.chain_id))
        : fail("Some discovery handoffs are not linked into a valid need-validation/project-charter path.", linkageFailures),
      "DH-005": blockingJudgments.length > 0
        ? pass("The project contains at least one explicit blocking discovery judgment before handoff.", blockingJudgments.map((entry) => entry.ref))
        : fail("No blocking discovery judgment was found to represent missing upstream evidence.")
    }
  };

  await validateWithBundledSchema(summary, "aof-discovery-handoff-benchmark.schema.json", "discovery handoff benchmark");

  const artifactPath = options.artifactPath
    ? await writeJsonArtifact(options.artifactPath, summary)
    : null;

  return {
    ok: Object.values(summary.benchmarks).every((entry) => entry.status === "pass"),
    artifactPath,
    summary
  };
}
