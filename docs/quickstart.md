# Quickstart

この文書は、AI Organization Framework を初めて触る人向けの最短手順である。  
目標は、bundled example を local で 1 回最後まで流し、`run -> answer -> council-exec` の感触を掴むことにある。

## Prerequisites

- Node.js 22 以上
- `npm`
- local shell

依存を入れる。

```bash
npm install
```

## Fastest First Run

まずは AIDLC example を使う。

### 1. Start A Session

```bash
node ./src/cli.js run "初回離脱率を下げたい" --project ./examples/aidlc-template
```

これで `.aof/sessions/` に session file が作られる。  
最新 session は次で探せる。

```bash
ls -t ./examples/aidlc-template/.aof/sessions | head -n 1
```

以下の例では、その session path を `<SESSION>` と書く。

### 2. Answer Clarification

```bash
node ./src/cli.js answer \
  --session ./examples/aidlc-template/.aof/sessions/<SESSION> \
  --response "新規登録導線全体" \
  --response "登録完了率を 5% 改善する" \
  --response "認証基盤は変更しない"
```

### 3. Inspect The Council Plan

```bash
node ./src/cli.js council \
  --session ./examples/aidlc-template/.aof/sessions/<SESSION> \
  --stage planning
```

### 4. Execute Planning

最初は mock provider で十分である。

```bash
node ./src/cli.js council-exec \
  --session ./examples/aidlc-template/.aof/sessions/<SESSION> \
  --stage planning \
  --invoke-model \
  --provider mock
```

approval まで流したい場合は次も実行する。

```bash
node ./src/cli.js council-exec \
  --session ./examples/aidlc-template/.aof/sessions/<SESSION> \
  --stage approval \
  --invoke-model \
  --provider mock
```

## One-Shot Verification

local で一気に flow を見たい場合は `live-verify` が最短である。

```bash
node ./src/cli.js live-verify \
  --project ./examples/aidlc-template \
  --provider mock \
  --artifact-dir /tmp/aof-quickstart \
  --include-approval
```

これで `provider-check.json`、`planning-exec.json`、`approval-exec.json`、`verification-bundle.json`、`verification-report.md` が `/tmp/aof-quickstart` に出る。

## Non-AIDLC Example

AIDLC 以外の最小例を見たい場合は generic template を使う。

```bash
node ./src/cli.js run "Improve workshop participation quality" --project ./examples/generic-template
```

この template は `service-design` workflow と domain-specific clarification override の最小例である。  
adaptation の考え方は [domain-adaptation-guide.md](./domain-adaptation-guide.md) を参照する。

## When To Use Framing-Only vs Runtime-On

まず framing だけ固めたい task では、AOF の問いかけ方を使うだけでもよい。  
Need / Intent / Context を整えることが目的で、planning / approval の履歴をまだ残さなくてよい場合は framing-only で十分である。

一方で、次のどれかが欲しい場合は runtime を起動する。

- clarification / planning / approval の履歴を session に残したい
- routing mode や reopen を測定したい
- outcome を `outcome-report` で session に書き戻したい
- external signal や escalation を trace したい

運用上の重要な制約として、`v1.1` 時点の runtime は `1 session = serial mutation` 前提である。  
同じ session に対して `answer`、`council-exec`、`signal`、`escalation-resolve`、`outcome-report` を同時に走らせないこと。
プロセスが異常終了して `<session>.lock` が残った場合は、その lock file を手動削除してから再試行する。

## What To Read Next

- command 一覧: [cli-reference.md](./cli-reference.md)
- domain adaptation: [domain-adaptation-guide.md](./domain-adaptation-guide.md)
- live provider verification: [live-provider-verification.md](./live-provider-verification.md)
- `v1` scope と gate: [v1-release-definition.md](./v1-release-definition.md)
