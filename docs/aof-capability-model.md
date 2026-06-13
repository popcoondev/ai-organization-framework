# AOF Capability Model

## Position

Capability は organization workforce が何をできるかを示す typed ability である。

`v2.1` では capability は agent 上の free-form string だった。  
`v2.2` では capability を registry 化し、role / agent / skill / resource の関係を明示できるようにする。

## Why Capability Needs A Registry

Free-form string だけでは次ができない。

- staffing suitability の判断
- delegation 可能性の判定
- skill requirement の明示
- policy による capability-based access control
- analytics による capability gap 発見

## Capability Categories

`v2.2` の最小分類:

- execution
- reasoning
- review
- domain
- governance
- communication
- operations

## Core Definition

Capability は次を持つ。

- identity
- category
- description
- owner
- proficiency scale or level policy
- validation method
- dependencies on other capabilities

## Example

```text
code-review
  category: review
  owner: Architecture Council
  validation: produces structured review artifact
  depends on: repository-navigation, risk-analysis
```

## Relationship To Other AOF Objects

- Role:
  role は required capability を持てる。
- Agent:
  agent は provided capability を持てる。
- Skill:
  skill は required capability を宣言できる。
- Resource:
  resource は capability を提供または増幅できる。
- Policy:
  policy は capability を gate に使える。

## Non-Goals For v2.2

`v2.2` では次を要求しない。

- automatic proficiency scoring
- autonomous capability discovery from logs
- dynamic capability market or bidding

まずは capability を typed registry として安定化する。
