# AOF v3 Runtime Coverage Matrix

Date: `2026-06-15`

## Purpose

この matrix は、AOF runtime の benchmark coverage を
**runtime stage 全体の正しさ**
として整理する top-level artifact である。

`review coverage` はこの中の 1 断面であり、
runtime correctness 全体を代表するものではない。

## Runtime Stages

| Runtime stage | What must be correct | Example failure class | Current coverage surface |
|---|---|---|---|
| Framing | 解くべき問題と制約が正しく定義される | wrong problem definition | partial |
| Allocation | 適切な role / team / resource が割り当てられる | wrong role assignment | partial |
| Execution | 必要 artifact chain が生成される | missing artifact generation | strong |
| Review | artifact quality が正しく判定される | weak artifact accepted | in progress |
| Diagnosis | weakness が正しい organizational cause に変換される | wrong root cause diagnosis | weak |
| Learning | 改善が retained され次 loop に反映される | improvement not retained | weak |
| Outcome | 実行が real-world value に繋がる | value illusion | weak |

## Coverage Structure

### 1. Runtime Coverage

top-level では次を問う。

- どの stage が failure したか
- その failure は benchmark artifact で再現可能か
- runtime がその failure を検知または記録できるか

### 2. Review Coverage

`review coverage` は Review stage の sub-matrix とする。  
現行 [v3-review-coverage-matrix.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/v3-review-coverage-matrix.md) はこの層に位置づく。

### 3. Diagnosis Coverage

Diagnosis は review rationale の一部ではなく、
独立 capability として扱う。

問うべきこと:

- weak artifact を見つけられたか
- root cause を正しく特定できたか
- artifact fix と organization fix を区別できたか

現行 [v3-diagnosis-coverage-matrix.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/v3-diagnosis-coverage-matrix.md) はこの層に位置づく。

### 4. Outcome Coverage

artifact correctness や auditability が高くても、
user value がゼロなら organizational success ではない。

したがって outcome は独立 coverage surface とする。

現行 [v3-outcome-coverage-matrix.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/v3-outcome-coverage-matrix.md) はこの層に位置づく。

## Current State

2026-06-15 時点の AOF v3 は次の状態にある。

- Execution coverage: strong
- Review coverage: improving
- Diagnosis coverage: weak
- Learning coverage: weak
- Outcome coverage: weak

これは AOF v3 が
**orchestration proof**
には成功しているが、
**organizational effectiveness proof**
にはまだ到達していないことを意味する。

## Proposed Artifact Hierarchy

1. Runtime Coverage Matrix
2. Review Coverage Matrix
3. Diagnosis Coverage Matrix
4. Outcome Coverage Matrix

この階層で benchmark surface を分割する。

## Immediate Implication

次の milestone は orchestration capability の追加ではない。  
次の milestone は
**coverage expansion**
である。

優先順:

1. Review coverage を fail/pass verdict で埋める
2. Diagnosis coverage を recorded verdict で埋める
3. Outcome coverage を value benchmark verdict で埋める

## Conclusion

提案の要点は妥当である。  
今後の AOF は `review correctness` だけでなく、
`runtime correctness -> diagnosis correctness -> outcome correctness`
へ benchmark 軸を広げるべきである。
