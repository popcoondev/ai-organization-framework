# Proof Category Taxonomy

AI Organization Framework における `v1.6` の proof category taxonomy。

## Position

AOF は、proof を 1 種類として扱わない。  
仕様が合っている証拠と、体験が合っている証拠は別である。

この taxonomy の目的は、

- 何が確認できたのか
- まだ何が確認できていないのか
- なぜ spec completeness だけでは十分でないのか

を明確にすることである。

## Core Categories

### 1. Specification Proof

仕様、構造、要件記述が internally coherent である証拠。

例:

- schema
- requirement note
- design rule
- interface contract

### 2. Governance Proof

誰が何を根拠に決めたか、どの承認条件で進めたかの証拠。

例:

- decision record
- approval note
- veto / exception handling

### 3. Runtime Proof

runtime が実際に state / signal / checkpoint を持って動いた証拠。

例:

- session state
- context snapshot
- signal update
- checkpoint rationale

### 4. Screenshot Proof

視覚状態を静止画で確認した証拠。

例:

- screen capture
- rendered frame
- layout image

### 5. Interaction Proof

操作したときの感触や、操作結果の連鎖を確認した証拠。

例:

- click / drag / type flow
- transition recording
- editor manipulation result

### 6. Product-Feel Proof

「意図した体験に近いか」を確認した証拠。  
これは screenshot だけでも spec だけでも足りないことがある。

例:

- live artifact review
- combined screenshot + interaction review
- experience alignment note

## Interpretation Rule

proof は足し合わせるのであって、代替しない。

- specification proof があっても product-feel proof を置き換えない
- screenshot proof があっても interaction proof を置き換えない
- runtime proof があっても expectation alignment を自動保証しない

## Minimum Review Reading

`v1.6` では、少なくとも次を区別して読める必要がある。

1. これは spec が合っている証拠か
2. これは runtime が動いた証拠か
3. これは user-facing experience が合っている証拠か

## Typical Failure Modes

- specification proof だけで体験が保証されたと思い込む
- screenshot proof だけで操作感も保証されたと思い込む
- governance proof があるので user expectation も満たしたと思い込む

この taxonomy は、それらを防ぐために使う。
