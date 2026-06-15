# AOF v3 Diagnosis Coverage Matrix

Date: `2026-06-15`

## Purpose

Diagnosis coverage は、
artifact weakness を検知したあとに
**その weakness を正しい organizational cause に変換できるか**
を検証する benchmark surface である。

review correctness と diagnosis correctness は同一ではない。

## Coverage Matrix

| Failure mode | What can go wrong | Benchmark case | Current runtime status | Gap | Priority |
|---|---|---|---|---|---|
| Wrong root cause | quality issue は見えているが原因が外れている | `DG-001` | recorded verdict exists | extend beyond fixture-level root-cause checks | P0 |
| Artifact/org fix confusion | artifact fix と organization fix が混同される | `DG-002` | recorded verdict exists | add additional recurrent-pattern cases | P0 |
| Role/loop misclassification | role gap と loop gap を取り違える | `DG-003` | recorded verdict exists | extend beyond fixture-level loop traces | P0 |
| Allocation blind spot | team/council/resource の原因を見落とす | `DG-004` | runtime-generated verdict exists | extend into broader diagnosis families and first-class task automation | P1 |

## Structured Runtime Fields

`council-review-packet` で最低限次を保持する。

- `diagnosis_category`
- `diagnosis_confidence`
- `diagnosis_evidence_refs`
- `artifact_change_recommendations`
- `organization_change_recommendations`

これにより diagnosis は自由記述だけでなく、
machine-checkable な review surface になる。

## Interpretation

2026-06-15 時点で AOF v3 は
diagnosis field の受け皿を持てる状態まで前進した。

ただし未完成なのは次である。

1. `DG-001` から `DG-004` までは recorded verdict が入った
2. `DG-004` は runtime-generated follow-up task evidence まで前進し、allocation diagnosis が action artifact に変換されることを示した
3. 残る gap は broader diagnosis families と review packet producer 全体での diagnosis field 一貫利用である

## Required Next Moves

1. `DG-003` の role gap / loop gap family を runtime-generated traces へ広げる
2. diagnosis-to-task generation を runtime の first-class path に近づける
3. diagnosis field を review packet producer 全体へ広げる

## Conclusion

Diagnosis coverage は review coverage の注釈ではない。  
独立した benchmark matrix として扱うべきであり、
v3 系の organizational effectiveness proof に直結する。
