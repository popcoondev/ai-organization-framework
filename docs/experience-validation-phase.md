# Experience Validation Phase

AI Organization Framework における `v1.6` の `experience-validation` 仕様。

## Position

`experience-validation` は、specification completeness の後ろに置く装飾的 review ではない。  
downstream confidence を上げる前に、

- いま見えている artifact が intended experience に近いか
- authoring / viewer の感触が期待からずれていないか

を確認する all-product phase である。

## Minimum Inputs

phase に入る前に、最低限次を持つ。

1. `North Star Goal`
2. `Current Operating Goal`
3. `Next Value Slice`
4. current expectation note
5. current proof target

## Minimum Outputs

次の最低出力を残す。

1. live artifact or executable proof
2. screenshot set or equivalent visible proof
3. interaction proof when interaction matters
4. expectation alignment note
5. mismatch note or explicit `no mismatch observed`

## Exit Rule

次のどちらかを言えない限り、この phase は抜けない。

1. current value slice is sufficiently aligned for the next scale-up step
2. `expectation-mismatch` has been raised and routed

`looks logically correct` だけでは exit 条件にならない。

## Review Preference

レビューは目に見える proof を優先する。

1. live artifact
2. screenshot set
3. interaction proof
4. diagram / sequence / flow
5. text-only explanation

## Fidelity Split

この phase では、少なくとも次を分けて見る。

1. `viewer fidelity`
2. `editor or authoring fidelity`

軽量 viewer の見え方がよくても、authoring interaction が intended workflow とずれていれば aligned とは言わない。

## Relationship To Value Alignment Loop

`experience-validation` は loop の外にある固定 review ではない。  
結果は `Value Alignment Loop` に戻る。

- aligned:
  - next scale-up に進む
- mismatch:
  - repeated confirmation と scale reset に戻る

## Failure Modes

- spec proof だけで phase を閉じる
- screenshot proof が無い
- live artifact を見ずに intended experience を主張する
- viewer fidelity と authoring fidelity を同一視する
- mismatch を bug ではないからと黙殺する
