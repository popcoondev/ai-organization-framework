# AOF Discovery Layer Proposal

Date: `2026-06-14`

## Position

AOF は現在、delivery-oriented organization runtime としてはかなり整理されている。

強い領域:

- request framing
- organization design
- governance
- execution trace
- verification
- release and audit

一方で、次はまだ十分に first-class ではない。

- idea generation
- user understanding
- need discovery
- market exploration
- hypothesis formation
- concept validation

これは AOF が delivery 以後しか扱えないという意味ではない。  
現行モデルでも `Need` が不足している request の前段に `Discovery` を置くこと自体は許容されている。

ただし現状は、Discovery が runtime artifact として標準化されていない。

## Core Observation

Discovery Layer の本質は「アイデア出し役を増やすこと」ではない。  
本当に必要なのは、delivery に入る前の探索活動を、AOF の判断・成果物・ガバナンスの枠組みに接続することだ。

したがって Discovery Layer を入れるなら、追加の中心は role catalog ではなく次である。

1. Discovery artifact
2. Discovery judgment gate
3. Discovery-to-Delivery handoff packet
4. human / AI boundary

## Why This Matters

もし AI organization が開発業務の大部分を担うなら、次がボトルネックになる。

- 何を作るべきか
- 何を発見すべきか
- 誰のどんな need を優先すべきか
- どの hypothesis を delivery に渡すべきか

この部分が人間の属人的壁打ちだけに残ると、AOF は product organization 全体ではなく delivery organization に留まりやすい。

## Discovery Scope

Discovery が扱うべきなのは `What should we build?` だけではない。  
それ以前の `What should we discover?` も含めるべきである。

たとえば次の問いは Discovery の中核に入る。

- どの user segment を先に理解すべきか
- どの assumption を先に壊すべきか
- どの anomaly を掘るべきか
- どの market shift を観測すべきか
- どの breakthrough pattern を転用候補として調べるべきか

つまり Discovery は「答えを出す層」である前に、「どの問いに時間を使うべきかを定める層」でもある。

## Breakthrough Lens

Discovery Layer を単なる market research layer にすると弱い。  
より重要なのは、人類の breakthrough がどんな条件で起きてきたかを扱うことだ。

特に次は discovery protocol に取り込む価値がある。

- 異分野接続
- 前提破壊
- 小さな違和感や例外の保持
- 新しい道具や表現形式による思考変化
- 社会的・運用的制約の再解釈

つまり Discovery Layer は「探索活動の管理」だけでなく、「breakthrough が起きる条件の探索」を扱うべきである。

## Breakthrough Pattern Library Position

`Breakthrough Pattern Library` は、単一の role でも単一の artifact でもない。  
位置づけとしては、Discovery Layer の知識基盤である。

整理すると次の 3 層になる。

- `Breakthrough Pattern Record`
  1 件ごとの記録単位
- `Breakthrough Pattern Library`
  record 群を蓄積し、再利用可能にする registry / knowledge layer
- Discovery roles / council
  library を参照して問い、assumption、handoff を更新する運用層

したがって library は「artifact の別名」ではなく、artifact 群の上にある reusable memory として扱うのが適切である。

## Proposed Discovery Layer

## Flexibility Rule

Discovery は delivery より柔らかくあるべきである。  
ここで強制したいのは creativity ではなく traceability である。

したがって Discovery Layer の標準化は次の原則に従うべきである。

- artifact は provisional でよい
- alternative は捨てずに残してよい
- anomaly や違和感は未整理のままでも保持してよい
- 問いの再定義や探索方向の変更を失敗扱いしない
- 厳格にするのは handoff, evidence, judgment の最小線だけに留める

この原則がないと、Discovery Layer は探索支援ではなく早すぎる収束装置になってしまう。

### Candidate Roles

#### Idea Explorer

責務:

- アイデア発散
- 類推
- 異分野連想
- 発想転換

成果物:

- idea list
- concept proposal

#### User Researcher

責務:

- JTBD analysis
- persona generation
- interview design
- problem extraction

成果物:

- persona
- JTBD
- problem statement

#### Trend Watcher

責務:

- market scan
- technical trend analysis
- competitor scan
- opportunity framing

成果物:

- trend report
- opportunity report

#### Skeptic

責務:

- counter-argument generation
- risk analysis
- alternative framing
- premature-convergence prevention

成果物:

- risk assessment
- counter arguments

#### Concept Architect

責務:

- idea synthesis
- concept formation
- value proposition framing
- discovery artifact consolidation

成果物:

- product concept
- value proposition
- handoff recommendation

## Proposed Discovery Artifacts

role 追加だけでは不十分なので、最低限次の artifact を定義する必要がある。

### 1. Breakthrough Pattern Record

用途:

- breakthrough の発生条件を reusable pattern として蓄積する

含めるべき項目:

- source domain
- triggering tension
- broken assumption
- enabling tool or method
- transfer hypothesis
- expected relevance

Breakthrough Pattern Record は単体では memory 断片に過ぎない。  
価値が立ち上がるのは、それらが library として横断参照できるときである。

### 2. Assumption Map

用途:

- 現在のアイデアや市場理解を支える前提を可視化する

含めるべき項目:

- assumption
- type: user / market / technology / regulation / business model
- confidence
- evidence state
- break-test question

### 3. Anomaly Log

用途:

- 違和感、例外、失敗、ノイズを捨てずに保持する

含めるべき項目:

- observed anomaly
- why it matters
- which assumption it challenges
- follow-up recommendation

### 4. Discovery Question Set

用途:

- 何を発見すべきかを明示し、探索の焦点を仮置きする

含めるべき項目:

- discovery objective
- key questions
- target assumptions
- target anomalies
- target user or market slice
- stop / continue / pivot signals

### 5. Discovery-to-Delivery Handoff Packet

用途:

- discovery output を既存 AOF delivery runtime に正規化して渡す

含めるべき項目:

- selected need
- intended user or segment
- context summary
- hypothesis
- evidence refs
- rejected alternatives
- explicit risks
- required validation in delivery

## Discovery -> Delivery Interface

これは最重要論点である。

現行 AOF の中核 framing は `Need / Intent / Context` である。  
したがって Discovery Layer の終端は、少なくとも delivery に渡せる framing packet へ収束しなければならない。

推奨する最小 interface:

```text
Idea
  -> discovery question set
  -> discovery artifacts
  -> selected hypothesis
  -> Discovery-to-Delivery Handoff Packet
  -> Need / Intent / Context
  -> existing delivery runtime
```

重要なのは、Discovery Layer が delivery と別体系の object model を持ちすぎないことである。  
Discovery の価値は独立層であることよりも、delivery に正しく接続できることにある。

## Governance

Discovery でも governance は必要である。

ただし delivery と同じ judge が常に最適とは限らない。

最小観点:

- desirability
- feasibility
- risk / false-positive control

既存 shorthand に寄せるなら:

- Visionary: desirability / long-horizon value
- Builder: feasibility / execution bridge
- Guardian: risk / evidence quality

つまり Discovery Layer は、別 role universe を作るより、既存 council shorthand の解像度を前段へ拡張する方が整合的である。

## Discovery Judgment Gate

Discovery は artifact を並べただけでは終わらない。  
少なくとも 1 回は judgment gate を通すべきである。

推奨する最小 judgment status:

- `continue-exploration`
- `pivot`
- `synthesize-handoff`
- `stop`

Judge の最小観点:

- Visionary: この探索は本当に価値のある問いへ向かっているか
- Builder: ここから delivery へ接続できる具体性があるか
- Guardian: false positive や願望混入をどこまで抑えられているか

この gate の目的は、Discovery を delivery の擬似承認フローにすることではない。  
目的は「もっと探るのか」「問いを変えるのか」「handoff できるのか」を明示することである。

## Completion Criteria

Discovery は「良いアイデアが出たら終わり」ではない。  
完了は次のどちらかで判定するのが妥当である。

1. `synthesize-handoff`
Need / Intent / Context に落とせる handoff packet ができている。

2. `stop`
いま進めるに足る evidence がなく、継続優先度も低いと judgment された。

逆に、次の状態は未完了として扱うべきである。

- 問いはあるが target assumption が曖昧
- anomaly はあるが relevance が弱い
- hypothesis はあるが delivery validation requirement が定義されていない
- 「面白い」で止まっており、handoff か pivot の判断がない

## Success Criteria

Discovery の success は、必ずしも handoff の多さではない。

最小 success criteria:

- 追うべき問いが明確になった
- 壊すべき assumption が明示された
- anomaly が捨てられず保持された
- handoff する場合は Need / Intent / Context が十分に絞られた
- handoff しない場合でも、なぜ止めるか / pivot するかが trace されている

## Fit With Current AOF

この提案は現行 AOF と矛盾しない。

すでに存在する基盤:

- Need / Intent / Context framing
- role / skill / capability separation
- contract and dependency modeling
- audit and verification surfaces
- delivery-side execution packets

不足しているもの:

- discovery completion criteria
- discovery success criteria
- discovery judgment packet
- breakthrough library register

## Recommended Scope

この提案は `v2.x` の延長として直接実装すべきではない。

理由:

- `v2.5` は allocation / policy evaluation が主題であり、discovery を混ぜると release focus が崩れる
- `v3.0` は backend-neutral runtime loop が主題であり、discovery を必須化すると bar が重くなる

したがって適切な位置づけは次である。

- `v3.x research track`
- または `post-v3.0 expansion candidate`

## Recommended Questions

次に formalize すべき問いは次である。

1. Discovery の completion criteria は何か
2. Discovery の success criteria は何か
3. Discovery artifacts はどこまで schema 化すべきか
4. Discovery Council は既存 shorthand で十分か
5. Discovery judgment packet は delivery-side council packet とどこまで共通化すべきか
6. Discovery-to-Delivery Handoff Packet は `Need / Intent / Context` にどう落ちるか
7. breakthrough pattern library は registry / memory / skill のどこまでを担うべきか
8. discovery question set をどこまで固定し、どこを自由記述のまま残すべきか

## Recommendation

採否の結論としては次である。

- Discovery Layer は AOF の責務外ではない
- ただし現時点では runtime feature ではなく research/design target として扱うべき
- role catalog より先に artifact and handoff contract を設計すべき
- breakthrough generation conditions を discovery protocol に取り込む方向は有望

最初の具体化対象としては次を推奨する。

- Discovery Question Set
- Breakthrough Pattern Record
- Assumption Map
- Anomaly Log
- Discovery Judgment Packet
- Discovery-to-Delivery Handoff Packet

補助 operator surface としては次を推奨する。

- `breakthrough-library-register`

Artifact-first definition draft:

- [v3-discovery-artifact-definition.md](./v3-discovery-artifact-definition.md)
