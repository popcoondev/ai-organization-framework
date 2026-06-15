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
| Human-low / AI-high conflict | 人間の低評価を AI が吸収できない | `RV-002` | case defined | recorded verdict なし | P0 |
| Before/after evidence drift | 改善主張に具体的差分がない | `RV-003` | case defined | before/after verdict なし | P1 |
| Loop non-improvement | 複数 loop を回しても本質改善しない | `RV-004` | case defined | loop trace verdict なし | P1 |
| Runtime bypass | orchestrator が runtime を避ける | `RD-001` | policy + verification added | explicit fail verdict なし | P0 |
| Partial artifact chain | task はあるが join/review が欠ける | `RD-002` | policy + verification added | explicit fail verdict なし | P0 |
| Human audit unreconstructability | runtime だけでは人間が追えない | `RD-004` | proof chain exists | human audit verdict なし | P1 |
| Organization diagnosis miss | artifact weakness を role/loop 問題に変換できない | `RV-001` to `RV-004` requirement only | partially structured | diagnosis-specific coverage still missing | P0 |

## Current Interpretation

2026-06-15 時点で、AOF runtime は
**orchestration chain を artifact 化して self-hosting loop を通す**
ことには成功している。

一方で、review coverage はまだ benchmark-ready の途中段階であり、
特に次の弱さが残る。

1. negative recorded verdict がまだ不足している
2. `RV-002` / `RV-003` / `RV-004` の recorded coverage が未完了である
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

- diagnosis category
- diagnosis confidence
- diagnosis evidence refs

したがって、
**review benchmark は前進したが diagnosis benchmark はまだ独立していない。**

## Required Next Moves

1. `RV-002` の human-low / ai-high conflict artifact を追加する
2. `RD-001` と `RD-002` の explicit fail verdict を保存する
3. `RV-003` と `RV-004` の before/after と multi-loop verdict を保存する
4. diagnosis coverage を `TASK-032` で独立 artifact 化する
5. outcome coverage を `TASK-033` で独立 artifact 化する

## Conclusion

最新 runtime での loop proof は成功している。  
未完成なのは loop そのものではなく、
**review をどれだけ厳しく、構造的に、human-facing に検証できるか**
である。
