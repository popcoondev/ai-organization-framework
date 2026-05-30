import fs from "node:fs/promises";
import path from "node:path";
import { deriveInitialClarification } from "./clarification.js";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`.toUpperCase();
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeSession(sessionPath, session) {
  const { __session_path: _internalSessionPath, ...persistedSession } = session;
  await fs.writeFile(sessionPath, `${JSON.stringify(persistedSession, null, 2)}\n`, "utf8");
}

export async function createInitialSession({ projectRoot, request, template }) {
  const createdAt = nowIso();
  const sessionId = makeId("sess");
  const triggerId = makeId("trg");
  const sessionsDir = path.join(projectRoot, ".aof", template.manifest.state.sessions);
  await ensureDir(sessionsDir);
  const routingMode = "deep-path";
  const clarification = deriveInitialClarification(request, template);
  const status = clarification.should_wait_for_user ? "waiting_user" : "clarification";

  const session = {
    session_id: sessionId,
    workflow_id: template.workflowId,
    organization_id: template.organization.organization_id,
    status,
    trigger: {
      trigger_id: triggerId,
      trigger_type: "cli",
      received_at: createdAt,
      request_payload: request
    },
    current_stage: "clarification",
    routing_mode: routingMode,
    context_snapshot_id: null,
    open_decision_ids: [],
    closed_decision_ids: [],
    clarification: {
      round_count: 1,
      ...clarification
    },
    created_at: createdAt,
    updated_at: createdAt
  };

  const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
  await writeSession(sessionPath, session);

  return {
    ...session,
    __session_path: sessionPath
  };
}

export async function attachOpenDecision(session, decisionId) {
  const updatedAt = nowIso();
  const nextSession = {
    ...session,
    open_decision_ids: [...session.open_decision_ids, decisionId],
    updated_at: updatedAt
  };
  await writeSession(session.__session_path, nextSession);
  return {
    ...nextSession,
    __session_path: session.__session_path
  };
}
