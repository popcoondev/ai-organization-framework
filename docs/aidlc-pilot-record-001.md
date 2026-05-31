# AIDLC Pilot Record 001

実案件として、このリポジトリにおける `#9 Forecast versus Estimate` の仕様化作業を AIDLC パイロットとして記録する。

## Pilot Scope

- Project: `ai-organization-framework`
- Task: [#9 Forecast versus estimate](https://github.com/popcoondev/ai-organization-framework/issues/9)
- Date: May 31, 2026
- Bounded Task Type: 既存仕様リポジトリに対する仕様追加と文書整合

## Why This Counts as a Real Project

この作業は、実際の GitHub repository 上で

- 既存 Issue があり
- 既存仕様と整合を取り
- 文書 artifact を更新し
- decision を記録し
- main へ反映し
- Issue を close した

という実運用の change flow を持っている。  
コード実装ではないが、AIDLC の `Request -> Need / Intent / Context -> Decision -> Artifact -> Outcome` を検証するには十分な bounded software work である。

## Flow Summary

1. Request を Issue #9 として受領
2. 既存仕様を review
3. Need / Intent / Context を framing
4. Forecast model を定義
5. Decision Record template と runtime docs を更新
6. commit `881a8c2` を作成
7. `main` に push
8. Issue #9 に結果を記録して close

## Decision Record Snapshot

### Request

- 見積もりを必須概念にせず Forecast として扱うか

### Need

- AI 組織規格に人間中心の工数前提を持ち込まないこと

### Intent

- 予測情報を optional な判断支援として整理し、runtime と Decision Record で再利用可能にする

### Context

- 既に `Clarification`, `Orientation`, `Policy`, `Completion/Success` は定義済み
- 次は P0 を閉じて P1 に進む段階
- このリポジトリは文書中心の spec repository である

### Existing Artifacts Reviewed

- `README.md`
- `docs/aidlc-pilot.md`
- `docs/decision-record-template.md`
- `docs/runtime-sdk.md`
- `docs/self-review.md`
- `docs/priority-roadmap.md`

### Clarifications or Assumptions

- `Estimate` を禁止するのではなく、`Forecast` の一形式に落とす
- 実案件検証としては、この repository 自体の仕様作業を bounded software work とみなす
- 即時の business KPI はないため、 pilot validation では process outcome を primary とする

### Options Considered

- Option A: `Estimate` をコア概念として残す
- Option B: `Estimate` を廃止し、`Forecast` を optional にする
- Option C: `Decision Support` という抽象名に置き換える

### Decision

- Selected Option: Option B
- Decision Summary: `Estimate` は core から外し、必要時だけ `Forecast` を記録する

### Governance

- Decision Makers: repository maintainer plus current AI organization workflow
- Governance Rule Applied: maintainer-approved spec update with issue-linked documentation
- Veto Used: no

### Rationale

- Why this option: AI-centered work でも human-centered work でも使え、duration estimate を強制しない
- Why other options were not selected: A は人間前提を残し、C は抽象度が高く既存用語より分かりにくい
- Policy priorities applied: Value > Learning > Quality > Cost
- Policy tradeoffs accepted: terminology breadth was preferred over strict planning simplicity

### Execution

- Actions: `docs/forecast-model.md` を追加し、README、Decision Record template、runtime docs、AIDLC pilot docs を更新
- Expected Artifact: forecast model spec, updated templates, synced pilot docs
- Expected Outcome: planning assumptions no longer imply human-only estimation
- Completion Criteria: spec added, linked docs updated, issue synchronized, branch pushed
- Success Criteria: future decisions can record predictive information without forcing time estimate language
- Completion Approval Scope: repository main branch update
- Success Evaluation Scope: subsequent pilot and issue work

### Forecast Optional

- Forecast Required: yes
- Forecast Summary: limited-scope documentation change, medium review load, low rollback risk
- Uncertainty Notes: long-term usability of the model depends on future P1 pilot work

### Review

- Review Trigger: next AIDLC pilot pass or when prediction fields feel too heavy in actual use
- Review Date or Condition: before or during Issue #5 closure
- Re-open Conditions: forecast fields create friction or still force human-centric language

## Produced Artifacts

- [docs/forecast-model.md](docs/forecast-model.md)
- [docs/decision-record-template.md](docs/decision-record-template.md)
- [docs/runtime-sdk.md](docs/runtime-sdk.md)
- commit `881a8c2`

## Observed Outcome

短期 outcome として確認できたのは次の点である。

- `Estimate` を mandatory にしない方針が README と pilot docs に一貫して反映された
- `Decision Record` が human duration 以外の予測情報も保持できるようになった
- P0 を完了として roadmap を更新できた

長期 outcome はまだ未観測である。  
具体的には、今後の実案件で `Forecast` 欄が軽量に運用できるかは継続観測が必要である。

## Friction and Gaps

今回の pilot で見えた friction。

1. `Decision Record` の項目数が増えており、軽量案件では負荷が高くなりうる
2. docs-only task では `Outcome` が business KPI より process outcome に寄りやすい
3. `Governance` の記録粒度が repository maintainer 主体で、Council 形式までは使っていない

## What the Pilot Validated

今回の record で、AIDLC パイロット成功条件のうち次を確認できた。

1. 作業を `Need` `Intent` `Context` から説明できた
2. Issue ベースの decision trace を残せた
3. Artifact と担当変更を対応づけられた
4. `Completion` と短期 `Outcome` を分離して記録できた
5. `Outcome` から次の見直し条件を置けた

## Remaining Limits

まだ未確認の点。

1. 外部 KPI を持つ release work での `Outcome` 観測
2. code-heavy task での記録負荷
3. 複数 actor と複数 approval scope を持つ案件での運用

## Conclusion

この pilot は、AIDLC を抽象図のままでなく、実際の repository work に適用できることを示した。  
ただし、軽量案件での記録負荷と、docs-only work における outcome 観測の薄さは残課題である。
