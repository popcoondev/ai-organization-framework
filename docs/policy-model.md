# Policy Model

AI Organization Framework における `Policy` の標準軸と表現ルール。

## 位置づけ

`Policy` は、Actor または Organization が何を優先して提案、レビュー、判断を行うかを示す。  
`Governance` が「誰が決めるか」なら、`Policy` は「何を重視するか」である。

`Policy` は自由文でも書けるが、再現性のためには標準軸で表現する方がよい。

## Standard Dimensions

標準軸は次の 7 つを canonical set とする。

1. `Value`
2. `Quality`
3. `Safety`
4. `Cost`
5. `Speed`
6. `Learning`
7. `Delight`

各軸の意味は次の通り。

- `Value`: 利用者、顧客、事業、目的達成への実質的価値
- `Quality`: 正確さ、安定性、保守性、完成度
- `Safety`: 安全性、法令順守、セキュリティ、破綻回避
- `Cost`: 金銭、計算資源、人手、運用負荷
- `Speed`: 立ち上がり、意思決定、実装、出荷までの速さ
- `Learning`: 学習効果、探索価値、知見獲得
- `Delight`: 面白さ、心地よさ、感情的価値、体験品質

## Extension Rule

この 7 軸を既定値とする。  
ただし、ドメイン固有の軸を追加してよい。

追加するときは次を必須にする。

1. 軸の定義を書く
2. 既存 7 軸で代替できない理由を書く
3. `Decision Record` で使うときは、どの判断に影響したかを書く

このルールにより、教育、ゲーム、建築のような差分を吸収しつつ、無制限な軸増殖を防ぐ。

## Representation Rule

`Policy` は次の 2 層で表現する。

### 1. Required: Ordinal Order

必須なのは優先順位の順序である。

例:

- `Safety > Quality > Speed > Cost`
- `Value > Delight > Speed > Cost`

数値を使わなくても、どの衝突で何を優先したかを説明できることを重視する。
全 7 軸を毎回列挙する必要はない。  
その判断で relevant な軸だけ並べ、省略した軸は主要判断軸ではないものとして扱う。

### 2. Optional: Weights

必要な場合だけ、補助情報として重みを付けてよい。

推奨形式:

- `Safety=5, Quality=4, Speed=3, Cost=2`

重みは比較補助であり、必須ではない。  
また、重みがあっても規範的なのは ordinal order である。

両方ある場合の解釈は次の通り。

1. 順序が優先される
2. 重みは同順位に近い軸の比較や runtime scoring の補助に使う
3. 順序と重みが矛盾する場合は、順序が正しいものとして扱う

## Conflict Rule

`Policy` の衝突は避けられない。  
そのため、判断時は次の原則で扱う。

1. 高順位の軸を優先する
2. ただし `Governance` や Rule が明示的に上書きする場合はそれに従う
3. veto 可能な軸がある場合は、それを別途明示する

例:

- `Safety > Speed` なら、速く出せても危険なら採用しない
- `Value > Cost` なら、コスト増でも価値差が大きければ採用しうる

## Decision Record Rule

`Decision Record` では少なくとも次を残す。

1. `Policy priorities applied`
2. 必要なら `Policy tradeoffs accepted`

`Policy priorities applied` には、判断に実際に効いた順序を書く。  
`Policy tradeoffs accepted` には、何を優先し、何を犠牲にしたかを書く。

例:

- `Policy priorities applied: Safety > Quality > Speed > Cost`
- `Policy tradeoffs accepted: delivery speed was reduced to preserve auditability`

## Examples

### Software Delivery

- Order: `Safety > Quality > Speed > Cost`
- Optional weights: `Safety=5, Quality=4, Speed=3, Cost=2`

### Education

- Order: `Learning > Safety > Value > Cost`

### Game Event

- Order: `Delight > Value > Speed > Cost`

## Summary

この仕様では、`Policy` は

- canonical 7 軸を持つ
- 必須表現は順序
- 重みは任意
- 衝突は `Decision Record` に明示する

という形で標準化する。
