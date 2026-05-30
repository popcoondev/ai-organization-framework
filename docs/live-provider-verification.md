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
  --include-middle-stages \
  --include-signal-reopen \
  --include-escalation-reopen \
  --include-escalation-terminal \
  --timeout-ms 30000 \
  --max-retries 1 \
  --artifact-dir /tmp/aof-live-verification \
  --include-approval
```

複数回の verification を比較したい場合は、後段で `verify-history` を使う。

```bash
node ./src/cli.js verify-history \
  --input /tmp/aof-live-verification \
  --input /tmp/aof-live-verification-second/verification-bundle.json \
  --artifact-dir /tmp/aof-verification-history
```

この command は次を順に実行する。

1. `provider-check`
2. `run`
3. `answer`
4. `council-exec --stage planning`
5. optional な `council-exec --stage proposal`
6. optional な `council-exec --stage review`
7. optional な `signal -> answer`
8. optional な reopened session に対する `council-exec --stage proposal/review`
9. optional な `approval reject -> escalation-resolve(reopen) -> answer`
10. optional な escalation-reopened session に対する `council-exec --stage proposal/review`
11. optional な `approval reject -> escalation-resolve(approve|stop)`
12. optional な `council-exec --stage approval`
13. `verification-bundle.json` と `verification-report.md` の保存

bundle には execution policy も保存される。  
少なくとも次が入る。

- provider
- model
- base URL source
- API key source
- ping requested
- include middle stages
- include signal reopen
- include escalation reopen
- include escalation terminal
- include approval
- routing mode
- timeout ms
- max retries
- response count
- default responses を使ったかどうか

さらに `branch_outcomes` も保存される。  
ここには happy path、signal reopen、human escalation の各 branch について、approval / reopen / terminal resolution の要約状態が入る。

さらに `branch_policies` も保存される。  
ここには branch ごとの effective routing mode、resolution policy、middle-stage 実行有無など、結果に至る実行方針の要約が入る。

加えて `verification_context` も保存される。  
ここには organization、workflow、governance、policy profile、decision template path が入るため、bundle 単体で「どの組織設定で取った evidence か」を追える。

加えて、provider の観測情報をまとめた `provider_observability` も保存される。  
ここには stage ごとの request id、processing time、rate-limit 残量が summary で入るため、個別 artifact を掘らなくても live 実行の概況を追える。

さらに `verification-report.md` も保存される。  
これは bundle の要約を人間向けに整形したもので、verification context、execution policy、branch outcomes、branch policies、provider observability、artifact inventory を 1 枚で読める。

さらに、複数の bundle をまとめて読む必要がある場合は `verification-history.json` と `verification-history.md` を生成できる。  
これは provider / workflow / routing / outcome の drift を run 間で比較するための集約 artifact である。
history artifact には `drift` summary も入り、provider、model、routing mode、主要 branch outcome のどこが変わったかを明示できる。

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

実 provider を使う場合、allowlist に入った response headers も `provider_metadata.response_headers` に保存される。  
想定する用途は次である。

- request trace の追跡
- provider processing time の確認
- rate-limit 残量の確認

`live-verify` command を使う場合、同じ directory に `verification-bundle.json` と `verification-report.md` も生成される。
`--include-middle-stages` を付けた場合は `proposal-exec.json` と `review-exec.json` も生成される。
`--include-signal-reopen` を付けた場合は `signal-reopen.json` と、middle stage を併用していれば `signal-resume-proposal-exec.json` / `signal-resume-review-exec.json` も生成される。
`--include-escalation-reopen` を付けた場合は `escalation-reopen.json` と、middle stage を併用していれば `escalation-resume-proposal-exec.json` / `escalation-resume-review-exec.json` も生成される。
`--include-escalation-terminal` を付けた場合は `escalation-approve-resolution.json` / `escalation-stop-resolution.json` と、それぞれに対応する approval execution artifact も生成される。
`--include-approval` を付けた場合は `approval-exec.json` も生成される。
bundle には artifact inventory も入り、どの JSON file がどこに書かれたか追える。
`verification-report.md` を開けば、同じ inventory を Markdown でそのまま追える。
また `branch_outcomes` を見れば、各 branch が `approved` / `reopened` / `closed` / `stopped` のどこへ落ちたかを raw artifact を辿らずに読める。
`branch_policies` を見れば、その結果がどの routing / resolution 方針で得られたかも bundle 単体で確認できる。
`verification_context` を見れば、その bundle がどの workflow / governance / policy profile / template path で生成されたかも分かる。
実 provider を使った場合は、`verification-bundle.json` の `provider_observability.planning` / `proposal` / `review` / `signal_resume_proposal` / `signal_resume_review` / `escalation_approval` / `escalation_resume_proposal` / `escalation_resume_review` / `escalation_approve_approval` / `escalation_stop_approval` / `approval` を見ると、主要 header を stage 単位で確認できる。

複数回の verification を比較したい場合は、最後に `verify-history` を実行して `verification-history.json` と `verification-history.md` を作る。  
ここには bundle ごとの provider/model、workflow context、branch outcome、branch policy、observed provider stage count が run ごとに並ぶ。
さらに `summary.drift` を見ると、どの field が run 間で変化したかを raw entry を見比べずに読める。

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
