# Framework Self-Audit

AI Organization Framework 自体に Discovery を適用するための自己監査モデル。

## Position

AOF も 1 つのプロジェクトとして扱う。  
したがって、AOF 自体にも `Discovery`, `Task Triage`, and `Alignment Pulse` を適用する。

## Purpose

`Framework Self-Audit` の目的は次である。

1. AOF がまだ管理できていない領域を発見する
2. external tool への暗黙依存を炙り出す
3. role / schema / docs の抜けを task として起票する

## Trigger

次のどちらかで発火してよい。

1. major release ごと
2. 半年ごと

必要なら Human または Orchestrator が ad hoc でも発火してよい。

## Scope

最低限、次を確認する。

1. lifecycle coverage
2. external dependency drift
3. role completeness
4. schema reflection
5. document freshness

## Questions

最低限の問い:

1. AOF は project memory のどの面をまだ内部保持できていないか
2. AOF はどこで external tool を source of truth にしてしまっているか
3. role に責務 / 非責務 / lifecycle の抜けはないか
4. 定義済み概念が schema に反映されていないものは何か
5. 最新 release の変更が古い docs に反映されていない箇所はないか

## Output

自己監査の output は最低限次とする。

1. self-audit summary artifact
2. `.aof/tasks/open/TASK-*.json`
3. if needed, Human review note

## Escalation

すべてを Human に上げる必要はない。  
ただし次は Human review に上げてよい。

1. release boundary を変える発見
2. schema breaking risk
3. governance weakening risk
4. large migration cost

## Minimal Evidence

`v1.8` で self-audit を gate にするなら、最低 evidence は次で十分である。

1. 1 回分の self-audit summary
2. そこから起票された task が 1 件以上
3. Human が確認した short note
