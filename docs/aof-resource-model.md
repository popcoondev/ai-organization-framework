# AOF Resource Model

## Position

Resource は organization が仕事を実行するために利用する inventory object である。

`v2.1` では resource は概念としてのみ存在した。  
`v2.2` では resource inventory を first-class artifact にする。

## Resource Categories

最小カテゴリ:

- agent
- human
- tool
- mcp-server
- repository
- environment
- budget
- token-envelope
- infrastructure

## Core Definition

Resource は次を持つ。

- identity
- resource type
- owner
- availability status
- access scope
- provided capabilities
- constraints

## Example

```text
repo-main
  type: repository
  owner: Backend Team
  access: read-write
  provides: source-of-truth, code-search
  constraints: protected-main-branch
```

## Design Principle

Resource identity と scheduling logic は分離する。

`v2.2` では:

- what exists
- who owns it
- what it provides
- what constraints apply

を記録する。

`v3.x` で:

- who gets it now
- how to rebalance it
- when to preempt it

を扱う。

## Non-Goals For v2.2

- dynamic scheduler
- token budget optimizer
- automatic environment brokering
- autonomous queue-based staffing
