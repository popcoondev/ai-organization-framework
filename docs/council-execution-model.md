# Council Execution Model

AI Organization Framework における `Council of Three` の実行モデル仕様。

## Conclusion

prototype の既定実装は `single-instance role switching` とする。  
中長期の拡張先としては `hybrid` を推奨し、`full multi-agent` は optional advanced mode とする。

つまり:

1. prototype default: `single-instance role switching`
2. recommended scale-up path: `hybrid`
3. optional advanced mode: `multi-agent`

## Why

`Council of Three` の concept 自体は governance だが、runtime で実現するには execution pattern を決める必要がある。  
最初から full multi-agent にすると、message 数、同期、trace、cost が急増し、prototype の学習コストが高すぎる。

## Three Execution Patterns

### 1. Single-Instance Role Switching

1 つの model instance が、stage-role matrix に従って `active_role` を切り替えながら働く。

特徴:

- 実装が最も軽い
- trace は runtime 側でまとめやすい
- packet assembly の検証に向く

弱み:

- role separation が最も弱い
- seat 間の truly independent disagreement を作りにくい

### 2. Full Multi-Agent

seat ごとに独立 model call または独立 actor instance を回す。

特徴:

- role separation が最も強い
- disagreement, review, veto の表現が自然

弱み:

- cost が高い
- synchronization が重い
- lightweight task に過剰

### 3. Hybrid

通常 stage は single-instance role switching で回し、必要な review / approval / veto だけ独立 seat call を追加する。

特徴:

- 実装コストと role separation のバランスがよい
- primary-led flow と stage-role matrix に合う

弱み:

- runtime orchestration が少し複雑
- いつ split するかの rule が必要

## Default Decision

prototype では `single-instance role switching` を default にする。

理由:

1. `stage-role matrix` が primary-led packet を前提にしている
2. `Model Input Packet` の妥当性を先に検証したい
3. trace / persistence / reopen の実装を先に固めたい
4. full multi-agent はその後でも遅くない

## Runtime Mapping

### Single-Instance Role Switching

runtime は 1 stage ごとに:

1. primary seat を matrix から決める
2. `active_role` をその seat に設定する
3. その seat 向け packet を assemble する
4. model call を 1 回行う
5. 必要なら participating seat の follow-up call を追加する

## Participating Seat Handling

prototype default では、participating seats は常時並列にしない。

標準ルール:

- `required` participating seat は sequential follow-up call
- `optional` participating seat は risk or ambiguity threshold を超えたときだけ call

## Approval and Veto

single-instance default でも、approval を 1 call に潰してよいとはしない。

標準ルール:

1. `review` stage では Guardian primary call を行う
2. `approval` stage では all-seat semantics を runtime が再現する
3. prototype では all-seat semantics を sequential role-switched calls で代替してよい
4. Guardian veto は独立 approval result として記録する

## Decision Thread Mapping

1 つの decision thread に対して、runtime は seat-specific subcalls を持てる。

例:

- `thr-001 / clarification / Visionary`
- `thr-001 / proposal / Builder`
- `thr-001 / review / Guardian`
- `thr-001 / approval / Visionary`
- `thr-001 / approval / Builder`
- `thr-001 / approval / Guardian`

thread は 1 本、seat call は複数、という関係である。

## Hybrid Upgrade Path

次の条件で `hybrid` に上げるのが自然である。

1. high-risk task
2. high ambiguity task
3. required independent review
4. repeated disagreement

その場合:

- primary stage flow は single-instance
- Guardian review / approval だけ independent call
- human escalation も independent path

## Why Hybrid Is the Long-Term Recommendation

最終的には `hybrid` が最も実務的である。

理由:

1. majority of stages are cheap
2. review and veto need stronger separation
3. fast track and deep path の両方に合わせやすい

## Message and Packet Rule

execution pattern が変わっても、次は変えない。

1. `stage-role matrix`
2. `Model Input Packet`
3. `Actor Communication Protocol`
4. `Decision Record`

つまり、execution model は orchestration の違いであり、spec surface の破壊ではない。

## Prototype Recommendation Table

| concern | prototype default |
|---|---|
| clarification | single-instance / Visionary |
| planning | single-instance / Builder |
| proposal | single-instance / Builder |
| review | single-instance / Guardian |
| approval | sequential role-switched all-seat calls |
| veto | Guardian approval result |
| deadlock escalation | separate human or maintainer path |

## Non-Goal

この文書はまだ seat-specific independent memory や provider-mixed councils を標準化しない。  
そこは future advanced mode とする。
