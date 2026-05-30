# Runtime Prototype Plan

first local prototype の目的は、spec 全体を実装し切ることではない。  
`.aof/` template を読み、trigger から session persistence までを実際に通せることを確認することにある。

## Scope

prototype v0 は次に限定する。

1. CLI trigger only
2. local filesystem only
3. one template only at a time
4. session file emission
5. provider-backed execution is still prototype-grade and currently verified with the mock adapter by default

## Current First Cut

最初の cut は次を行う。

1. `aof run "<request>" --project <path>`
2. `.aof/aof.yaml` を load
3. default workflow を解決
4. `sessions/*.json` を 1 件生成
5. initial `decisions/*.md` と `decisions/*.json` を 1 件生成
6. root manifest と主要 component の basic validation を行う
7. initial clarification gaps と first-round questions を session に保存する
8. prototype council execution trace を session に保存する
9. template manifest, session, and decision record を schema-driven に validate する
10. provider-backed model adapter 経由で council execution result を保存する
11. approval failure を human escalation state に遷移させる
12. human escalation decision を session lifecycle に取り込む
13. clarification completion 時に planning-stage decision record を追加発行する
14. runtime transition に対する automated tests を持つ
15. CI から `npm test` と CLI smoke test を自動実行する
16. project-local decision markdown shell と local decision schema を runtime で利用する
17. CLI-spawning tests は Node loader の揺れを避けるため、test runner を直列実行に固定する

## Next Milestones

1. live OpenAI-compatible provider verification
2. routing-mode-aware reopen and approval policy refinement
3. CI で拾える contract drift を増やすため smoke coverage を広げる

## Provider Failure Coverage

network を使う live verification と別に、runtime は provider failure path も test で固定する。

- `provider-check --ping` が HTTP failure をどう返すか
- `provider-check --ping` が transport failure / invalid JSON をどう返すか
- `council-exec --invoke-model` が provider misconfiguration でどの seat / stage で落ちたか
- `council-exec --invoke-model` が transport failure / invalid JSON を seat/stage 付きで返すこと
- provider failure 時に partial council execution が session に永続化されないこと

## Provider Verification Path

live provider verification に入る前に、`aof provider-check` で次を切り分けられるようにする。

1. provider / model / base URL / auth source の正規化
2. invocation readiness の確認
3. openai-compatible provider に対する optional ping

この command は session state を変更しない preflight path として扱う。
さらに `--write-artifact <path>` で verification evidence を JSON として保存できるようにして、manual live verification の結果を後から追えるようにする。

同様に `aof council-exec --invoke-model --write-artifact <path>` でも stage execution result を evidence として保存できるようにする。

実行手順の正本は [docs/live-provider-verification.md](docs/live-provider-verification.md) を参照する。
また、prototype には preflight と planning execution、必要なら proposal/review/approval execution、さらに signal reopen と human escalation reopen からの resume execution、および human escalation の approve/stop terminal resolution までまとめて回す `live-verify` command を持たせる。
`verification-bundle.json` には execution policy と artifact inventory だけでなく、branch ごとの結果要約を持つ `branch_outcomes`、branch ごとの実行方針を要約する `branch_policies`、verification 前提を固定する `verification_context`、そして provider response metadata の stage summary をまとめた `provider_observability` も残す。
さらに `verification-report.md` を同時生成して、人間が bundle を読まずに verification の全体像を確認できるようにする。
複数回の verification を比較するために、`verify-history` command で `verification-history.json` と `verification-history.md` も生成できるようにする。
history artifact には drift summary を持たせて、run 間で何が変化したかを明示できるようにする。
さらに earliest/latest の comparison summary を持たせて、net change を before/after で確認できるようにする。
継続的な verification accumulation のために、append-oriented な `verify-log` command と `verification-log.json` / `verification-log.md` も持たせる。
`verification-log` には threshold trend も持たせ、breach の開始点、連続 breach run 数、latest trend を accumulated artifact として読めるようにする。
さらに operator-facing recommendation も持たせ、threshold/trend の結果から次の運用アクションを compact に導けるようにする。
recommendation 自体の transition も tracked し、監視継続から investigation 推奨へ切り替わったような時系列変化も accumulated artifact で読めるようにする。
さらに compact な current-state 読み出し用に `verification-index.json` / `verification-index.md` も同時生成する。
index artifact には operator-facing の `health_status` と `alerts` も持たせ、latest verification health を full history なしで判断できるようにする。
さらに field-aware な `monitoring_policy` と `alert_severity_counts` を持たせ、どの drift/change がどの重さで扱われるかも明示する。
さらに `threshold_status` と `threshold_breaches` を持たせ、operator が latest verification state の breach 判定まで compact artifact で見られるようにする。

## Smoke Coverage

現在の CLI smoke は次を通す。

1. `run -> answer -> council-exec(planning) -> council-exec(approval)` の happy path
2. `run -> answer -> council-exec(proposal) -> council-exec(review)` の deep-path middle-stage path
3. `run -> answer -> council-exec(proposal) -> council-exec(review)` の fast-track middle-stage path
4. `run -> answer -> council-exec(approval reject) -> escalation-resolve(reopen|approve|stop)` の escalation path
5. `run -> answer -> signal(reopen) -> answer -> council-exec(proposal) -> council-exec(review)` の external-signal reopen-and-resume path

これにより、CI で planning / proposal / review / approval に加えて、fast-track と deep-path の routing 差分、human escalation lifecycle の 3 分岐、external change reopen、そして signal / escalation の両 reopen 経路からの workflow resume も拾える。

## Clarification Language

clarification phase の user-facing copy は `organization.language` で切り替える。

- `ja`: 日本語の question / rationale / clarification summary
- `en`: 英語の question / rationale / clarification summary

現在の prototype は `ja` と `en` のみを標準サポートし、未指定時は `ja` を使う。

## Decision Template Handling

`templates/decision-record.md` は human-facing stub ではなく、runtime が実際に使う markdown shell とする。  
最低限、次の placeholder を含む必要がある。

- `{{decision_id}}`
- `{{decision_record_content}}`

`templates/decision-record.schema.json` は project-local companion contract として扱い、runtime は bundled canonical schema に加えてこれも validate する。
