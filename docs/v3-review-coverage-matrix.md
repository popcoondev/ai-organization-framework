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
| False positive review | Weak artifact が green になる | `RV-001` | fixture-ready | recorded verdict なし | P0 |
| Human-low / AI-high conflict | 人間の低評価を AI が吸収できない | `RV-002` | case defined | recorded verdict なし | P0 |
| Before/after evidence drift | 改善主張に具体的差分がない | `RV-003` | case defined | before/after verdict なし | P1 |
| Loop non-improvement | 複数 loop を回しても本質改善しない | `RV-004` | case defined | loop trace verdict なし | P1 |
| Runtime bypass | orchestrator が runtime を避ける | `RD-001` | policy + verification added | explicit fail verdict なし | P0 |
| Partial artifact chain | task はあるが join/review が欠ける | `RD-002` | policy + verification added | explicit fail verdict なし | P0 |
| Human audit unreconstructability | runtime だけでは人間が追えない | `RD-004` | proof chain exists | human audit verdict なし | P1 |
| Organization diagnosis miss | artifact weakness を role/loop 問題に変換できない | `RV-001` to `RV-004` requirement only | not structurally enforced | review packet schema gap | P0 |

## Current Interpretation

2026-06-15 時点で、AOF runtime は
**orchestration chain を artifact 化して self-hosting loop を通す**
ことには成功している。

一方で、review coverage はまだ benchmark-ready の途中段階であり、
特に次の弱さが残る。

1. negative recorded verdict が不足している
2. human-facing quality failure が schema 上で独立して表現されていない
3. organization diagnosis が `rationale` の自由記述に埋もれている

## Review Packet Gap

現行 `council-review-packet` schema には次の独立 field がない。

- target audience
- expected user or buyer reaction
- concrete blocking reasons
- artifact-local fix と organization-level fix の区別
- human override or disconfirmation signal

このため benchmark は回せるが、
**benchmark 観点の抜け漏れを runtime が機械的に検証することはまだ難しい。**

## Required Next Moves

1. `RV-001` を recorded fail/pass verdict として保存する
2. `RV-002` の human-low / ai-high conflict artifact を追加する
3. `RD-001` と `RD-002` の explicit fail verdict を保存する
4. `council-review-packet` schema に audience-facing review fields を追加する
5. `organization diagnosis` を review artifact 上で独立検証できるようにする

## Conclusion

最新 runtime での loop proof は成功している。  
未完成なのは loop そのものではなく、
**review をどれだけ厳しく、構造的に、human-facing に検証できるか**
である。
