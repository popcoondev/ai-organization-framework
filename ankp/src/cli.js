#!/usr/bin/env node
// ANKP Phase 0 — 管理 CLI（Phase 0 の管理画面に相当する操作面）。
import path from 'node:path';
import process from 'node:process';
import { createStore } from './store.js';
import { runDemo } from './pipeline.js';
import { searchAudit } from './audit.js';
import { listReviewQueue, approveContent, rejectContent } from './review.js';
import { publishContent, engageKillSwitch } from './publish.js';
import { traceContent } from './trace.js';

function parseArgs(argv) {
  const args = [];
  const flags = {};
  for (const token of argv) {
    if (token.startsWith('--')) {
      const [key, value] = token.slice(2).split('=');
      flags[key] = value ?? true;
    } else {
      args.push(token);
    }
  }
  return { args, flags };
}

function dataDir(flags) {
  return path.resolve(flags['data-dir'] ?? path.join(process.cwd(), 'data'));
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

const USAGE = `ANKP Phase 0 CLI

usage: node src/cli.js <command> [args] [--data-dir=DIR]

commands:
  demo                          16.3 の縦切り E2E デモを実行する
  queue                         レビュー待ちコンテンツ一覧
  approve <contentId> --as=<actor> --reason=<text>
  reject <contentId> --as=<actor> --reason=<text>
  publish <contentId> --as=publisher-service
  trace <contentId>             公開内容 → Claim → Snapshot → Source の追跡
  audit [--target=] [--actor=] [--operation=] [--correlation=]
  kill-switch <content|claim|global> [targetId] --as=admin --reason=<text>
  sources | claims | contents | models | publications
`;

function main() {
  const { args, flags } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = args;
  if (!command || command === 'help') {
    console.log(USAGE);
    return;
  }

  if (command === 'demo') {
    const report = runDemo(dataDir(flags));
    console.log('=== ANKP Phase 0 縦切りデモ (要件 16.3) ===');
    for (const { step, detail } of report.steps) {
      console.log(`- ${step}: ${JSON.stringify(detail)}`);
    }
    console.log('\n公開済みコンテンツのトレーサビリティ (UAT-003):');
    for (const chain of report.quizTrace.chains) {
      console.log(
        `  claim ${chain.claimId} [${chain.verificationStatus}] <- ${chain.sourceLocation} <- ${chain.sourceName} (Tier ${chain.trustTier})`,
      );
    }
    console.log(`\n監査レコード数 (correlation ${report.correlationId}): ${report.auditCount}`);
    console.log(`データディレクトリ: ${dataDir(flags)}`);
    return;
  }

  const store = createStore(dataDir(flags));
  switch (command) {
    case 'queue':
      printJson(
        listReviewQueue(store).map((c) => ({
          id: c.id,
          type: c.type,
          title: c.title,
          state: c.state,
          gateLevel: c.gateLevel,
          requiredApprovals: c.requiredApprovals,
        })),
      );
      break;
    case 'approve':
      printJson(
        approveContent(store, rest[0], { actor: flags.as, reason: flags.reason }),
      );
      break;
    case 'reject':
      printJson(rejectContent(store, rest[0], { actor: flags.as, reason: flags.reason }));
      break;
    case 'publish':
      printJson(publishContent(store, rest[0], { actor: flags.as ?? 'publisher-service' }));
      break;
    case 'trace':
      printJson(traceContent(store, rest[0]));
      break;
    case 'audit':
      printJson(
        searchAudit(store, {
          target: flags.target,
          actor: flags.actor,
          operation: flags.operation,
          correlationId: flags.correlation,
        }),
      );
      break;
    case 'kill-switch':
      printJson(
        engageKillSwitch(
          store,
          { targetType: rest[0], targetId: rest[1], reason: flags.reason },
          { actor: flags.as ?? 'admin' },
        ),
      );
      break;
    case 'sources':
    case 'claims':
    case 'contents':
    case 'models':
    case 'publications':
      printJson(store.list(command));
      break;
    default:
      console.error(`unknown command: ${command}\n`);
      console.log(USAGE);
      process.exitCode = 1;
  }
}

main();
