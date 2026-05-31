# AOF v1 Release Definition

AI Organization Framework を `v1` として完成・リリースするための基準を定義する。

この文書の目的は 3 つある。

1. `v1` に何を含めるかを固定する
2. `v1` に含めないものを明示する
3. issue 棚卸しと roadmap 更新の判断基準を揃える

## Position

この文書における `v1 release` は、framework の概念仕様と local runtime prototype が、
「公開して使い始められる一貫した最初の版」として成立する状態を指す。

ここでいう `release` は次を意味する。

- 概念仕様が文書として整合している
- local runtime が主要 workflow を再現できる
- template/example/test/CI が最低限揃っている
- 既知の非対応範囲が明示されている

これは [docs/completion-success-model.md](docs/completion-success-model.md) における `Completion` に近い。  
`Success` は、実運用や pilot を通じて後から検証される。

## v1 Goal

`v1` の主目標は、AOF を次のようなものとして公開できる状態にすることである。

- 曖昧な要求を `Need / Intent / Context` に分解して扱う framework
- governance と decision record を持つ framework
- local template と local runtime で最小実行可能な framework
- 人間と AI の混成運用を前提とした framework

言い換えると、`v1` は「概念仕様だけ」でも「完全な hosted product」でもない。  
仕様と prototype runtime が揃った最初の実用版である。

## In Scope For v1

`v1` に含めるものは次である。

### Specification

- core concepts
  - `Need`
  - `Intent`
  - `Context`
  - `Discussion`
  - `Decision`
  - `Action`
  - `Artifact`
  - `Outcome`
  - `External Signal`
- clarification / orientation / framing
- governance / actor / role / communication model
- completion / success separation
- context lifecycle and decision log profile
- template manifest and session model

### Runtime Prototype

- local CLI-based runtime
- `.aof/` template loading
- session persistence
- decision record emission
- council execution planning
- approval / escalation / reopen lifecycle
- provider-backed execution through the current adapter boundary

### Templates And Examples

- AIDLC example template
- generic non-AIDLC example template
- project-local decision record shell and schema usage
- domain adaptation guidance for non-software domains

### Verification Baseline

- automated tests
- CLI smoke coverage
- CI baseline
- manual live provider verification procedure
- minimal release evidence surface
  - `provider-check`
  - `live-verify`
  - `verify-history`

### Release Documentation

- README level positioning
- CLI reference
- runtime prototype plan
- live provider verification guide
- this `v1 release definition`

## Out Of Scope For v1

`v1` ではやらないことを明示する。

### Product Scope

- hosted service
- GUI / web console
- multi-tenant deployment model
- remote orchestration platform

### Provider Scope

- every model provider の first-class support
- provider-independent behavioral equivalence の保証
- advanced cost optimization / routing optimization

### Workflow Scope

- 全 industry/domain の完成テンプレート提供
- domain-specific business logic の framework 内蔵
- full automatic approval without human governance

### Operations Scope

- production-grade alerting platform
- automatic remediation
- automatic escalation dispatch to external systems
- enterprise audit integrations

## Non-Goals

`v1` の non-goal は次である。

1. AI が常に正しい判断をすることを保証しない
2. business outcome の達成を保証しない
3. すべての組織に単一 governance model を強制しない
4. domain-specific process を framework 側で完全定義しない
5. runtime 単独で人間判断を不要にしない
6. 長期運用監査機能を先に完成させない

## Deferred To v1.1+

`v1` 以降に送る候補は次である。

### Runtime/Operations

- advanced operator-facing verification expansion
  - the repository may ship non-core verification commands such as
    `verify-log`, `verify-lineage`, `verify-dashboard`,
    `verify-dashboard-log`, `verify-dashboard-index`,
    `verify-archive`, `verify-archive-log`, and `verify-archive-dashboard`
  - these are treated as non-gating operator tooling in `v1`
  - support hardening, long-run monitoring guarantees, and stronger operator
    commitments for those surfaces are deferred to `v1.1+`
- long-run operator monitoring refinement
- richer recommendation analytics
- broader provider observability rollups

### Clarification/Adaptation

- richer semantic trigger classes
- deeper ask-vs-assume policy control
- domain-specific prompt packs beyond current template overrides

### Productization

- richer multi-project workflows
- broader adapter ecosystem
- non-local execution environments

## Release Gates

`v1` を release candidate とみなすには、少なくとも次を満たすこと。

### Gate 1: Spec Coherence

- major specification contradictions are resolved
- README, runtime/session/template docs, and core models are mutually consistent

### Gate 2: Runtime Coherence

- local runtime can execute the core lifecycle
- clarification -> framing -> planning -> proposal/review -> approval is reproducible
- escalation and reopen paths are reproducible

### Gate 3: Template Coherence

- bundled example templates load successfully
- at least one non-AIDLC template works end-to-end

### Gate 4: Verification Baseline

- authoritative local test runner is green
- authoritative CLI smoke is green with the `mock` provider
- CI baseline is green
- live provider verification is handled separately
  - manual `openai-compatible` verification evidence is required before claiming
    verified live-provider support in `v1` release notes
  - the live-provider procedure itself is documented in
    [docs/live-provider-verification.md](docs/live-provider-verification.md)

### Gate 5: Release Clarity

- known limitations are documented
- deferred scope is documented
- operator / contributor can tell what `v1` is and is not

## Release Evidence

`v1` release readiness を主張するときは、最低限次の evidence を示す。

1. current `main` commit
2. test result
3. smoke result
4. CI result
5. doc set references
6. known limitations / deferred items

release candidate の実運用 checklist は [docs/v1-release-checklist.md](docs/v1-release-checklist.md) を正本とする。
RC note / release note の雛形は [docs/v1-release-candidate-template.md](docs/v1-release-candidate-template.md) を使う。

## Current Gate Status

この section は release candidate 判定前に更新する前提の、現在の読みを記録する。

### Gate 1: Spec Coherence

- status: `provisionally-satisfied`
- reading:
  - major contradictions from the earlier consistency pass are largely resolved
  - `v1` boundary wording and support-surface wording are now explicit
  - a final release-candidate sweep is still required before tagging `v1`

### Gate 2: Runtime Coherence

- status: `locally-satisfied`
- evidence:
  - authoritative local test runner exercises clarification, planning,
    proposal/review, approval, escalation, and reopen flows
  - authoritative CLI smoke covers the same lifecycle on the AIDLC template

### Gate 3: Template Coherence

- status: `locally-satisfied`
- evidence:
  - bundled templates load successfully in automated tests
  - authoritative CLI smoke includes both the AIDLC template and one non-AIDLC
    generic template flow

### Gate 4: Verification Baseline

- status: `local-baseline-satisfied`
- evidence:
  - authoritative local test runner is currently green
  - authoritative CLI smoke is currently green with `--provider mock`
  - CI baseline exists and must be re-checked at release-candidate time
  - live `openai-compatible` verification is intentionally manual and must be
    evidenced separately before claiming verified live-provider support

### Gate 5: Release Clarity

- status: `provisionally-satisfied`
- reading:
  - the repo now has an explicit `v1` boundary document
  - core vs non-core verification surfaces are named
  - release notes and final support wording still need a last pass at RC time

## Issue Triage Cadence

issue 棚卸しは定期的に行う。  
最低限、次のタイミングで行う。

1. 新しい implementation wave に入る前
2. major feature を 1 つ閉じた直後
3. release candidate 判定の前

棚卸し時に見ること。

1. open issue があるか
2. open issue に高優先度の release blocker があるか
3. open issue が `v1` ではなく `v1.1+` に送るべき内容か
4. roadmap の `Next Move` と実際の issue 優先順がずれていないか

## Roadmap Refresh Rule

roadmap 更新は次の原則で行う。

1. release blocker を先に上げる
2. `v1` core と `post-v1` operations を混ぜない
3. 仕様整合、runtime coherence、release clarity の順で優先する

判断 rule:

- `v1` の境界を曖昧にする機能は後回しにする
- release gate を直接前進させる作業を優先する
- operator convenience だけを増やす機能は `v1.1+` 候補として扱う

## Current Reading

現時点の repo については、次のように読む。

- core spec と local runtime はかなり進んでいる
- domain adaptation の最小手段も入り始めている
- `v1` core verification surface として扱うのは
  - `provider-check`
  - `live-verify`
  - `verify-history`
- 一方で次の operator-oriented verification surfaces は repo 内に存在しても
  `v1` の non-core / non-gating tooling として扱う
  - `verify-log`
  - `verify-lineage`
  - `verify-dashboard`
  - `verify-dashboard-log`
  - `verify-dashboard-index`
  - `verify-archive`
  - `verify-archive-log`
  - `verify-archive-dashboard`

したがって今後の判断は、
「機能追加」より「`v1` の境界を守りながら不足分を埋める」ことを優先する。
