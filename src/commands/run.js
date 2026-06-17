import fs from "node:fs/promises";
import path from "node:path";

import { createInitialDecision } from "../runtime/decision.js";
import { writeGoalProjection } from "../runtime/project-memory.js";
import { attachOpenDecision, createInitialSession } from "../runtime/session.js";
import { loadTemplate } from "../runtime/template-loader.js";

async function removeIfPresent(filePath) {
  if (!filePath) {
    return;
  }
  await fs.rm(filePath, { force: true });
}

async function cleanupPartialRun(session, decision, error) {
  await Promise.all([
    removeIfPresent(session?.__session_path),
    removeIfPresent(decision?.__markdown_path ?? error?.partialDecisionPaths?.markdownPath),
    removeIfPresent(decision?.__json_path ?? error?.partialDecisionPaths?.jsonPath)
  ]);
}

export async function runCommand(options, deps = {}) {
  const loadTemplateImpl = deps.loadTemplate ?? loadTemplate;
  const createInitialSessionImpl = deps.createInitialSession ?? createInitialSession;
  const createInitialDecisionImpl = deps.createInitialDecision ?? createInitialDecision;
  const attachOpenDecisionImpl = deps.attachOpenDecision ?? attachOpenDecision;
  const writeGoalProjectionImpl = deps.writeGoalProjection ?? writeGoalProjection;
  const projectRoot = path.resolve(options.project);
  const template = await loadTemplateImpl(projectRoot);
  let session = null;
  let decision = null;
  let updatedSession = null;

  try {
    session = await createInitialSessionImpl({
      projectRoot,
      request: options.request,
      template,
      routingModeOverride: options.routingMode
    });
    decision = await createInitialDecisionImpl({
      projectRoot,
      request: options.request,
      template,
      session
    });
    updatedSession = await attachOpenDecisionImpl(session, decision.decision_id);
  } catch (error) {
    await cleanupPartialRun(session, decision, error);
    throw error;
  }

  let operatingGoalProjection = null;
  try {
    const projection = await writeGoalProjectionImpl({
      projectRoot,
      goalType: "operating-goal",
      content: options.request,
      agreedWithHuman: true,
      sourceSessionId: updatedSession.session_id
    });
    operatingGoalProjection = {
      ok: true,
      goalPath: projection.goalPath,
      content: projection.payload.content
    };
  } catch (error) {
    operatingGoalProjection = {
      ok: false,
      error: error.message
    };
  }

  return {
    ok: true,
    projectRoot,
    workflowId: updatedSession.workflow_id,
    organizationId: updatedSession.organization_id,
    sessionId: updatedSession.session_id,
    status: updatedSession.status,
    routingMode: updatedSession.routing_mode,
    sessionPath: updatedSession.__session_path,
    decisionId: decision.decision_id,
    decisionMarkdownPath: decision.__markdown_path,
    decisionJsonPath: decision.__json_path,
    pendingQuestions: updatedSession.clarification.pending_questions.map((item) => item.question),
    projectMemory: {
      operatingGoalProjection
    }
  };
}
