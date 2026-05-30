# Live Provider Verification

この文書は、`openai-compatible` provider を実際に接続して、AOF runtime の live verification を手動で実施するための手順を定義する。

目的は 2 つある。

1. provider 設定が runtime から正しく解決されることを確認する
2. `provider-check` と `council-exec` の結果を evidence artifact として保存する

この verification は CI では行わない。  
理由は、外部 network と credential に依存するためである。

prototype には one-shot でこの flow を回す `live-verify` command もある。

```bash
node ./src/cli.js live-verify \
  --project ./examples/aidlc-template \
  --provider openai-compatible \
  --model gpt-4.1-mini \
  --base-url https://api.openai.com/v1 \
  --api-key-env OPENAI_API_KEY \
  --ping \
  --artifact-dir /tmp/aof-live-verification \
  --include-approval
```

この command は次を順に実行する。

1. `provider-check`
2. `run`
3. `answer`
4. `council-exec --stage planning`
5. optional な `council-exec --stage approval`
6. `verification-bundle.json` の保存

## 前提

次を満たすこと。

- `npm test` が green
- `npm run smoke` が green
- 対象 provider が OpenAI-compatible chat completions endpoint を持つ
- API key が利用可能
- base URL が利用可能

## 推奨ディレクトリ

manual verification の artifact は repo の tracked state に混ぜない。  
次のどちらかを使う。

- project 外の temp directory
- `examples/aidlc-template/.aof/artifacts/verification/`

例:

```bash
mkdir -p /tmp/aof-live-verification
```

## Step 1: Provider Preflight

まず `provider-check` で provider 設定と ping を確認する。

```bash
node ./src/cli.js provider-check \
  --provider openai-compatible \
  --model gpt-4.1-mini \
  --base-url https://api.openai.com/v1 \
  --api-key-env OPENAI_API_KEY \
  --ping \
  --write-artifact /tmp/aof-live-verification/provider-check.json
```

期待する結果:

- CLI の `ok` が `true`
- `readiness.canInvoke` が `true`
- `ping.attempted` が `true`
- `ping.ok` が `true`
- artifact file が保存される

artifact の中には最低限、次が入る。

- `artifact_type: "provider-check"`
- `generated_at`
- `payload.provider`
- `payload.model`
- `payload.baseUrl`
- `payload.auth.source`
- `payload.ping`

`live-verify` command を使う場合も、この artifact は同じ名前で生成される。

## Step 2: Runtime Session Preparation

example template を使って session を用意する。

```bash
node ./src/cli.js run "初回離脱率を下げたい" --project ./examples/aidlc-template
```

返ってきた `sessionPath` を控える。

続いて clarification を完了させる。

```bash
node ./src/cli.js answer \
  --session <sessionPath> \
  --response "新規登録導線全体" \
  --response "登録完了率を 5% 改善する" \
  --response "認証基盤は変更しない"
```

期待する結果:

- session が `planning` まで進む
- `contextSnapshotId` が発行される

## Step 3: Live Council Execution

次に `planning` stage を live provider で実行する。

```bash
node ./src/cli.js council-exec \
  --session <sessionPath> \
  --stage planning \
  --invoke-model \
  --provider openai-compatible \
  --model gpt-4.1-mini \
  --base-url https://api.openai.com/v1 \
  --api-key-env OPENAI_API_KEY \
  --write-artifact /tmp/aof-live-verification/planning-exec.json
```

期待する結果:

- CLI の `ok` が `true`
- `executionStatus` が `completed`
- `invokedModel` が `true`
- `execution.steps[*].result.provider` が `openai-chat-completions`
- artifact file が保存される

artifact の中には最低限、次が入る。

- `artifact_type: "council-exec"`
- `generated_at`
- `payload.executionId`
- `payload.stage`
- `payload.executionStatus`
- `payload.execution.execution_model`
- `payload.execution.steps[*].role`
- `payload.execution.steps[*].result.model`

`live-verify` command を使う場合、同じ directory に `verification-bundle.json` も生成される。
`--include-approval` を付けた場合は `approval-exec.json` も生成される。

## Optional Step 4: Approval Verification

approval semantics も live で見たい場合は `approval` stage を流す。

```bash
node ./src/cli.js council-exec \
  --session <sessionPath> \
  --stage approval \
  --invoke-model \
  --provider openai-compatible \
  --model gpt-4.1-mini \
  --base-url https://api.openai.com/v1 \
  --api-key-env OPENAI_API_KEY \
  --write-artifact /tmp/aof-live-verification/approval-exec.json
```

確認点:

- `approval_outcome` が返る
- `seat_signals` が seat ごとに保存される
- Guardian veto が使われたかどうかが確認できる

## Failure Interpretation

`provider-check` が失敗した場合は、まず runtime ではなく provider 設定を見る。

- `readiness.missing`
  - 設定不足
- `ping.ok: false` かつ HTTP status あり
  - auth / endpoint / permission 問題
- `ping.ok: false` かつ transport error
  - network / DNS / routing 問題
- `ping.ok: false` かつ invalid JSON
  - provider compatibility 問題

`council-exec` が失敗した場合は、runtime は seat/stage 文脈付きで落ちる。

例:

- `Model invocation failed for Builder during planning: ...`

この形なら、どの stage のどの seat で失敗したかを artifact なしでも追える。

## Security Notes

- API key は `--api-key-env` を使い、直接 CLI 引数へ書かない
- artifact に secret 本文は残さない
- 必要なら artifact は共有前に `baseUrl` や model 名を redact する

## Verification Exit Criteria

live provider verification を「実施済み」と言えるのは、最低でも次が揃ったときとする。

1. `provider-check` artifact がある
2. `planning council-exec` artifact がある
3. 両方で `ok` / `completed` が確認できる
4. 失敗した場合も、その failure reason が artifact か CLI output に残っている
