# Autonomy And Goal Sizing

AI Organization Framework における `v1.3` の operating goal sizing と autonomy boundary の仕様。

## Position

front AI が何度も確認を求める主因は、goal が大きすぎるか、確認なしで進めてよい境界が曖昧なことである。  
`v1.3` では、request をそのまま受けるのではなく、**確認過多にならない operating goal** に切る。

## Minimum Goal Contract

`operating goal` は最低限次を持つ。

1. `operating goal`
2. `success condition`
3. `autonomy budget`
4. `escalation boundary`

## Operating Goal

`operating goal` は、今のターン群で front AI が責任を持って前進させる範囲である。  
良い operating goal は次を満たす。

- 1 回の調査と synthesis で前進が見える
- いきなり project 全体を抱えない
- できた / まだ を人が判断できる

例:

- 悪い:
  - `ひまつぶしダンジョンを完成させる`
- 良い:
  - `初回プレイループの魅力が伝わる1ページ企画に落とす`

## Success Condition

`success condition` は、その operating goal が一旦前進したと言える条件である。  
これは final success ではない。local success でよい。

例:

- コア体験が 3 行で説明できる
- major unknown が 2 つ以下に減る
- 次の implementation decision が選べる

## Autonomy Budget

`autonomy budget` は、front AI が確認なしで変えてよい範囲である。

最低限、次を言えるようにする。

- wording / structure の改善は自由
- small scope refinement は自由
- workflow 変更や project scope 拡大は不可
-追加工数や責務を大きく増やす変更は不可

これにより、「全部聞く」か「全部勝手に決める」かの二択を避ける。

## Escalation Boundary

次のような場合は escalation する。

- workflow mismatch が出た
- priority drift で operating goal が崩れた
- domain expansion が起きた
- owner 変更が必要になった
- autonomy budget の外に出る

## Sizing Rule

goal sizing の原則は単純でよい。

1. current state read を見る
2. first outcome が見える最小単位まで縮める
3. ただし価値がほぼ出ないほど細かくしない
4. autonomy budget の中で動ける単位にする

## Failure Modes

- project 全体をそのまま operating goal にする
- success condition が曖昧で、完了判定ができない
- autonomy budget が広すぎて勝手な方向転換を招く
- autonomy budget が狭すぎて何でも確認になる

## Short / Long Reuse

この contract は短い task と長い task の両方に使える。

- short task:
  - small operating goal
  - narrow autonomy budget
- long-running work:
  - same contract を checkpoint ごとに更新する

したがって goal sizing は、短命 task 専用ではなく、長期案件を小さく運転するための基本単位でもある。
