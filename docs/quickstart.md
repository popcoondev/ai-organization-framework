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

## Install `aof` For Another Project

bundled example ではなく別プロジェクトへ AOF を持ち込む場合、現在の canonical acquisition path は GitHub tag から local tool source を取得する方式である。

```bash
git clone --branch v2.0.0 https://github.com/popcoondev/ai-organization-framework.git ~/.local/share/aof/v2.0.0
cd ~/.local/share/aof/v2.0.0
npm install
npm link
```

その後、対象 repo で次を実行する。

```bash
aof init --topology managed-project
```

すでに `.aof/` を持つ repo を新しい installer shape に寄せる時は、次を使う。

```bash
aof upgrade
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

## Visibility Viewer

`v1.4` の Human Visibility Layer を local viewer で見たい場合は、`status_card` / `timeline_feed` / `flow_snapshot` の JSON を用意して `visibility-serve` を起動する。

```bash
node ./src/cli.js visibility-serve \
  --status-input /tmp/aof-visibility/status-card.json \
  --timeline-input /tmp/aof-visibility/timeline-feed.json \
  --flow-input /tmp/aof-visibility/flow-snapshot.json \
  --port 4174
```

起動後は返ってきた `url` を browser で開けばよい。  
viewer 自体は read-only で、`status / timeline / flow` の 3 面だけを表示する。

## Non-AIDLC Example

AIDLC 以外の最小例を見たい場合は generic template を使う。

```bash
node ./src/cli.js run "Improve workshop participation quality" --project ./examples/generic-template
```

この template は `service-design` workflow と domain-specific clarification override の最小例である。  
adaptation は `project-orientation.json` と bootstrap packet を中心に行う。

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
- core model: [aof-core-model.md](./aof-core-model.md)
- operations model: [aof-operations-model.md](./aof-operations-model.md)
- project bootstrap model: [aof-project-bootstrap-model.md](./aof-project-bootstrap-model.md)
- `v2.0` scope と gate: [v2.0-release-definition.md](./v2.0-release-definition.md)
