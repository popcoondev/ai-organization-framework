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
| Allocation blind spot | team/council/resource の原因を見落とす | `DG-004` | weak | allocation-side diagnosis case が未定着 | P1 |

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

1. `DG-001` から `DG-003` までは recorded verdict が入った
2. allocation / role / loop / council の原因分類はまだ benchmark で十分に分岐していない
3. review packet producer 全体で diagnosis field が一貫利用されていない

## Required Next Moves

1. `DG-004` の recorded verdict を追加する
2. role gap / loop gap / allocation gap の誤診ケースをさらに fixture 化する
3. diagnosis evidence から follow-up task を起こす runtime path を benchmark する

## Conclusion

Diagnosis coverage は review coverage の注釈ではない。  
独立した benchmark matrix として扱うべきであり、
v3 系の organizational effectiveness proof に直結する。
