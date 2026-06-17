import fs from "node:fs/promises";
import path from "node:path";

import { loadTemplate } from "../runtime/template-loader.js";
import { loadBundledSchema, validateAgainstSchema } from "../runtime/validation.js";

async function readJsonArtifact(filePath, label) {
  const artifactText = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(artifactText);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function createCheckCollector() {
  const checks = [];
  const errors = [];

  return {
    checks,
    errors,
    pass(name, detail) {
      checks.push({ name, status: "pass", detail });
    },
    fail(name, detail) {
      checks.push({ name, status: "fail", detail });
      errors.push(`${name}: ${detail}`);
    }
  };
}

function canonicalPathForDecision(template, fileName) {
  return path.posix.join(".aof", template.manifest.state.decisions.replaceAll("\\", "/"), fileName);
}

async function listDecisionJsonPaths(decisionsDir) {
  const entries = await fs.readdir(decisionsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(decisionsDir, entry.name))
    .sort();
}

export async function decisionVerifyCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const collector = createCheckCollector();
  const bundledDecisionSchema = await loadBundledSchema("decision-record.schema.json");
  const template = await loadTemplate(projectRoot);
  const decisionsDir = path.join(projectRoot, ".aof", template.manifest.state.decisions);
  const decisionJsonPaths = await listDecisionJsonPaths(decisionsDir);

  if (decisionJsonPaths.length === 0) {
    collector.pass("decision inventory", "no decision JSON artifacts found");
    return {
      ok: true,
      projectRoot,
      decisionsDir,
      decisionCount: 0,
      checks: collector.checks,
      errors: collector.errors,
      summary: {
        total_checks: collector.checks.length,
        passed_checks: collector.checks.filter((entry) => entry.status === "pass").length,
        failed_checks: 0
      }
    };
  }

  for (const jsonPath of decisionJsonPaths) {
    const fileName = path.basename(jsonPath);
    const decisionLabel = fileName.replace(/\.json$/, "");

    try {
      const record = await readJsonArtifact(jsonPath, `decision record ${fileName}`);
      validateAgainstSchema(record, bundledDecisionSchema, `decision record ${fileName}`);
      collector.pass(`decision bundled schema ${decisionLabel}`, fileName);

      validateAgainstSchema(record, template.templateAssets.decisionRecordSchema, `project decision record ${fileName}`);
      collector.pass(`decision project schema ${decisionLabel}`, fileName);

      if (record.decision_id === decisionLabel) {
        collector.pass(`decision id match ${decisionLabel}`, record.decision_id);
      } else {
        collector.fail(`decision id match ${decisionLabel}`, `${record.decision_id} does not match ${decisionLabel}`);
      }

      const expectedCanonicalMarkdownPath = canonicalPathForDecision(template, `${decisionLabel}.md`);
      if (record.canonical_markdown_path === expectedCanonicalMarkdownPath) {
        collector.pass(`decision canonical path ${decisionLabel}`, record.canonical_markdown_path);
      } else {
        collector.fail(
          `decision canonical path ${decisionLabel}`,
          `${record.canonical_markdown_path} does not match ${expectedCanonicalMarkdownPath}`
        );
      }

      const markdownPath = path.join(decisionsDir, `${decisionLabel}.md`);
      if (await pathExists(markdownPath)) {
        collector.pass(`decision markdown exists ${decisionLabel}`, path.basename(markdownPath));
      } else {
        collector.fail(`decision markdown exists ${decisionLabel}`, `${path.basename(markdownPath)} is missing`);
      }
    } catch (error) {
      collector.fail(
        `decision validation ${decisionLabel}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return {
    ok: collector.errors.length === 0,
    projectRoot,
    decisionsDir,
    decisionCount: decisionJsonPaths.length,
    checks: collector.checks,
    errors: collector.errors,
    summary: {
      total_checks: collector.checks.length,
      passed_checks: collector.checks.filter((entry) => entry.status === "pass").length,
      failed_checks: collector.checks.filter((entry) => entry.status === "fail").length
    }
  };
}
