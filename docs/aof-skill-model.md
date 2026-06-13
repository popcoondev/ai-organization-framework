# AOF Skill Model

## Position

Skill は AOF における再利用可能な organization capability package である。

Agent に閉じた prompt 断片ではなく、organization が所有し、role に適用し、resource と capability を前提に実行される単位として扱う。

## Why Skill Is First-Class

`v2.1` の organization model には role と agent の分離がある。  
`v2.2` の skill model は、その間に reusable operating knowledge を置くための object である。

Skill を first-class にする理由:

- 同じ実行ノウハウを role や agent を跨いで再利用できる
- owner と更新責任を明示できる
- required capability と required resource を定義できる
- expected output を contract と接続できる

## Core Definition

Skill は次を持つ。

- identity
- owner
- version
- purpose
- applicable roles
- required capabilities
- required resources
- inputs
- outputs
- validation expectations

## Example

```text
PR Review Skill
  owner: Quality Team
  applies to: Reviewer Role, Guardian Role
  requires capabilities: code-review, risk-analysis
  requires resources: repository-access, test-runner
  outputs: review report, risk summary, sign-off recommendation
```

## Relationship To Other AOF Objects

- Role:
  Skill は role に適用される。Role そのものではない。
- Agent:
  Skill は agent の人格ではない。Agent が実行できる organization-owned procedure である。
- Capability:
  Skill は capability を要求する。Capability の別名ではない。
- Resource:
  Skill は resource を必要とすることがある。
- Contract:
  Skill の expected output は contract artifact に接続できる。
- Policy:
  Skill の使用条件は policy によって制限できる。

## Non-Goals For v2.2

`v2.2` では次を要求しない。

- automatic skill marketplace
- automatic skill ranking
- autonomous skill selection optimizer
- runtime learning that rewrites skills without review

`v2.2` では、skill identity と constraint を represent / validate / inspect できればよい。
