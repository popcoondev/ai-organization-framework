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
| Outcome illusion | 綺麗な artifact なのに value がない | `OC-001` | runtime-generated verdict exists | add complementary vanity-like and external-value families | P0 |
| User rejection | operator や end user が実際には拒否する | `OC-002` | runtime-generated verdict exists | extend into additional rejection-source and value-claim families | P0 |
| Vanity success | 局所 KPI は良いが本質価値がない | `OC-003` | recorded verdict exists | extend into runtime-generated metric/value challenge traces | P1 |
| Learning disconnect | outcome miss が次 loop に反映されない | `OC-004` | runtime-generated verdict exists | add complementary fail-to-improve and self-audit reinforced families | P0 |

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

1. `OC-001` から `OC-004` までは recorded verdict が入った
2. `OC-002` は runtime-generated fail/reopen trace まで前進し、operator rejection が next loop に retained されることを示した
3. `OC-004` は runtime-generated miss-retention trace まで前進し、outcome miss が learning loop に残ることを示した
4. `OC-001` は runtime-generated positive-proof contrast case まで前進した
5. 残る gap は `OC-003` と complementary `OC-004` fail-to-improve families である

## Required Next Moves

1. `OC-003` の claimed metric / actual value drift を runtime-generated traces へ広げる
2. `OC-004` に fail-to-improve と self-audit reinforced family を追加する
3. `OC-002` / `OC-001` を追加の rejection-source and external-value families に広げる

## Conclusion

Outcome coverage が弱い限り、
AOF は「正しく動いた」ことは示せても
「価値を出した」ことは示せない。  
したがって v3 の benchmark では独立 matrix が必要である。
