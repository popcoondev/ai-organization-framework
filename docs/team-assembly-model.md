# Team Assembly Model

AI Organization Framework における `v1.3` の initial team assembly model。

## Position

`v1.2` では sizing までを固定した。  
`v1.3` では、その sizing から **どの team を最初に立ち上げるか** を決める lightweight rule を持つ。

ここで大事なのは、role を増やすことではなく、今の mission に必要な actor / skill / owner を早く決めることにある。

## Inputs

team assembly の入力は次である。

- `scope breadth`
- `lifecycle span`
- `stakeholder diversity`
- `risk / irreversibility`
- `outcome horizon`
- discovery acceleration の `current state read`
- first operating goal

## Minimum Outputs

team assembly は最低限次を出す。

1. `required actors`
2. `required skills`
3. `owner`
4. `optional reviewers`
5. `deferred roles`

## Assembly Rule

初期組織は次の順で組む。

1. size class を読む
2. default organization を置く
3. first operating goal に足りない skill を確認する
4. skill は足すが、role は最小限に保つ
5. owner を 1 人決める

## Default Mapping

### `small`

- required actors:
  - `Visionary`
  - `Builder`
  - `Guardian`
- typical owner:
  - `Builder` or `Facilitator`

### `medium`

- required actors:
  - `Visionary`
  - `Builder`
  - `Guardian`
  - `Reviewer`
- optional reviewers:
  - domain review

### `large`

- required actors:
  - `Visionary`
  - `Builder`
  - `Guardian`
  - `Reviewer`
  - `Facilitator`
- typical owner:
  - `Facilitator`

### `extended`

- required actors:
  - `large` baseline
- optional additions:
  - domain-specific specialist roles
- rule:
  - role 追加理由を明示する

## Required Skills

actor を増やす前に、必要な skill を見る。  
minimum skill categories は次で十分である。

- framing
- execution
- risk / quality review
- synthesis
- domain specialization

同じ actor が複数 skill を持ってもよい。  
重要なのは、skill gap を見つけて埋めることであって、名目上の role を増やすことではない。

## Owner Rule

`owner` は current operating goal の進行責任を持つ。  
原則は次。

- single-threaded owner を置く
- owner は current checkpoint を更新する責務を持つ
- large / extended では `Facilitator` が owner になりやすい

## Deferred Roles

まだ不要な role は `deferred roles` として残してよい。  
これにより、最初から大組織を作らずに済む。

例:

- brand strategist
- live-ops lead
- architecture specialist

## Failure Modes

- role 名だけ増えて skill gap が解決しない
- owner が複数いて checkpoint 更新責任が曖昧
- size class より先に domain-specific role を大量投入する
- first operating goal に不要な actor を最初から立てる

## Short / Long Reuse

この assembly rule は短い task と長い task の両方に使う。

- short task:
  - deferred roles を多くし、required actors を絞る
- long-running work:
  - same vocabulary で team を広げる

したがって team assembly は、短命案件の近道ではなく、後から広げられる初期組織化 rule である。
