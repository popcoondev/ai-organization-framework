# AOF v3 Diagnosis Coverage Outline

Date: `2026-06-15`

## Why Separate Diagnosis

review が weak artifact を検知できても、
その weakness の organizational cause を誤る可能性がある。

したがって diagnosis は review の自由記述ではなく、
独立 coverage として扱う。

## Candidate Failure Modes

- artifact quality issue is detected but root cause is wrong
- artifact fix と organization fix が混同される
- role gap と loop gap を区別できない
- council composition or allocation policy の原因を見落とす
- diagnosis confidence が不適切に高い

## Candidate Structured Fields

- diagnosis_category
- diagnosis_confidence
- diagnosis_evidence_refs
- artifact_fix_recommendations
- organization_fix_recommendations

## Next Step

Diagnosis coverage matrix と benchmark case set を v3.x で追加する。
