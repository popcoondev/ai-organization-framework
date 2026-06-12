# Next Major Version Requirements Analysis

## Mission

AOF を次のメジャーバージョンへ進化させる。

## Need

AOF v2.1 は organization model を first-class にしたが、まだ「organization が実際に version planning を完了する」ことを release-grade artifact として示していない。

次の major version では、AOF が単なる installer / schema / docs ではなく、project ごとの AI organization を設立・運営・統治・解散できる operating system であることを明確にする必要がある。

## Intent

AOF 2.1 のみを使い、次の major version planning を end-to-end で実行する。

Success criteria:

- 要求分析
- 組織編成
- Team Charter 作成
- Contract 定義
- ADR 作成
- Council による承認
- Roadmap 作成
- Release Plan 作成

## Context

Current baseline:

- `v2.0.0`: installer / bootstrap / upgrade path
- `v2.1.0`: organization model / `.aof/organization.json` / Role-Agent separation

Constraint:

- This planning exercise must use only AOF 2.1 concepts and artifacts.
- No new runtime feature is assumed.
- Codex acts as the parent AI orchestrator and records the organization outputs as AOF artifacts.

## Acceptance Criteria

The mission is satisfied when the repository contains:

- `.aof/organization.json` representing the organization formed for the next major version planning project
- `docs/vnext-requirements-analysis.md`
- `docs/vnext-team-charters.md`
- `docs/vnext-contracts.md`
- `.aof/decisions/ADR-001-next-major-version-direction.json`
- `docs/vnext-roadmap.md`
- `docs/vnext-release-plan.md`

## Scope

In scope:

- planning the next major version
- defining organization structure
- defining team charters and contracts
- documenting council approval and release plan

Out of scope:

- implementing the next major version
- cutting the next major release
- adding new runtime commands during this exercise
- claiming autonomous AI daemon behavior

