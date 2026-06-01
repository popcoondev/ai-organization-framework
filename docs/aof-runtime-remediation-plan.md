# AOF Runtime Remediation Plan

`AOF` を使った開発で、`AOF framing only` と `AOF runtime used` が混同されないようにするための是正計画。

この文書の目的は 3 つある。

1. `AOF使用レベル` を最初に合意する
2. `partial runtime` の最小導入点を定義する
3. static AOF から runtime-used AOF へ移る導入レールを残す

## Problem

これまでの実例では、次のズレが起きた。

- AOF の framing と decision record は残っている
- ただし session / context / artifact log の runtime evidence は残っていない
- そのため、`AOFで開発した` と `AOF runtime を運用した` が混同される

これは AOF の思想不足ではなく、`利用レベルの合意不足` と `導入単位の不在` の問題である。

## Usage Levels

今後は、AOF 使用を次の 3 段で明示する。

### 1. Framing Only

- `Need / Intent / Context`
- governance
- decision records

を使う。runtime session / context persistence / signal loop は必須ではない。

使いどころ:

- 速い検討
- MVP 企画
- まず成果物を出したいとき

### 2. Partial Runtime

framing に加えて、特定の運用レイヤーだけ runtime を使う。

最小例:

- 日替わり候補生成
- 外部データロード
- 図鑑 / 研究更新
- 運営側の reprioritization

使いどころ:

- ゲーム本体は静的でも、運営ループは動的にしたい
- runtime を小さく導入して価値検証したい

### 3. Runtime Mandatory

次が必須:

- `.aof/sessions/`
- `.aof/context/active/`
- `.aof/artifacts/`
- signal と next decision checkpoint

使いどころ:

- 運営や継続改善を AOF で回したい
- drift を session / signal / reprioritize で扱いたい

## First Decision

新しいプロジェクトでは、最初に次を必ず決める。

1. 今回は `framing only / partial runtime / runtime mandatory` のどれか
2. runtime を入れるなら、どの層から始めるか
3. runtime を入れない層はどこか

## Minimum Partial Runtime Entry Points

`partial runtime` の最初の候補は、次の順で検討する。

1. 日替わり候補の生成 / 配信
2. 外部データロード
3. 研究 / 図鑑更新の運営データ化
4. 優先度変更の signal / reprioritize

この順にする理由は、ゲーム本体を壊さずに運営ループだけを先に AOF 化できるからである。

## Chosen First Partial Runtime Target

現時点で、最初に導入する `partial runtime` 対象は次とする。

- **日替わり候補の生成 / 配信**

### Why This Target Comes First

1. ゲーム本体の静的実装を大きく壊さずに導入できる
2. `static AOF` から `runtime-used AOF` へ移る最小の evidence を作りやすい
3. 運営ループの価値が人間にも見えやすい
4. `v1.4` の `status / timeline / flow` に載せる event が素直に定義できる

### Minimum Runtime Evidence For This Target

この対象で `runtime used` と言うには、最低限次を残す。

- 当日の候補生成 session
- 候補選定理由を持つ checkpoint or decision artifact
- 配信対象候補の artifact
- 次回候補調整の rationale

### Explicit Deferrals

最初の partial runtime では、次はまだ deferred とする。

- ゲーム本体ロジックの全面 runtime 化
- 図鑑 / 研究更新の自動化
- 優先度変更 signal の本格運用

## Required Runtime Evidence

`runtime used` と言うには、最低限次の evidence を残す。

- session file
- current context snapshot
- at least one signal or checkpoint update
- next decision rationale

これが無ければ、評価は `AOF framing only` か `static AOF` とする。

## Decision Log Requirement

runtime を使う / 使わない理由は、毎回 decision artifact として残す。

minimum fields:

- chosen usage level
- why this level is enough now
- what is explicitly deferred
- what would trigger escalation to a higher usage level

## Escalation Triggers

次のどれかが起きたら、より強い AOF usage level を再検討する。

- workflow mismatch が繰り返す
- user-driven priority drift が多い
- outcome が継続的に悪い
- 外部データ更新が増える
- 次の一手の理由を人が追えなくなる

## Short Rule

短く言うと、今後は次の順で進める。

1. AOF 使用レベルを先に合意する
2. runtime は最小導入点から入れる
3. evidence が無ければ `runtime used` とは言わない
