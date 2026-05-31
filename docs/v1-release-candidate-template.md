# AOF v1 Release Candidate Note Template

この文書は、`v1` release candidate または `v1` release note を作るときの雛形である。

正本の判定基準は [docs/v1-release-definition.md](./v1-release-definition.md) と
[docs/v1-release-checklist.md](./v1-release-checklist.md) に置く。  
この template は、その時点の証跡を人間に読める形で固定するために使う。

---

## Header

- release candidate: `v1.0.0-rcX` or `v1.0.0`
- commit SHA:
- date:
- prepared by:

## Summary

この release candidate で何を主張するかを 3 行以内で書く。

例:

- AOF `v1` core specification and local runtime prototype are ready for first public release
- local runtime, tests, mock smoke, and bundled templates are verified on the candidate commit
- live `openai-compatible` provider support is `claimed` / `not claimed`

## Scope Of This Release

`v1` で support する surface を列挙する。

### Core

- specification
- local CLI runtime
- bundled AIDLC template
- bundled generic non-AIDLC template
- decision/session persistence
- provider-backed execution through the current adapter boundary
- `provider-check`
- `live-verify`
- `verify-history`

### Non-Core But Shipped

repo には含まれるが、`v1` の non-gating / non-core tooling として扱う surface を列挙する。

- `verify-log`
- `verify-lineage`
- `verify-dashboard`
- `verify-dashboard-log`
- `verify-dashboard-index`
- `verify-archive`
- `verify-archive-log`
- `verify-archive-dashboard`

## Gate Evidence

### Gate 1: Spec Coherence

- status:
- evidence:
  - README:
  - v1 release definition:
  - contradiction sweep note:

### Gate 2: Runtime Coherence

- status:
- evidence:
  - local test runner result:
  - smoke result:
  - additional runtime evidence:

### Gate 3: Template Coherence

- status:
- evidence:
  - AIDLC template result:
  - generic template result:
  - template override coverage note:

### Gate 4: Verification Baseline

- status:
- local evidence:
  - test runner result:
  - smoke result:
- external evidence:
  - CI run URL:
  - CI result:
  - live provider verification claim: `claimed` / `not claimed`
  - live provider artifact path or rationale:

### Gate 5: Release Clarity

- status:
- evidence:
  - known limitations reference:
  - deferred scope reference:
  - operator/contributor guidance reference:
  - RC note / release note self-check:

## Support Claim

### What Is Claimed

- [ ] `v1` core spec is release-ready
- [ ] local CLI runtime is release-ready
- [ ] bundled templates are release-ready
- [ ] mock verification baseline is release-ready
- [ ] live `openai-compatible` provider support is verified and claimed

### What Is Not Claimed

この release candidate で主張しないことを明記する。

例:

- hosted service support
- GUI/web console
- provider-independent behavioral equivalence
- production-grade operator monitoring
- verified live-provider support if manual evidence is absent

## Known Limitations

- limitation 1:
- limitation 2:
- limitation 3:

## Deferred Scope

`v1.1+` に送るものを、今回の判断として再掲する。

- deferred item 1:
- deferred item 2:
- deferred item 3:

## External Evidence Index

外部証跡への参照を 1 か所に集める。

- CI run URL:
- live verification artifact directory:
- live verification bundle path:
- live verification report path:
- optional verification history/log/dashboard path:

## Release Decision

- candidate outcome: `ready` / `not ready`
- blocking conditions still open:
  - blocker 1:
  - blocker 2:

## Sign-Off

- maintainer:
- reviewer:
- decision date:

---

使い終わったら、この template 自体を編集するのではなく、実体の RC note か release note を別名で作る。
