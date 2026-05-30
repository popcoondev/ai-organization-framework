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

## Smoke Coverage

現在の CLI smoke は次を通す。

1. `run -> answer -> council-exec(planning) -> council-exec(approval)` の happy path
2. `run -> answer -> council-exec(proposal) -> council-exec(revi