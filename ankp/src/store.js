// ANKP Phase 0 — file-based versioned store.
// 要件 10.4: 編集は上書きではなく新しい版として保存し、旧版を保持する。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function newId(prefix) {
  return `${prefix}-${crypto.randomBytes(5).toString('hex')}`;
}

export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function createStore(baseDir) {
  fs.mkdirSync(baseDir, { recursive: true });

  function collectionDir(collection) {
    const dir = path.join(baseDir, collection);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function docPath(collection, id) {
    return path.join(collectionDir(collection), `${id}.json`);
  }

  function historyDir(collection, id) {
    const dir = path.join(collectionDir(collection), '_history', id);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function get(collection, id) {
    const file = docPath(collection, id);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  function put(collection, doc) {
    if (!doc.id) throw new Error('store.put requires doc.id');
    const existing = get(collection, doc.id);
    const version = existing ? existing._version + 1 : 1;
    const next = { ...doc, _version: version, _updatedAt: nowIso() };
    const body = JSON.stringify(next, null, 2);
    fs.writeFileSync(path.join(historyDir(collection, doc.id), `v${version}.json`), body);
    fs.writeFileSync(docPath(collection, doc.id), body);
    return next;
  }

  function getVersion(collection, id, version) {
    const file = path.join(collectionDir(collection), '_history', id, `v${version}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  function list(collection, filter) {
    const dir = collectionDir(collection);
    const docs = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    return filter ? docs.filter(filter) : docs;
  }

  return { baseDir, get, put, getVersion, list };
}
