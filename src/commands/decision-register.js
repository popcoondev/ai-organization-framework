import path from "node:path";

import { loadTemplate } from "../runtime/template-loader.js";
import { listJsonFiles, pathExists, readJson } from "./operator-surface-helpers.js";

function canonicalPathForDecision(template, fileName) {
  return path.posix.join(".aof", template.manifest.state.decisions.replaceAll("\\", "/"), fileName);
}

async function resolveDecisionContext(projectRoot) {
  try {
    const template = await loadTemplate(projectRoot);
    return {
      hasTemplate: true,
      decisionsDir: path.join(projectRoot, ".aof", template.manifest.state.decisions),
      expectedMarkdownPath(decisionId) {
        return canonicalPathForDecision(template, `${decisionId}.md`);
      }
    };
  } catch {
    return {
      hasTemplate: false,
      decisionsDir: path.join(projectRoot, ".aof", "decisions"),
      expectedMarkdownPath(decisionId) {
        return `.aof/decisions/${decisionId}.md`;
      }
    };
  }
}

export async function decisionRegisterCommand(options) {
  const projectRoot = path.resolve(options.project || ".");
  const context = await resolveDecisionContext(projectRoot);
  const decisionsDir = context.decisionsDir;
  const decisionJsonPaths = await listJsonFiles(decisionsDir);

  const decisions = await Promise.all(
    decisionJsonPaths.map(async (jsonPath) => {
      const record = await readJson(jsonPath, `decision record ${path.basename(jsonPath)}`);
      const decisionId = record.decision_id ?? path.basename(jsonPath, ".json");
      const declaredMarkdownPath = record.canonical_markdown_path ?? context.expectedMarkdownPath(decisionId);
      const markdownPath = path.resolve(projectRoot, declaredMarkdownPath);
      const canonicalPathAligned = context.hasTemplate
        ? declaredMarkdownPath === context.expectedMarkdownPath(decisionId)
        : Boolean(record.canonical_markdown_path ?? declaredMarkdownPath);
      const markdownPresent = await pathExists(markdownPath);

      return {
        decision_id: decisionId,
        title: record.decision_summary ?? null,
        stage: record.stage ?? null,
        scope: record.scope ?? null,
        json_path: path.relative(projectRoot, jsonPath),
        canonical_markdown_path: declaredMarkdownPath,
        markdown_present: markdownPresent,
        canonical_path_aligned: canonicalPathAligned,
        pair_alignment_state: markdownPresent && canonicalPathAligned ? "aligned" : "drifted"
      };
    })
  );

  return {
    ok: true,
    projectRoot,
    decision_count: decisions.length,
    decisions
  };
}
