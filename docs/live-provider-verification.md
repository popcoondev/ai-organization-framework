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
  --archive \
  --include-approval
```

複数回の verification を比較したい場合は、後段で `verify-history` を使う。

```bash
node ./src/cli.js verify-history \
  --input /tmp/aof-live-verification \
  --input /tmp/aof-live-verification-second/verification-bundle.json \
  --artifact-dir /tmp/aof-verification-history
```

継続的に verification を蓄積したい場合は、さらに `verify-log` を使う。

```bash
node ./src/cli.js verify-log \
  --input /tmp/aof-live-verification \
  --artifact-dir /tmp/aof-verification-log
```

project-local archive として残したい場合は、`verify-archive` を使う。

```bash
node ./src/cli.js verify-archive \
  --project ./examples/aidlc-template \
  --input /tmp/aof-live-verification \
  --input /tmp/aof-live-verification-second
```

`live-verify` から直接 archive したい場合は、`--archive` を付ける。  
必要なら `--archive-dir <path>` で既定の `.aof/artifacts/verification/` を上書きしてよい。

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
14. optional な `verify-archive` による project-local archive 更新

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
さらに `latest_comparison` を見れば、earliest run と latest run の before/after をそのまま確認できる。

継続運用向けには `verification-log.json` と `verification-log.md` も生成できる。  
これは append-only に近い形で verification entries を蓄積し、同じ bundle path を重複投入しても 1 件に保つ log artifact である。
あわせて `verification-index.json` と `verification-index.md` も生成され、latest state を compact に確認できる。  
index artifact には `health_status` と `alerts` も入るため、operator は full log を掘らなくても最新の verification health を判断できる。
さらに `monitoring_policy` と `summary.alert_severity_counts` も持つため、どの field drift をどの severity で扱う設計かも index 単体で追える。
さらに `threshold_status` と `threshold_breaches` も持つため、operator は「変化がある」だけでなく「運用上の許容しきい値を超えたか」も index 単体で判断できる。

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
`--archive` を付けた場合は、その raw run が直後に project-local archive へ取り込まれ、return payload に `archiveResult` が追加される。
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
`summary.latest_comparison` を見ると、最初の run と最後の run の差分を before/after で直接確認できる。

継続的に結果を蓄積したい場合は、`verify-log` を使って `verification-log.json` と `verification-log.md` を更新する。  
こちらは durable accumulation 用で、append 後の providers/workflows/statuses summary と latest timestamp を保持する。
同時に `verification-index.json` と `verification-index.md` も更新され、latest entry と changed fields をすぐ読める。  
さらに `health_status`、`alert_count`、`alerts` が operator-facing rollup として加わる。
`monitoring_policy` と `alert_severity_counts` を見ると、field-aware な severity policy とその集計も確認できる。
`threshold_status`、`threshold_breach_count`、`threshold_breaches` を見ると、configured threshold を超えた項目もそのまま追える。
`verification-log.json` の `threshold_trend` を見ると、breach がいつから始まったか、連続何 run 続いているか、latest state が worsened / improved / stable のどれかも追える。
さらに `operator_recommendation` を見ると、latest threshold/trend に対して `investigate-drift` や `human-review-recommended` など、次に取るべき運用アクションを artifact 側で提案できる。
加えて `recommendation_trend` を見ると、推奨アクションが `continue-monitoring` から `investigate-drift` に変わったような recommendation transition も追える。
`verification-index.json` の `recommendation_summary` には、その transition の compact 版が入り、latest action、latest transition、previous action、連続同一 recommendation 数を full log なしで読める。
`verification-bundle.json` 自体にも `verification_recommendation` を持たせてあり、`verification-history` では bundle 間で recommendation action / urgency の drift も比較できる。
さらに `verification-history.json` の `summary.recommendation` には first/latest recommendation、latest transition、distinct actions が入り、長期的に recommendation がどう変わったかを compact に読める。
`verification-index.monitoring_policy` でも `verification_recommendation_action` と `verification_recommendation_urgency` を warning-level field として明示しており、recommendation drift は fallback ではなく明示ポリシーで扱う。
recommendation だけを横断的に見たい場合は、`verify-lineage` で `verification-lineage.json` と `verification-lineage.md` を生成すると、history/log/index を跨いだ recommendation lineage を 1 つの artifact にまとめられる。
`verification-lineage` には `health_status` と `alerts` も入り、history/latest/current の recommendation が噛み合っていないときは warning として拾える。
さらに `operator_recommendation` も入り、lineage divergence があるときは `investigate-lineage-drift` のような operator action をそのまま提案できる。
加えて `trend_summary` も入り、current lineage が history に対して `worsened` / `improved` / `stable` のどれか、alert の向きが `increased` / `decreased` / `stable` のどれかを compact に読める。
さらに `monitoring_policy`、`threshold_status`、`threshold_breaches` も入り、lineage divergence を operator threshold として扱える。
最上位の current-state rollup が欲しい場合は、`verify-dashboard` で `verification-dashboard.json` と `verification-dashboard.md` を生成すると、history/log/index/lineage を 1 枚に束ねて overall health、overall threshold、overall operator recommendation、aggregated alerts、aggregated threshold breaches を見られる。
さらに dashboard snapshot 自体を継続監査したい場合は、`verify-dashboard-log` で `verification-dashboard-log.json` と `verification-dashboard-log.md` を生成すると、dashboard-level の health/threshold/recommendation transition を時系列で追える。
dashboard log から latest operator state だけを compact に見たい場合は、`verify-dashboard-index` で `verification-dashboard-index.json` と `verification-dashboard-index.md` を生成すると、latest dashboard health、latest threshold、dashboard-level alerts / threshold breaches、operator recommendation を current-state artifact として読める。
project の中に durable に残したい場合は、`verify-archive` が raw verification run を `.aof/artifacts/verification/runs/` に取り込みつつ、`history`、`log`、`lineage`、`dashboard`、`dashboard-log`、`dashboard-index` までまとめて更新する。
`verification-archive-manifest.json` には archived run と source bundle path の対応が残り、同じ source bundle を再投入した場合は skip される。

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
