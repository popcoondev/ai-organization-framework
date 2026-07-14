// ANKP Phase 0 — append-only audit log.
// 要件 FR-ADM-012 / NFR-SEC-005 / 13.5: 誰が、何を、いつ、なぜ変更したかを追跡できる。
import fs from 'node:fs';
import path from 'node:path';
import { newId, nowIso } from './store.js';

function auditFile(store) {
  return path.join(store.baseDir, 'audit.jsonl');
}

export function recordAudit(store, entry) {
  for (const key of ['actor', 'operation', 'target']) {
    if (!entry[key]) throw new Error(`audit entry requires ${key}`);
  }
  const record = {
    auditId: newId('aud'),
    at: nowIso(),
    actor: entry.actor,
    operation: entry.operation,
    target: entry.target,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
    correlationId: entry.correlationId ?? null,
  };
  fs.appendFileSync(auditFile(store), `${JSON.stringify(record)}\n`);
  return record;
}

export function searchAudit(store, filter = {}) {
  const file = auditFile(store);
  if (!fs.existsSync(file)) return [];
  const rows = file
    ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : [];
  return rows.filter((row) =>
    Object.entries(filter).every(([key, value]) => {
      if (value == null) return true;
      if (typeof value === 'function') return value(row[key]);
      if (typeof row[key] === 'string' && typeof value === 'string') {
        return row[key] === value || row[key].includes(value);
      }
      return row[key] === value;
    }),
  );
}
