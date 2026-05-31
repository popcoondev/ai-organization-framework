# Interpretation Lenses

AI Organization Framework における `Interpretation Lenses` の最小マッピング。

## Position

これらは AOF core model そのものではない。  
AOF が request を理解し、適切な問いや組織構成を選ぶときの external lens である。

## Lenses

- Design Thinking
- JTBD
- User Story
- PMBOK
- AIDLC

## Mapping

### `Discovery`

- Design Thinking
  - 観察、再定義、problem finding
- JTBD
  - 表面的要求の裏にある progress need を捉える

### `Intent / Delivery Shaping`

- User Story
  - 誰のために、何を、なぜ行うかを delivery-ready にする

### `Organization Sizing / Governance`

- PMBOK
  - stakeholder の多さ、承認の必要性、組織の厚みを考える

### `AI / Software Workflow Mapping`

- AIDLC
  - software / AI project の stage 名や artifact を現場に接続する

## Constraint

Interpretation lens は core model を置き換えない。  
AOF が標準化したいのは lens 自体ではなく、lens を使ってもぶれない最小構造である。

## Example Reading

`ひまつぶしダンジョンを作りたい`

- Design Thinking
  - どんな暇つぶし体験が不足しているかを見る
- JTBD
  - ユーザーは何分間、どんな気持ちの進歩を求めているかを見る
- User Story
  - 具体的なプレイ loop や goal を shaping する
- PMBOK
  - どこまでの関係者/承認が必要かを見る
- AIDLC
  - 実装・調整・運営を workflow に落とす
