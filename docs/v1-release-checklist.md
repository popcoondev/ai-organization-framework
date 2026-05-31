# AOF v1 Release Checklist

`v1` を tag / release candidate として扱う前に確認する checklist。

この文書は [docs/v1-release-definition.md](docs/v1-release-definition.md) の release gate を、
実際の evidence と運用手順に落としたものとする。

## How To Use This Checklist

使い方は単純である。

1. gate ごとに必要 evidence を埋める
2. local evidence と external evidence を分けて扱う
3. missing evidence が 1 つでもあれば `v1 ready` とは言わない

この checklist の役割は、`Completion` の主張を曖昧にしないことにある。  
`Success` の主張はここでは扱わない。

## Evidence Classes

### Local Evidence

repo の中か、ローカル実行で即座に確認できる evidence。

- docs
- committed examples
- `node ./scripts/test-runner.js`
- `node ./scripts/smoke.js`
- generated local verification artifacts

### External Evidence

repo の外部状態に依存する evidence。

- GitHub Actions の green run
- live `openai-compatible` provider verification
- release tag / release notes

RC note / release note の雛形は [docs/v1-release-candidate-template.md](./v1-release-candidate-template.md) を使う。

## Gate Checklist

### Gate 1: Spec Coherence

Required evidence:

- [ ] [README.md](../README.md) が framework の位置づけを現行仕様と矛盾なく説明している
- [ ] [docs/v1-release-definition.md](./v1-release-definition.md) が `In Scope / Out Of Scope / Deferred / Release Gates` を固定している
- [ ] core model docs が相互参照上で矛盾していない
  - [ ] [docs/completion-success-model.md](./completion-success-model.md)
  - [ ] [docs/runtime-session-model.md](./runtime-session-model.md)
  - [ ] [docs/template-manifest-model.md](./template-manifest-model.md)
  - [ ] [docs/council-execution-model.md](./council-execution-model.md)
  - [ ] [docs/external-signal-model.md](./external-signal-model.md)

Current reading:

- local spec pass はほぼ完了
- RC 前に docs-only contradiction sweep を 1 回行う

### Gate 2: Runtime Coherence

Required evidence:

- [ ] authoritative local test runner が green
- [ ] clarification -> planning -> proposal/review -> approval が再現できる
- [ ] escalation / reopen / signal paths が再現できる

Primary commands:

```bash
node ./scripts/test-runner.js
node ./scripts/smoke.js
```

Current reading:

- local runtime coherence は現時点で satisfied と読める

### Gate 3: Template Coherence

Required evidence:

- [ ] AIDLC template が load / run / answer / council execution を通る
- [ ] generic non-AIDLC template が end-to-end で通る
- [ ] template-local clarification override / question policy が test で覆われている

Primary evidence:

- [scripts/smoke.js](../scripts/smoke.js)
- [test/runtime.test.js](../test/runtime.test.js)
- [examples/aidlc-template/.aof/aof.yaml](../examples/aidlc-template/.aof/aof.yaml)
- [examples/generic-template/.aof/aof.yaml](../examples/generic-template/.aof/aof.yaml)

Current reading:

- authoritative smoke に generic template flow まで入ったので local evidence はある

### Gate 4: Verification Baseline

Required evidence:

- [ ] authoritative local test runner が green
- [ ] authoritative CLI smoke が `mock` provider で green
- [ ] GitHub Actions の CI baseline が current release candidate commit で green
- [ ] live `openai-compatible` verification evidence が存在するか、存在しないなら release note で “verified live-provider support is not claimed” と明記されている

Local commands:

```bash
node ./scripts/test-runner.js
node ./scripts/smoke.js
```

External evidence:

- GitHub Actions run URL
- live verification artifact directory or archived bundle
- optional history/log/dashboard artifacts derived from the live bundle

Reference procedure:

- [docs/live-provider-verification.md](./live-provider-verification.md)

Current reading:

- local mock baseline は揃っている
- live provider preflight は `/tmp/aof-v1-live/provider-check.json` で成功した
- first live execution attempt は `429 insufficient_quota` で止まったので、verified live-provider support はまだ claim できない
- external CI evidence は RC 前の明示確認が引き続き必要

### Gate 5: Release Clarity

Required evidence:

- [ ] known limitations が文書化されている
- [ ] deferred scope が文書化されている
- [ ] contributor/operator が v1 の support surface を判別できる
- [ ] release note または RC note で live-provider claim の有無が読める

Primary docs:

- [docs/v1-release-definition.md](./v1-release-definition.md)
- [docs/cli-reference.md](./cli-reference.md)
- [docs/live-provider-verification.md](./live-provider-verification.md)
- [docs/domain-adaptation-guide.md](./domain-adaptation-guide.md)

Current reading:

- `v1` boundary は定義済み
- final release note / RC note はまだ必要

## Release Candidate Artifact Set

`v1` RC を主張するときは、最低限次を 1 か所に集める。

### Required

- [ ] commit SHA
- [ ] test result
- [ ] smoke result
- [ ] CI run URL
- [ ] doc references
- [ ] known limitations / deferred scope summary

### Conditional

- [ ] live `openai-compatible` verification artifact path
- [ ] live verification report path
- [ ] archived verification history/log/dashboard path
- [ ] RC note or release note based on [docs/v1-release-candidate-template.md](./v1-release-candidate-template.md)

## Blocking Conditions

次のどれかが残っている場合、`v1 ready` とは言わない。

1. authoritative local runner が赤い
2. authoritative smoke が赤い
3. current RC commit に対する CI evidence がない
4. live-provider support を claim するのに manual evidence がない
5. release note / RC note がなく、support surface が読み手に伝わらない

## Release-Day Procedure

1. `git status` が clean であることを確認する
2. `node ./scripts/test-runner.js` を実行する
3. `node ./scripts/smoke.js` を実行する
4. current candidate commit の GitHub Actions 結果を確認する
5. 必要なら [docs/live-provider-verification.md](./live-provider-verification.md) に従って live verification を実施する
6. release note / RC note に support surface と未 claim 領域を書く
7. ここまで揃って初めて `v1 ready` と判定する

現在の populated draft としては [docs/v1.0.0-rc-draft.md](./v1.0.0-rc-draft.md) を使う。

## Current Remaining External Evidence

現時点で local repo だけでは埋まらないもの。

- current candidate commit に対する CI green evidence
- live `openai-compatible` verification artifact
- final release note / RC note

これらは repo 内の実装不足ではなく、release-candidate 運用時に埋める external evidence である。
