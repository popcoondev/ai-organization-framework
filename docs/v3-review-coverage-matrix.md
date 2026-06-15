# AOF v3 Review Coverage Matrix

Date: `2026-06-15`

## Purpose

この文書は、AOF の review runtime が
「何を見落とすと未完成とみなすか」
を failure taxonomy として固定するための matrix である。

単にレビュー回数を増やすのではなく、
**異なる failure mode を個別に検知し、artifact と runtime に落とし込めているか**
を確認する。

## Coverage Matrix

| Failure mode | What can go wrong | Current benchmark coverage | Latest runtime status | Gap | Priority |
|---|---|---|---|---|---|
| False positive review | Weak artifact が green になる | `RV-001` | recorded verdict exists | extend to additional weak-artifact families | P0 |
| Human-low / AI-high conflict | 人間の低評価を AI が吸収できない | `RV-002` | runtime-generated verdict exists | extend into additional human disconfirmation and weak-artifact reopen families | P0 |
| Before/after evidence drift | 改善主張に具体的差分がない | `RV-003` | runtime-generated verdict exists | extend into additional runtime-generated before/after families | P1 |
| Loop non-improvement | 複数 loop を回しても本質改善しない | `RV-004` | runtime-generated verdict exists | extend into additional runtime-generated loop families | P1 |
| Runtime bypass | orchestrator が runtime を避ける | `RD-001` | generated negative-trace runner pass recorded | broaden into stricter audit-cost enforcement | P0 |
| Partial artifact chain | task はあるが join/review が欠ける | `RD-002` | generated negative-trace runner pass recorded | broaden from single broken-chain shape into additional failure families | P0 |
| Human audit unreconstructability | runtime だけでは人間が追えない | `RD-004` | runner pass recorded | broader audit automation is still limited | P1 |
| Organization diagnosis miss | artifact weakness を role/loop 問題に変換できない | `RV-001` to `RV-004` requirement only | partially structured | diagnosis-specific coverage still missing | P0 |

## Current Interpretation

2026-06-15 時点で、AOF runtime は
**orchestration chain を artifact 化して self-hosting loop を通す**
ことには成功している。

一方で、review coverage はまだ benchmark-ready の途中段階であり、
特に次の弱さが残る。

1. `RV-002` は runtime-generated reopen trace まで前進し、人の却下シグナルが runtime 上で reopen に変換されることを示した
2. `RV-003` と `RV-004` は runtime-generated evidence まで前進し、残る gap は family 数と fail/reopen runtime traces である
3. organization diagnosis が review packet 上で部分的にしか構造化されていない

## Review Packet Gap

`TASK-031` により、現行 `council-review-packet` schema には次の baseline field が追加された。

- target audience
- expected user or buyer reaction
- concrete blocking reasons
- artifact-local fix と organization-level fix の区別
- human override or disconfirmation signal

これにより `RV-001` のような human-facing weak artifact rejection は
構造的に記録できるようになった。

一方で、次はまだ足りない。

- diagnosis recorded verdicts
- multi-case diagnosis fixtures
- outcome-side value verdicts

したがって、
**review benchmark は前進し、diagnosis benchmark は独立した。  
未完了なのは recorded verdict coverage である。**

## Required Next Moves

1. `RV-002` の runtime-generated reopen trace を、明示的な weak-artifact と human-low family に広げる
2. `RV-003` / `RV-004` の runtime-generated family 数を増やし、fail/reopen traces に広げる
3. `RD-001` / `RD-002` は generated negative traces まで進んだので、次は `RD-004` の audit automation と stricter cost checks を拡張する
4. diagnosis / outcome benchmark を runtime-generated fail and reopen traces に広げる

## Conclusion

最新 runtime での loop proof は成功している。  
未完成なのは loop そのものではなく、
**review をどれだけ厳しく、構造的に、human-facing に検証できるか**
である。
