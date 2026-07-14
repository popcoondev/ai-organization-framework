// ANKP Phase 0 — AI専用ID・人間ロールと最小権限。
// 要件 9.7 / NFR-SEC-002: AIサービスIDを人間IDと分離し、責務外の操作を拒否する。
export const IDENTITIES = {
  // --- human roles (3.2) ---
  'source-manager': {
    type: 'human',
    role: 'Source Manager',
    permissions: ['source.manage', 'source.read', 'snapshot.ingest'],
  },
  reviewer: {
    type: 'human',
    role: 'Reviewer',
    permissions: [
      'claim.read',
      'claim.approve',
      'content.read',
      'content.approve',
      'content.reject',
    ],
  },
  'knowledge-owner': {
    type: 'human',
    role: 'Knowledge Owner',
    permissions: ['claim.read', 'claim.approve', 'content.read', 'content.approve', 'content.reject'],
  },
  'content-editor': {
    type: 'human',
    role: 'Content Editor',
    permissions: ['claim.read', 'content.read', 'content.generate'],
  },
  admin: {
    type: 'human',
    role: 'System Administrator',
    permissions: ['model.manage', 'killswitch', 'audit.read', 'source.manage', 'source.read'],
  },
  // --- AI service identities (9.7) ---
  'collector-id': {
    type: 'service',
    owner: 'source-manager',
    permissions: ['source.read', 'snapshot.ingest'],
    forbidden: '公開・編集不可',
  },
  'generator-id': {
    type: 'service',
    owner: 'content-editor',
    permissions: ['claim.read', 'claim.extract', 'content.generate'],
    forbidden: '本番公開不可',
  },
  'verifier-id': {
    type: 'service',
    owner: 'admin',
    permissions: ['claim.read', 'claim.source-match', 'content.verify', 'eval.write'],
    forbidden: 'Claim原文の改変不可',
  },
  'publisher-service': {
    type: 'service',
    owner: 'admin',
    permissions: ['content.publish', 'content.withdraw'],
    forbidden: 'ワークフロー署名必須（承認済み版のみ）',
  },
};

export function getIdentity(actorId) {
  const identity = IDENTITIES[actorId];
  if (!identity) throw new Error(`unknown identity: ${actorId}`);
  return identity;
}

export function assertPermission(actorId, permission) {
  const identity = getIdentity(actorId);
  if (!identity.permissions.includes(permission)) {
    throw new Error(`permission denied: ${actorId} lacks ${permission}`);
  }
  return identity;
}
