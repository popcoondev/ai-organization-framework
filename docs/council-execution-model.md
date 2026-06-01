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
- governance 上の独立性保証を強くは主張できない

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

## Independence Strength

execution pattern ごとの独立性強度は次のように読む。

| execution pattern | disagreement assurance | governance reading |
|---|---|---|
| `single-instance` | weak | independent disagreement は保証しない |
| `hybrid` | medium | 重要 seat だけ partial independence を主張できる |
| `multi-agent` | strongest | 最も強い disagreement / veto separation を主張できる |

ここで重要なのは、`single-instance` でも council vocabulary は使えるが、  
**独立 reviewer が本当に別判断をした** という強い保証までは出さないことである。

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

## Routing Mode Effect

execution model が同じでも、`routing_mode` によって seat 数は変わる。

### Deep Path

- planning: Builder primary + Visionary required
- proposal: Builder primary + Visionary required + Guardian optional
- review: Guardian primary + Builder required
- approval: sequential all-seat semantics

### Fast Track

- planning: Builder primary only, with explicit intent consistency check against framed Need / Intent
- proposal: Builder primary only
- review: Guardian primary only
- approval: Guardian single-reviewer approval, but only after value / intent consistency has already been recorded earlier in the branch

つまり fast-track は stage を消すのではなく、council participation を最小化する。  
minimum governance guarantees の 3 観点 coverage は保ったまま、seat participation を lighter form にしている。

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

## High-Risk Guidance

次のどれかを含む decision では、`single-instance` のまま強い governance claim をしてはならない。

1. irreversible change
2. safety or compliance exposure
3. release-critical production risk
4. high-cost veto conflict

この場合の推奨は次である。

- minimum acceptable: `hybrid`
- stronger claim: `multi-agent`

つまり、high-risk decision では `Council of Three` の seat 名だけで安心してはならず、  
execution pattern も一緒に見る必要がある。

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

## Decision Record Requirement

Decision Record には、少なくとも次の execution metadata を残す。

1. execution pattern
2. independent review の有無
3. veto seat が independent path だったか

これが無い場合、後から governance assurance の強さを正しく読めない。

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
