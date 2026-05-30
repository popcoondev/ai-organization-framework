# Runtime Prototype Plan

first local prototype の目的は、spec 全体を実装し切ることではない。  
`.aof/` template を読み、trigger から session persistence までを実際に通せることを確認することにある。

## Scope

prototype v0 は次に限定する。

1. CLI trigger only
2. local filesystem only
3. one template only at a time
4. session file emission
5. no full governance execution yet

## Current First Cut

最初の cut は次を行う。

1. `aof run "<request>" --project <path>`
2. `.aof/aof.yaml` を load
3. default workflow を解決
4. `sessions/*.json` を 1 件生成

## Next Milestones

1. template schema validation
2. decision record emission
3. clarification persistence
4. reopen from signal file
5. model input packet assembly
6. stage-role matrix driven council execution
7. prototype default council execution
