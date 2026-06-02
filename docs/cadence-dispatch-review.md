# Cadence Dispatch Review

- 作成日: `2026-06-02`
- 作成者: レビュー分析（claude/framework-review-HCxns）
- 対象: `docs/cadence-runtime-model.md` および `.github/workflows/cadence-dispatch.yml`
- 前提: `v1.9.0` リリース済み

---

## 暴走リスク評価

### 結論: 無限ループにはならないが、毎時 CI が連鎖起動する

`cadence-dispatch.yml` は `on: schedule` と `on: workflow_dispatch` のみをトリガーとする。  
bot が main に push しても `cadence-dispatch` 自体は再起動しない。**厳密な無限ループは発生しない。**

ただし、以下の連鎖が現在進行中である。

```
[毎時] cron (0 * * * *) → cadence-dispatch 起動
                         → .aof/ が変化する（due-now 状態が継続中）
                         → git commit & push to main
                         → ci.yml が on: push で起動
                         → npm test + npm run smoke（full CI）
```

TASK-005 が未トリアージである限り `timing_state: "due-now"` が継続し、  
**毎時 1 回の cadence-dispatch ＋ 1 回の CI が自動起動し続ける。**

---

## 指摘一覧

### F-1: CI が `.aof/` 変化でも全件実行される（現在進行中）

**該当箇所**: `.github/workflows/ci.yml`

```yaml
on:
  push:        # ← ブランチフィルタも paths フィルタもなし
  pull_request:
```

`cadence-dispatch` が `.aof/` のみを更新して push しても、全テスト（`npm test` + `npm run smoke`）が走る。  
`.aof/` の JSON ファイルはテスト対象ではなく、CI に意味のある変化をもたらさない。

**現在の影響**: TASK-005 が未トリアージのため `due-now` が継続 → 毎時 CI が起動。

**修正案**:

```yaml
on:
  push:
    paths-ignore:
      - '.aof/**'
  pull_request:
    paths-ignore:
      - '.aof/**'
```

または bot push を CI から除外する:

```yaml
jobs:
  validate:
    if: github.actor != 'github-actions[bot]'
```

---

### F-2: `recommended_next_check_after_hours: 0` が due-now を永続させる

**該当箇所**: `.aof/context/active/cadence-dispatch.json`

```json
"recommended_next_check_after_hours": 0,
"recommended_next_check_at": "2026-06-02T23:35:55.017Z"  // 過去日時
```

`due-now` 状態では after_hours が 0 になり、毎回 `invoke-now` を返す。  
スケジュール起動が毎時なので影響は cron 頻度に抑えられているが、  
仮に `workflow_dispatch` で手動実行を繰り返せば毎回フル実行される。

`stale_after_hours: 24` と矛盾する。due-now 解消（TASK-005 トリアージ）が根本対処。

---

### F-3: commit メッセージが内容を語らない

**該当箇所**: `.github/workflows/cadence-dispatch.yml`

```yaml
git commit -m "Run cadence-dispatch"
```

何の artifact が変わったか、どの action が実行されたか、tick_state が何だったかが追跡できない。  
PR 化しない場合でも、以下のようにすると履歴から状態変化を読める。

```yaml
TICK=$(node ./src/cli.js cadence-dispatch --project . --stale-after-hours 24 --json \
  | jq -r '.tick_state // "unknown"')
git commit -m "cadence-dispatch: tick=${TICK}"
```

---

### F-4: `git add .aof` がセッションデータ等も対象にとる

**該当箇所**: `.github/workflows/cadence-dispatch.yml`

```yaml
git add .aof
```

`.aof/sessions/` や `.aof/context/threads/` に将来的にセッション固有の中間ファイルが入った場合、  
意図せず commit される。cadence が更新する artifact は限定されているため、対象を絞るか  
`.gitignore` で除外ルールを整備しておくことが望ましい。

---

### F-5: `cancel-in-progress: false` の意味が逆方向に働く可能性

**該当箇所**: `.github/workflows/cadence-dispatch.yml`

```yaml
concurrency:
  group: cadence-dispatch
  cancel-in-progress: false
```

実行中の cadence run があるとき新しい cron トリガーが来てもキャンセルせずキューに入る。  
通常の cadence run が 1 時間を超えることはないが、  
将来 follow-through が重くなった場合（複数タスク triage など）はキューが詰まりうる。  
`cancel-in-progress: true` にしてスキップさせる方が安全な場合もある。

---

## 優先度まとめ

| # | 問題 | 影響 | 優先度 |
|---|---|---|---|
| F-1 | CI が .aof/ push で全件実行 | 毎時 CI 消費（現在進行中） | 高 |
| F-2 | due-now が TASK-005 解消まで継続 | F-1 の根本原因 | 高（TASK-005 トリアージで解消） |
| F-3 | commit メッセージに情報がない | 履歴追跡困難 | 中 |
| F-4 | git add .aof がスコープ広すぎ | 将来リスク | 低 |
| F-5 | cancel-in-progress: false | 将来キュー詰まり可能性 | 低 |

---

## 最優先アクション

1. `ci.yml` に `paths-ignore: ['.aof/**']` を追加する（F-1）
2. TASK-005 をトリアージして `due-now` を解消する（F-2）
