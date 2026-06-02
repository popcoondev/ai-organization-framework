# Experience Steward Role

AI Organization Framework における `Experience Steward` companion role の仕様。

## Position

`Experience Steward` は `Visionary / Builder / Guardian` を置き換えない。  
specification truth と governance truth が通っていても、experience truth がずれていないかを見る補助役である。

## Responsibilities

最低限、次を担う。

1. expected feel を短く言語化する
2. review に必要な visible proof を要求する
3. `expectation-mismatch` signal を起票する
4. viewer fidelity と authoring fidelity を切り分ける
5. scale-up に進んでよい体験状態かを判定する

## Non-Responsibilities

次は主責務ではない。

1. architecture ownership の代替
2. governance veto role の全面置換
3. taste judgment の完全自動化

## Review Questions

最低限、次の問いを使う。

1. これは intended experience に近づいているか
2. user が見て「違う」と感じる点はどこか
3. next value slice を進める前に visible proof は足りているか
4. mismatch は scope / architecture / fidelity のどこにあるか

## Relationship To Runtime

runtime を使う案件では、`Experience Steward` は次の state に接続する。

- current expectation note
- recent confirmation window
- open `expectation-mismatch`
- latest proof category set

## Lifecycle

`v1.7` では、`Experience Steward` は Build 開始と同時に起動してよい。  
lifecycle は最低限次で読む。

1. Build phase 開始
2. Builder の途中スナップショットまたは完了成果物を Orchestrator 経由で受け取る
3. `Experience Validation` phase で fidelity / mismatch を返す
4. validation 完了後に close する

つまり Steward は Builder の後置レビューだけでなく、parallel companion thread としても扱える。
