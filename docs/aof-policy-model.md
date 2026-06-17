# AOF Policy Model

## Position

Policy は organization behavior を制約または許可する machine-readable rule artifact である。

`v2.1` では policy は concept として存在するが、独立した artifact ではない。  
`v2.2` では policy を organization object として formalize する。

## Why Policy Must Be Explicit

Policy が prose だけだと次が難しい。

- approval rule の一貫した適用
- delegation restriction の検証
- resource access 制御
- review requirement の自動確認
- benchmark validation での policy consistency review

## Policy Kinds

`v2.2` の最小 policy kinds:

- approval-policy
- escalation-policy
- delegation-policy
- access-policy
- review-policy
- retention-policy

## Core Definition

Policy は次を持つ。

- identity
- policy kind
- scope
- subject refs
- rule statements
- effect
- exception handling
- owner

## Example

```text
main-branch-approval-policy
  kind: approval-policy
  scope: release artifacts
  subjects: release-planning-team
  rule: human sign-off required before release tag
  effect: require-approval
```

## Relationship To Other AOF Objects

- Council:
  council approval rule を policy として表現できる。
- Role / Team:
  delegation and review obligations を policy で制約できる。
- Resource:
  access-policy は resource access を制御できる。
- Skill / Capability:
  policy は required capability や restricted skill use を定義できる。

## Non-Goals For v2.2

`v2.2` では次を要求しない。

- full runtime enforcement engine
- dynamic policy conflict resolver
- autonomous policy rewriting

まずは policy を artifact として represent / validate / inspect できるようにする。
