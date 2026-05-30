import fs from "node:fs/promises";
import path from "node:path";

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

export async function createInitialSession({ projectRoot, request, template }) {
  const createdAt = nowIso();
  const sessionId = makeId("sess");
  const triggerId = makeId("trg");
  const sessionsDir = path.join(projectRoot, ".aof", template.manifest.state.sessions);
  await ensureDir(sessionsDir);

  const session = {
    session_id: sessionId,
    workflow_id: template.workflowId,
    organization_id: template.organization.organization_id,
    status: "intake",
    trigger: {
      trigger_id: triggerId,
      trigger_type: "cli",
      received_at: createdAt,
      request_payload: request
    },
    current_stage: "intake",
    open_decision_ids: [],
    closed_decision_ids: [],
    created_at: createdAt,
    updated_at: createdAt
  };

  const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
  await fs.writeFile(sessionPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");

  return {
    ...session,
    __session_path: sessionPath
  };
}
