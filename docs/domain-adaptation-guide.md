# Domain Adaptation Guide

この文書は、AIDLC 以外の domain に AI Organization Framework を適用するときの最小ガイドである。  
対象は、マーケティング、建築、教育、運用、イベント設計など、software lifecycle 以外の workflow を持つ組織である。

## What Stays Fixed

domain が変わっても、コア概念は変えない。

- `Need`
- `Intent`
- `Context`
- `Discussion`
- `Decision`
- `Action`
- `Artifact`
- `Outcome`
- `External Signal`

変えてよいのは、これらをどの工程名、どの approval point、どの actor/governance で運ぶかである。

## Adaptation Sequence

新しい domain に適用するときは、次の順で決める。

1. `Need` と `Outcome` を先に固定する
2. その domain で実際に使う工程名を `stages` に落とす
3. irreversible または高コストな判断点を `decision_points` に置く
4. actor と governance を、その判断点に対応するように定義する
5. clarification で何を必ず聞くかを domain 前提で決める
6. first pilot を small scope で回し、template を update する

## Step 1: Start From Outcome

最初に考えるべきなのは工程ではなく、`Artifact` と `Outcome` の切り分けである。

問い:

- 何を作れば `Artifact` とみなすか
- 何が起きれば `Outcome` とみなすか
- `Completion` と `Success` はどこで分かれるか

例:

- 建築
  - `Artifact`: drawing set, permit package, constructed building
  - `Outcome`: safe occupancy, budget adherence, user satisfaction
- 教育
  - `Artifact`: curriculum, lesson plan, content package
  - `Outcome`: comprehension, retention, completion rate
- マーケティング
  - `Artifact`: campaign brief, assets, landing page, email sequence
  - `Outcome`: conversion uplift, CAC reduction, qualified pipeline

## Step 2: Design `stages`

`stages` は domain の正式工程名を置いてよい。  
ただし、AOF runtime における canonical stage と混同しない方がよい。

設計ルール:

- stage 名は現場で本当に使う名前に寄せる
- stage 数は最初から細かくしすぎない
- actor handoff が変わる点だけを切る
- 同じ governance で流せる細部は stage に分けない

よい例:

- 建築: `clarification -> orientation -> concept-design -> schematic-design -> detailed-design -> construction -> handover`
- 教育: `clarification -> orientation -> curriculum-design -> content-production -> delivery -> assessment -> revision`
- マーケティング: `clarification -> orientation -> brief -> asset-production -> launch -> monitoring -> optimization`

避けたい例:

- 実作業の micro step をすべて stage にしてしまう
- status label と stage label を混ぜる
- governance が変わらないのに stage だけ増やす

## Step 3: Design `decision_points`

`decision_points` は「大事そうな場所」ではなく、「明示 approval が必要な場所」に置く。

判断基準:

- irreversible か
- blast radius が大きいか
- 法務/安全/ブランド/予算の gate があるか
- 人間の裁定なしに進めると危険か

例:

- 建築
  - `concept-approval`
  - `permit-package-approval`
  - `construction-release`
- 教育
  - `curriculum-approval`
  - `assessment-approval`
  - `public-release`
- マーケティング
  - `brief-approval`
  - `launch-approval`
  - `budget-escalation-approval`

rule of thumb:

- 最初の template では 2 から 4 個で始める
- stage ごとに approval を置かない
- outcome review は `decision_point` ではなく monitoring/reopen で扱うことが多い

## Step 4: Map Governance To Risk

`Council of Three` は default template であって mandatory ではない。  
ただし、次の minimum guarantees は残す。

- value / intent を代表する観点
- feasibility / execution を代表する観点
- risk / quality / safety を代表する観点

domain 別の例:

- 建築
  - value: client or design lead
  - execution: architect / delivery lead
  - risk: code / safety / compliance reviewer
- 教育
  - value: pedagogy owner
  - execution: curriculum builder
  - risk: assessment / safeguarding reviewer
- マーケティング
  - value: growth or brand owner
  - execution: campaign builder
  - risk: legal / brand / analytics reviewer

fast-track を許容する場合でも、3 観点 coverage 自体は残す。  
省略できるのは seat participation の重さであって、risk 観点の不在ではない。

## Step 5: Decide Clarification Policy

domain adaptation では、`clarification` が最も差分を生みやすい。

最低限、template owner は次を決めるべきである。

- scope をどう聞くか
- success criteria をどう聞くか
- prohibited conditions をどう聞くか
- brownfield 前提をどう聞くか
- domain 固有の high-stakes 条件をどう扱うか

現在の prototype runtime にはまだ制約があるが、最低限の template override は入っている。

- `organization.yaml` の `clarification` で high-stakes / brownfield term を追加できる
- `use_default_high_stakes_patterns: false`
- `use_default_brownfield_patterns: false`
- `high_stakes_terms`
- `brownfield_terms`
- `question_policy`
- `copy.<locale>` で question / rationale / summary copy も partial override できる

したがって現時点の運用 guidance は次である。

1. non-software domain では clarification 出力を human actor が review する
2. domain 固有の high-stakes 条件は `organization.yaml` の `clarification` と governance / policy docs の両方に明示する
3. initial question count や follow-up round を変えたい場合は `clarification.question_policy` を template で明示する
4. question copy が domain 文脈を強く持つ場合は `clarification.copy.<locale>` を template で明示する
5. pilot 中は generated questions をそのまま canonical と見なさない
6. richer pattern semantics は future extension として扱う

`clarification.question_policy.priority_order` は question wording ではなく `trigger class` 基準で持つ。  
つまり `missing-constraint` や `high-stakes-risk` を優先するかを決める。

## Step 6: Build The First Template

最初の domain template は 1 workflow だけでよい。  
必要十分な最小構成は次である。

- `.aof/aof.yaml`
- `organization.yaml`
- `governance.yaml`
- `policies.yaml`
- `actors/*.yaml`
- `workflows/<domain>.yaml`
- `templates/decision-record.md`
- `templates/decision-record.schema.json`

最初から multi-workflow template にしない方が安全である。

repo には non-AIDLC starter として [examples/generic-template/.aof/aof.yaml](../examples/generic-template/.aof/aof.yaml) も含めてある。  
これは domain-neutral な service-design flow と、clarification term override の最小例を示す。

## Example Mappings

### Marketing

one possible mapping:

`Need -> Intent -> Context -> Brief -> Asset Production -> Launch -> Monitoring -> Outcome`

example workflow draft:

- `stages`
  - `clarification`
  - `orientation`
  - `brief`
  - `asset-production`
  - `launch`
  - `monitoring`
- `decision_points`
  - `brief-approval`
  - `launch-approval`

### Architecture

one possible mapping:

`Need -> Intent -> Context -> Concept Design -> Detailed Design -> Construction -> Building(Artifact) -> Occupancy Outcome`

example workflow draft:

- `stages`
  - `clarification`
  - `orientation`
  - `concept-design`
  - `detailed-design`
  - `construction`
  - `handover`
- `decision_points`
  - `concept-approval`
  - `permit-package-approval`
  - `construction-release`

### Education

one possible mapping:

`Need -> Intent -> Context -> Curriculum Design -> Content Production -> Delivery -> Assessment -> Learning Outcome`

example workflow draft:

- `stages`
  - `clarification`
  - `orientation`
  - `curriculum-design`
  - `content-production`
  - `delivery`
  - `assessment`
  - `revision`
- `decision_points`
  - `curriculum-approval`
  - `assessment-approval`
  - `public-release`

## Pilot Guidance

最初の pilot では、domain 全体を template 化しようとしない方がよい。

推奨:

- 1 workflow only
- 1 governance model only
- 1 small, reviewable request class only
- 1 pilot record only

pilot 後に確認すること:

- stage 名は現場語彙として自然か
- decision point は多すぎないか
- Artifact / Outcome の切り分けは機能したか
- clarification は domain 固有 risk を拾えたか
- reopen policy は重すぎないか

## Current Limitation

現時点では、generic example はあるが、建築専用や教育専用の完成済み example template は repo にまだ含まれていない。  
また、domain-specific clarification pattern は term override までは可能だが、question copy や richer semantic class までは runtime で未実装である。

したがって、この guide は「完成済み multi-domain support」ではなく、  
新しい domain template を安全に切り出すための current best practice として扱う。
