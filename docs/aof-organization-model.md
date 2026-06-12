# AOF Organization Model

AOF は Agent Framework ではなく、AI Organization Operating System である。

AOF の中心は agent ではない。中心は、mission ごとに organization を設立し、team / role / policy / contract / dependency / knowledge / metrics を持たせ、agent や human や tool を role に割り当てて運営することである。

## Core Ontology

```text
Mission
  -> Project
    -> Organization
      -> Council
      -> Team
        -> Role
          -> Assignment
            -> Agent / Human / Tool
      -> Contract
      -> Dependency
      -> Knowledge
      -> Metrics
      -> Lifecycle
```

Escalation は階層ノードではなく、organization 全体にかかる governance path である。

```text
Role -> Team Lead -> Council -> Human Authority
```

## Mission, Project, And Organization

Mission は organization の外側にある目的である。Mission は「なぜこの project organization が存在するのか」を定義する。

Project は mission を実行可能な scope に落とした単位である。Repository や product area と一致することもあるが、AOF では project を top-level organization そのものとは扱わない。

Organization は project を遂行するために作られる運営構造である。したがって、v2.1 の `.aof/organization.json` は mission を内包するのではなく、mission を参照しながら project execution structure を表現する。

この分離により、同じ mission の下で複数 project organization を持てる。また、project が変わっても mission を維持し、organization だけを split / merge / archive できる。

## Organization

Organization は AOF の中心概念である。

Project ごとに organization を生成し、その organization が次を持つ。

- councils
- teams
- roles
- role assignments
- agents / humans / tools
- contracts
- dependencies
- knowledge ownership
- metrics
- escalation rules
- lifecycle state

Agent は organization の末端実行者または resource であり、中心概念ではない。

## Council

Council は organization の意思決定機関である。

Default template:

- Product Council
- Architecture Council
- Operations Council

Default approval policy は `2_of_3` とする。ただし、これは hard-coded rule ではなく、project ごとに override できる policy である。

Council の責務:

- 方針決定
- 優先順位決定
- 組織変更
- リスク判断
- ADR / decision record 承認

## Team

Team は独立した organization unit である。

Team は次を持つ。

- mission
- responsibilities
- authority
- deliverables
- dependencies

Team の例:

- Frontend Team
- Backend Team
- Infrastructure Team
- QA Team
- Integration Team

## Role And Agent

Role と Agent は分離する。

Role は責務である。

- Backend Engineer
- Architect
- QA Engineer
- Visionary
- Builder
- Guardian

Agent は実行資源である。

- Codex
- Claude
- GPT
- human
- tool

同じ role に複数 agent を割り当ててもよい。逆に、同じ agent が複数 role を担当してもよい。ただし、その場合も role と agent の identity は混ぜない。

## Contract

Contract は team 間の約束である。

例:

- API Contract
- OpenAPI
- Event Schema
- Database Interface

Integration Team は default で contract の所在と更新責任を管理する。

## Dependency

Dependency は organization unit 間の依存関係である。

例:

```text
Viewer Team -> Asset Team -> Runtime Team
```

依存関係は暗黙にせず、graph として保持する。

## Resource

Resource は organization が利用する実行資源である。

対象:

- AI Agent
- Human
- Tool
- Repository
- Environment
- Budget
- Token
- Infrastructure

v2.1 では resource scheduler までは要求しない。まず role assignment と organization manifest に resource identity を残す。

## Knowledge Ownership

Knowledge には owner を持たせる。

例:

```text
Authentication Domain -> Security Team
```

目的は、AI が知識の責任所在を毎回推測しないようにすることである。

## Metrics

Metrics は organization health を測るための指標である。

対象:

- velocity
- quality
- cost
- risk
- health

v2.1 では metrics の自動計測は要求しない。まず metric identity と owner を manifest に置く。

## Lifecycle

Organization lifecycle は次を持つ。

```text
Create -> Operate -> Measure -> Improve -> Split / Merge -> Archive
```

v2.1 では lifecycle state を organization manifest に置く。runtime が split / merge を自動実行することは要求しない。

## Core Exclusions

次は AOF core object ではない。

- emotion
- personality
- mood

これらは必要なら interaction layer / UX layer / prompt style として扱う。organization governance の core object にはしない。
