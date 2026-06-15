# AOF v3 Outcome Coverage Matrix

Date: `2026-06-15`

## Purpose

Outcome coverage は、
artifact quality と runtime auditability が十分でも
**user value / business value が成立しているか**
を検証する benchmark surface である。

## Coverage Matrix

| Failure mode | What can go wrong | Benchmark case | Current runtime status | Gap | Priority |
|---|---|---|---|---|---|
| Outcome illusion | 綺麗な artifact なのに value がない | `OC-001` | recorded verdict exists | extend from fixture policy into runtime-generated cases | P0 |
| User rejection | operator や end user が実際には拒否する | `OC-002` | recorded verdict exists | add a full runtime fail/reopen trace | P0 |
| Vanity success | 局所 KPI は良いが本質価値がない | `OC-003` | weak | metric-to-value distinction verdict なし | P1 |
| Learning disconnect | outcome miss が次 loop に反映されない | `OC-004` | recorded verdict exists | extend into runtime-generated miss traces | P0 |

## Required Evidence Surface

Outcome benchmark では最低限次を結ぶ必要がある。

- `outcome-report`
- `learning-loop`
- reviewer or operator note
- claimed success metric
- rejected or retained next action

## Interpretation

2026-06-15 時点で AOF v3 は
`outcome-report` と `learning-loop` を持つため、
outcome coverage の足場自体はある。

一方で、足りないのは outcome quality を問う benchmark である。

1. `OC-001` / `OC-002` / `OC-004` には recorded verdict が入った
2. success が real value か vanity success かを見分ける verdict はまだ不足している
3. outcome miss から次 loop への学習接続は baseline verdict が入ったが、runtime-generated miss trace はまだ不足している

## Required Next Moves

1. `OC-003` の recorded verdict を追加する
2. claimed metric と actual user value のズレを case 化する
3. outcome miss を learning-loop に反映した runtime-generated fail-to-improve case を作る

## Conclusion

Outcome coverage が弱い限り、
AOF は「正しく動いた」ことは示せても
「価値を出した」ことは示せない。  
したがって v3 の benchmark では独立 matrix が必要である。
