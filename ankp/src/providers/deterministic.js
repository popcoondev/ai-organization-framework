// ANKP Phase 0 — 決定的プロバイダー。
// LLM を呼ばずにパイプライン全体をオフラインで検証するための参照実装。
// 実モデル接続は Model Gateway のプロバイダー追加で行い、業務コードは変更しない
// （NFR-MNT-001: 特定LLM名を業務コードへ直書きしない）。
//
// config.mode === 'degraded' は「品質の低いモデル」を模擬し、
// 回帰評価ゲート・検証ゲートが不良出力を実際に止めることをテストするために使う。

const PROMPT_VERSION = 'deterministic-v1';

function extractClaims(input, degraded) {
  const lines = String(input.content ?? '').split('\n');
  let heading = '(document)';
  const claims = [];
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (/^#{1,3}\s+/.test(trimmed)) {
      heading = trimmed.replace(/^#{1,3}\s+/, '');
      return;
    }
    if (trimmed.startsWith('- ')) {
      const statement = trimmed.slice(2).trim();
      if (!statement) return;
      const security = /security|vulnerab|cve|injection|脆弱性/i.test(`${heading} ${statement}`);
      const versionMatch = statement.match(/v\d+(?:\.\d+)*/);
      claims.push({
        statement,
        // degraded モデルは出典箇所を落とす → 抽出評価セットで不合格になる。
        sourceLocation: degraded ? undefined : `${heading} / line ${index + 1}`,
        claimType: security ? 'security' : 'product_spec',
        applicability: versionMatch ? { version: versionMatch[0] } : {},
      });
    }
  });
  return { claims };
}

function buildLesson(input, degraded) {
  const { title, claims } = input;
  const allIds = claims.map((c) => c.claimId ?? c.id);
  const blocks = [
    {
      kind: 'overview',
      label: 'Inferred',
      text: `${title} — 本レッスンは承認済み Claim ${allIds.length} 件に基づく。`,
      claimIds: allIds,
    },
    ...claims.map((claim) => ({
      kind: 'fact',
      label: 'Confirmed',
      text: claim.statement,
      claimIds: [claim.claimId ?? claim.id],
    })),
    {
      kind: 'practical-check',
      label: 'Suggested',
      text: '自分のプロジェクトで、該当機能の採用可否・移行影響・評価方法を確認する。',
      claimIds: [],
    },
  ];
  if (degraded) {
    // 「Claim に無い断定」を混入させる不良モデルの模擬（AIQ-001 違反出力）。
    blocks.push({
      kind: 'fact',
      label: 'Confirmed',
      text: 'この機能はすでに業界標準であり、全ベンダーが採用している。',
      claimIds: [],
    });
  }
  return { title, blocks };
}

function mutateStatement(statement, variant) {
  const withNumbers = statement.replace(/\d+/, (n) => String(Number(n) + 1 + variant));
  if (withNumbers !== statement) return withNumbers;
  return `${statement} — この記述は出典と異なる（改変${variant + 1}）`;
}

function buildQuiz(input, degraded) {
  const { claims, sourceName, contentDate } = input;
  const questions = claims.slice(0, 3).map((claim, index) => {
    const correct = claim.statement;
    const distractors = [0, 1, 2].map((v) => mutateStatement(correct, v));
    if (degraded) {
      // 正解と同一の選択肢を混入させる不良モデルの模擬（7.4: 正解の一意性違反）。
      distractors[0] = correct;
    }
    const options = [...distractors];
    const correctIndex = index % (distractors.length + 1);
    options.splice(correctIndex, 0, correct);
    return {
      prompt: `出典「${sourceName ?? '公式リリースノート'}」（基準日 ${contentDate ?? '不明'}）の内容として正しいものはどれか。`,
      options,
      correctIndex,
      explanation: `出典に「${correct}」と記載されている。`,
      wrongExplanations: options.map((option, i) =>
        i === correctIndex ? null : '出典スナップショットに該当する記述がない改変です。',
      ),
      claimIds: [claim.claimId ?? claim.id],
      label: 'Confirmed',
    };
  });
  return { questions };
}

export function createDeterministicProvider(config = {}) {
  const degraded = config.mode === 'degraded';
  return {
    promptVersion: PROMPT_VERSION,
    run(task, input) {
      switch (task) {
        case 'claim-extraction':
          return extractClaims(input, degraded);
        case 'lesson-generation':
          return buildLesson(input, degraded);
        case 'quiz-generation':
          return buildQuiz(input, degraded);
        default:
          throw new Error(`unsupported task: ${task}`);
      }
    },
  };
}
