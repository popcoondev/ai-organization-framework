# Priority Roadmap

AI Organization Framework の現時点の優先順位。

## 原則

runtime や SDK を先に作らない。  
先に、曖昧な要求をどう受け、何をもって判断完了とみなすかを固める。

順序は次の原則で決める。

1. intake と decision の意味を先に固定する
2. その後で、実証と動的変化への対応を固める
3. 最後に、runtime/template/sdk として製品化する

## Priority P0

まず解くべき論点。

- [#10 Clarification/Discovery phase](https://github.com/popcoondev/ai-organization-framework/issues/10)
- [#14 Brownfield orientation and context acquisition](https://github.com/popcoondev/ai-organization-framework/issues/14)
- [#2 Policy dimensions and weighting](https://github.com/popcoondev/ai-organization-framework/issues/2)
- [#8 Completion criteria and success criteria](https://github.com/popcoondev/ai-organization-framework/issues/8)
- [#9 Forecast versus estimate](https://github.com/popcoondev/ai-organization-framework/issues/9)

理由:

- `Request` をどう受けるか
- `Need / Intent / Context` をどう framing するか
- `Decision` に何を根拠として使うか
- `Done` と `Success` をどう区別するか

ここが未確定のままだと、pilot も runtime も不安定になる。

## Priority P1

P0 の次に解く論点。

- [#5 Validate AIDLC pilot success criteria](https://github.com/popcoondev/ai-organization-framework/issues/5)
- [#6 External Signal/Event](https://github.com/popcoondev/ai-organization-framework/issues/6)
- [#7 AI Actor performance and capacity](https://github.com/popcoondev/ai-organization-framework/issues/7)

理由:

- P0 で定義した intake と decision の意味を、実案件で検証する段階だから
- 外的変化と AI ワーカー特性は、pilot と実運用で初めて解像度が上がるから

## Priority P2

P1 の後に formalization する論点。

- [#4 Actor communication protocol](https://github.com/popcoondev/ai-organization-framework/issues/4)
- [#3 Council of Three universality](https://github.com/popcoondev/ai-organization-framework/issues/3)
- [#1 Role formal status](https://github.com/popcoondev/ai-organization-framework/issues/1)

理由:

- これらは重要だが、P0 と P1 の結果を受けて固めた方が手戻りが少ない
- 特に `Role` と `Council` は、pilot や dynamic operation の知見を反映してからでも遅くない

## Priority P3

最後に productize する論点。

- [#11 Local template folder layout and manifest schema](https://github.com/popcoondev/ai-organization-framework/issues/11)
- [#12 Local runtime trigger, session lifecycle, and persistence](https://github.com/popcoondev/ai-organization-framework/issues/12)
- [#13 SDK surface and adapters](https://github.com/popcoondev/ai-organization-framework/issues/13)

理由:

- これらは実装開始点として魅力があるが、前段の仕様が曖昧だと再設計コストが高い
- 先に runtime を作ると、暫定仕様が実装に固定されやすい

## Execution Order

```mermaid
flowchart LR
    p0[P0 Intake and Decision Semantics]
    p1[P1 Validation and Dynamic Operation]
    p2[P2 Governance Formalization]
    p3[P3 Runtime Productization]

    p0 --> p1 --> p2 --> p3
```

## Next Move

次に着手すべき 1 件は [#10](https://github.com/popcoondev/ai-organization-framework/issues/10) である。  
その次は [#14](https://github.com/popcoondev/ai-organization-framework/issues/14) である。

理由:

- `Clarification` を定義しないと `Orientation` も定義できない
- `Orientation` を定義しないと、既存案件で安全に使えない
