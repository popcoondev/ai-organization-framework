# Runtime Prototype Plan

first local prototype の目的は、spec 全体を実装し切ることではない。  
`.aof/` template を読み、trigger から session persistence までを実際に通せることを確認することにある。

## Scope

prototype v0 は次に限定する。

1. CLI trigger only
2. local filesystem only
3. one template only at a time
4. session file emission
5. no provider-backed governance execution yet

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

## Next Milestones

1. provider-backed model adapter integration
2. council execution result persistence beyond prepared trace
