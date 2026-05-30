# AIDLC Pilot Validation

Issue [#5](https://github.com/popcoondev/ai-organization-framework/issues/5) に対応する実証検証メモ。

## Validation Target

- Pilot record: [docs/aidlc-pilot-record-001.md](docs/aidlc-pilot-record-001.md)
- Real project task: Issue `#9 Forecast versus Estimate`

## Success Criteria Check

### 1. すべての作業が `Need` `Intent` `Context` から説明できる

- Result: passed
- Note: record 内で framing を明示できた

### 2. 各承認点に `Decision` の記録がある

- Result: partially passed
- Note: bounded doc task なので multi-gate AIDLC 全段階は通していないが、少なくとも 1 decision record snapshot は残せた

### 3. Artifact と担当 Actor を対応づけられる

- Result: passed
- Note: artifact と repository maintainer / current AI workflow の関係は追えた

### 4. リリース後に `Outcome` を観測できる

- Result: partially passed
- Note: docs task のため product KPI ではなく process outcome を観測した

### 5. `Outcome` に基づいて次の `Context` を更新できる

- Result: passed
- Note: `Forecast` 欄の運用負荷が次の context 更新点として抽出された

### 6. 必要なら `Need` または `Intent` の再解釈に戻れる

- Result: passed
- Note: forecast field が重すぎる場合の reopen condition を記録した

## Friction Summary

1. `Decision Record` は軽量案件ではまだ重い
2. docs-only task では `Outcome` が KPI でなく process outcome に寄る
3. AIDLC の full gate validation には code or release task も追加で必要

## Framework Updates Confirmed

今回の pilot 実施により、少なくとも次の更新が正当化された。

- `Forecast` を optional にしたこと
- `Completion` と `Success` を分けたこと
- `Decision Record` に optional prediction fields を入れたこと

## Follow-up Needed

1. code-heavy task で second pilot を回す
2. `Decision Record` の lightweight profile が要るか検討する
3. external KPI を伴う案件で `Outcome` 観測を試す
