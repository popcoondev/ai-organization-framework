# Discovery Acceleration

AI Organization Framework における `v1.3` の discovery acceleration model。

## Position

`v1.2` の discovery は、`Need` を発見する concept layer だった。  
`v1.3` では discovery を、質問開始の入口ではなく **初動を速くする運転開始フェーズ** として扱う。

目的は、曖昧な request を受けた最初の数往復で次を決めることにある。

- 何が分かっているか
- 何が分かっていないか
- 何から調べるべきか
- 最初にどこまで進める operating goal を置くか
- どの大きさの team で始めるか

## Minimum Outputs

discovery acceleration は最低限次を出す。

1. `current state read`
2. `known / unknown / assumptions / confidence`
3. `first hypothesis`
4. `research priorities`
5. `first operating goal`
6. `recommended initial team size`

## Current State Read

`current state read` は「今どう見えているか」を 1 画面で言い切る最小要約である。  
少なくとも次を含む。

- request の surface reading
- likely problem class
- immediate constraints
- highest uncertainty
- next evidence source

これは長い調査メモではなく、次の一手を決めるための operator summary である。

## Research Priorities

discovery acceleration は、質問候補を並べるだけで終わらせない。  
次の順に調査優先順位を出す。

1. 誤ると方向が大きくずれる unknown
2. operating goal のサイズを変える unknown
3. 後からでも補える detail

この順序を持たない discovery は、速度向上ではなく質問増加になりやすい。

## First Operating Goal

`first operating goal` は、front AI が確認過多にならずに動ける最初の運転目標である。  
最低限次を持つ。

- 何をこのターン群で前進とみなすか
- どこまでを今回の scope に含めるか
- 何をまだやらないか

良い operating goal は、小さすぎて価値が出ないものでも、大きすぎて確認が増えるものでもない。

## Relationship To Clarification

- `Discovery acceleration`
  - 初動を速くする
  - current-state read と first operating goal を出す
  - provisional `Need` を発見する
- `Clarification`
  - `Need / Intent / Context` を usable に整える
  - scope / success / exclusions を詰める

したがって、`Discovery` は `Clarification` を置き換えない。  
`Clarification` が意味を持つ前に、何を詰めるべきかを前に出す。

## Readiness Criteria

次を満たしたとき、discovery acceleration は成功である。

1. 次の一手が明確になっている
2. first operating goal が言語化されている
3. recommended initial team size が出ている
4. remaining unknown が research priority 順に並んでいる

## Failure Modes

止めるべきパターン。

- 質問が増えるだけで current-state read が改善しない
- `Need` 候補は出たが first operating goal が置けない
- current-state read が scope を広げるだけで絞れていない
- team size 提案がなく、front AI の確認回数が減らない

## Short / Long Reuse

この model は短い kickoff task だけでなく、長く続く work にも使う。

- short task:
  - first operating goal を小さく切る
- long-running work:
  - discovery 結果を次の mission control の起点にする

つまり discovery acceleration は、瞬発力のためのショートカットではなく、長期運用の初期条件を整える phase である。
