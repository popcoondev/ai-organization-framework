# Discovery Phase

AI Organization Framework における `Discovery` の仕様。

## Position

`Discovery` は `Clarification` の前段に置く独立フェーズである。  
役割は、まだ `Need` が存在しない request から、判断可能な `provisional Need` を発見することにある。

`Clarification` は `Need` が見えてから不足を補うフェーズであり、`Discovery` とは目的が異なる。

`v1.6` 以降の operating-model では、`Discovery` は一度で終わる intake だけではなく、後続の `Value Alignment Loop` に再投入される起点にもなりうる。

## Purpose

`Discovery` は次のために行う。

- 曖昧な request から何を本当に解くべきかを見つける
- 表面的な solution request と underlying progress need を分ける
- 質問を通じて unknown を減らし、仮の `Need` を作る
- まだ設計や実装に進むべきでない状態を見抜く

## Canonical Flow

`Discovery` の最小 flow は次である。

`Unknown -> Question -> Answer -> Insight -> Need`

ここでの `Need` は最初から完全である必要はない。  
`Clarification` に渡せるだけの provisional framing でよい。
ただし long-running work では、この provisional framing が後で更新されることを前提にしてよい。

## Minimum Outputs

`Discovery` を終えるには、最低限次を残す。

1. current unknowns
2. questions asked
3. answers received
4. extracted insights
5. provisional `Need`
6. remaining assumptions

`v1.3` 以降の operating-model release では、初動加速のための追加 outputs を [docs/discovery-acceleration.md](./discovery-acceleration.md) で定義する。  
この文書の minimum outputs は、`v1.2` concept-layer の baseline として残す。

## Readiness Criteria

次の条件を満たしたとき、`Discovery` は `Clarification` に進める。

1. 誰の progress を扱うかが仮でも特定されている
2. request の表面文言とは別に、解くべき `Need` が 1 つ以上候補として見えている
3. 大きな unknown が assumptions または open question として表面化している
4. そのまま implementation に進むと危険な ambiguity が減っている

## Minimum Quality Floor

`Discovery` は provisional `Need` を出しただけで十分ではない。  
最低限、次を満たす必要がある。

1. request の表面文言と underlying need が区別されている
2. critical unknown が隠れたまま確定 Need と誤認されていない
3. extracted insight が question / answer の列挙で止まらず、Need 候補へつながっている
4. provisional `Need` が downstream `Clarification` に渡せる粒度になっている

weak model は重要 unknown を見落としたまま discovery を閉じやすい。  
そのため `Need が書けた` ことではなく、**重要 unknown を露出したまま provisional framing にできているか** を quality floor とする。

## Stop Condition For Critical Unknowns

次のどれかに当てはまる場合、`Discovery` は `Clarification` に進めない。

1. decision owner が不明
2. user progress の仮説が複数競合したまま収束していない
3. high-impact unknown が無記録のまま残る
4. provisional `Need` が単なる solution wish を言い換えただけである

この場合は、追加質問、追加観察、human escalation、または blocked 扱いにする。

## Failure Modes

`Discovery` で止まるべきパターン。

- そもそも対象ユーザーや decision owner が不明
- 何を解決したいかより、単なる solution wish だけが繰り返される
- answer が増えても insight が収束しない
- 重要な unknown を隠したまま `Need` を確定しようとしている

この場合は `Clarification` に進まず、追加質問、追加観察、または blocked 扱いにする。

## Relationship To Clarification

`Discovery` の後に `Clarification` が来る。

- `Discovery`: `Need` を見つける
- `Clarification`: `Need / Intent / Context` を usable に整える

したがって、`Discovery` は problem finding、`Clarification` は problem framing に近い。

## Relationship To Value Alignment Loop

`v1.6` 以降では、`Discovery` は一度通って終わるだけではない。  
次のような場合、`Value Alignment Loop` を通じて discovery reading が再度必要になる。

1. `expectation-mismatch` が出た
2. scale expectation が変わった
3. user が見て初めて `Need` の輪郭を言い換えた

この場合は、最初の provisional `Need` を絶対視せず、current reading を更新する。

## Relationship To Runtime

`v1.2` 時点の `Discovery` は concept layer であり、現行 runtime の mandatory stage ではない。  
runtime が将来 discovery-first intake を持つとしても、まずは docs と運用ルールで固定する。

## Example

### Raw Request

`AIを使いたい`

### Discovery Reading

- `Unknown`
  - 何の仕事を改善したいのか分からない
  - 成功が何か分からない
- `Question`
  - どの作業が一番重いか
  - 何がうまくいっていないか
  - 何が改善したら前進と感じるか
- `Insight`
  - 本当の問題は「AIを使うこと」ではなく「企画要件の往復が多いこと」かもしれない
- `Provisional Need`
  - 企画要件を早く固め、手戻りを減らしたい
