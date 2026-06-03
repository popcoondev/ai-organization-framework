# CLI Reference

この文書は current prototype の `aof` CLI command をまとめた quick reference である。  
実装の正本は [src/cli.js](../src/cli.js) にある。

## Core Flow

### `run`

新しい request から session と initial decision record を生成する。

```bash
node ./src/cli.js run "初回離脱率を下げたい" --project ./examples/aidlc-template
```

主な option:

- `--project <path>`: target project root
- `--fast-track`: routing mode を `fast-track` に override
- `--deep-path`: routing mode を `deep-path` に override

副作用:

- `Current Operating Goal` を `.aof/goals/operating-goal.json` に initial projection として同期する

### `answer`

clarification answer を session に取り込む。

```bash
node ./src/cli.js answer \
  --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json \
  --response "新規登録導線全体" \
  --response "登録完了率を 5% 改善する" \
  --response "認証基盤は変更しない"
```

主な option:

- `--session <path>`: target session file
- `--response "<text>"`: answer text。複数回指定可

副作用:

- clarification answer を `Recent Confirmation Window` に自動追記する
- request が `framed` になった場合、`.aof/goals/operating-goal.json` を refined need に寄せて更新する

### `outcome-report`

decision 後の actual outcome を session に書き戻す。

```bash
node ./src/cli.js outcome-report \
  --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json \
  --result success \
  --note "登録導線の KPI が改善した" \
  --signal-ref SIG-001
```

主な option:

- `--session <path>`: target session file
- `--result <success|partial|failure>`: observed outcome result
- `--note "<text>"`: short outcome note
- `--signal-ref <ref>`: optional linked signal or external reference

副作用:

- current `Next Value Slice` projection を `.aof/goals/next-value-slice.json` に同期する
- outcome writeback 時点で `declared_complete_at` を埋める

### `task-open`

`.aof/tasks/open/` に canonical task artifact を作成する。

```bash
node ./src/cli.js task-open \
  --project ./examples/aidlc-template \
  --title "Add runtime write path" \
  --origin orchestrator \
  --operating-goal-ref v1.8-self-hosting
```

主な option:

- `--project <path>`: target project root
- `--title "<text>"`: task title
- `--description "<text>"`: optional description
- `--origin <discovery|experience-steward|guardian|orchestrator|human>`: optional task origin
- `--orchestrator-session-id <id>`: canonical owner session
- `--assigned-session-id <id>`: working child session, multiple allowed
- `--related-decision-record-id <id>`: optional decision record reference
- `--operating-goal-ref <ref>`: optional operating goal reference
- `--triage-notes "<text>"`: optional triage notes

### `task-update`

既存 task artifact を更新し、必要なら status directory も移動する。

```bash
node ./src/cli.js task-update \
  --project ./examples/aidlc-template \
  --task-id TASK-001 \
  --status done \
  --related-decision-record-id DEC-001
```

主な option:

- `--project <path>`: target project root
- `--task-id <TASK-id>`: target task id
- `--status <open|assigned|done|archived|retired>`: optional lifecycle transition
- `--assigned-session-id <id>`: replace assigned session list when provided, multiple allowed
- `--related-decision-record-id <id>`: optional decision evidence
- `--triage-notes "<text>"`: optional updated triage notes

### `goal-project`

`.aof/goals/` に canonical goal projection file を書き込む。

```bash
node ./src/cli.js goal-project \
  --project ./examples/aidlc-template \
  --goal-type next-value-slice \
  --content "Add runtime write path for tasks and goals" \
  --agreed-with-human
```

主な option:

- `--project <path>`: target project root
- `--goal-type <north-star|operating-goal|next-value-slice>`
- `--content "<text>"`: projected goal text
- `--agreed-with-human`: mark human agreement
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--declared-complete`: write `declared_complete_at`

### `confirmation-window-record`

`Recent Confirmation Window` を `.aof/context/active/` に追記し、最新数件だけを canonical に保持する。

```bash
node ./src/cli.js confirmation-window-record \
  --project ./examples/aidlc-template \
  --question "まだ解くべき問題は同じか" \
  --answer "はい。runtime write path が最優先" \
  --expectation-state "self-hosting gap remains active"
```

主な option:

- `--project <path>`: target project root
- `--question "<text>"`: repeated confirmation question
- `--answer "<text>"`: human-aligned answer
- `--expectation-state "<text>"`: optional current expectation summary
- `--mismatch-state "<text>"`: optional mismatch summary
- `--scale-direction "<text>"`: optional next scale-up direction
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` entries; default `3`

### `alignment-pulse`

`Alignment Pulse` を `.aof/context/active/alignment-pulse.json` と task triage metadata に書き込む。

```bash
node ./src/cli.js alignment-pulse \
  --project ./examples/aidlc-template \
  --question "まだ解くべき問題は同じか" \
  --answer "はい。task triage cadence を runtime に入れる" \
  --prioritized-task-id TASK-004 \
  --triage-note "cadence-focused pulse after v1.9.0"
```

主な option:

- `--project <path>`: target project root
- `--question "<text>"`: cadence review question
- `--answer "<text>"`: current alignment answer
- `--expectation-state "<text>"`: optional expectation summary
- `--mismatch-state "<text>"`: optional remaining gap summary
- `--scale-direction "<text>"`: optional next-step direction
- `--prioritized-task-id <TASK-id>`: mark task as prioritized, multiple allowed
- `--stale-task-id <TASK-id>`: mark task as stale candidate, multiple allowed
- `--retire-candidate-task-id <TASK-id>`: mark task as retire-review candidate, multiple allowed
- `--triage-note "<text>"`: update task triage notes
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`

副作用:

- `.aof/context/active/alignment-pulse.json` を更新する
- open task の triage freshness と stale / retire-candidate classification を更新する
- `Recent Confirmation Window` に cadence review を追記する
- pulse 実行後に `cadence-trigger-guidance.json` も自動 refresh する

### `cadence-trigger-guide`

current cadence surfaces から、次に人や Orchestrator が回すべき cadence action を要約する。

```bash
node ./src/cli.js cadence-trigger-guide \
  --project ./examples/aidlc-template \
  --source-session-id SESS-ORCH-001 \
  --source-decision-record-id DEC-004
```

主な option:

- `--project <path>`: target project root
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`

副作用:

- `.aof/context/active/cadence-trigger-guidance.json` を更新する
- retire review 候補 task や不足している cadence surface を要約する
- `trigger_state` と `batching_mode` により、follow-through が不要か、単独 action で足りるか、複数 action をまとめるべきかを示す
- 実際に次に叩くべき command suggestion を guidance artifact に含める
- guidance summary を `Recent Confirmation Window` に自動追記する

### `cadence-follow-through`

cadence guidance を follow-through execution に落とす。single-action はそのまま実行し、batched guidance では runtime で安全に実行できる action だけを部分実行し、残りは skip reason として残す。

```bash
node ./src/cli.js cadence-follow-through \
  --project ./examples/aidlc-template \
  --resolution keep-open \
  --note "Retain the task after guided follow-through"
```

主な option:

- `--project <path>`: target project root
- `--resolution <retire|keep-open>`: retire review follow-through 用の resolution。省略時は conservative default として `keep-open` を使う
- `--note "<text>"`: follow-through note。省略時は runtime default note を使う
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`

副作用:

- `.aof/context/active/cadence-follow-through.json` を更新する
- current guidance が `single-action` かつ `retire-candidate-review` の場合、その review を runtime 経由で実行する
- current guidance が `batched-follow-through` の場合、runtime で安全に実行できる action を部分実行し、入力不足の action は skipped reason として残す
- follow-through outcome を `Recent Confirmation Window` に追記する
- それ以外の guidance state では skip reason を artifact に残す

### `cadence-tick`

current cadence surfaces を見て、いま cadence follow-through を開始すべきかを runtime が判断する。実行可能な follow-through なら、そのまま 1 step で開始する。

```bash
node ./src/cli.js cadence-tick \
  --project ./examples/aidlc-template \
  --resolution keep-open \
  --note "Retain the task after cadence tick follow-through" \
  --stale-after-hours 24
```

主な option:

- `--project <path>`: target project root
- `--resolution <retire|keep-open>`: tick が retire review follow-through をその場で実行する場合の resolution。省略時は conservative default として `keep-open` を使う
- `--note "<text>"`: tick が follow-through を実行する場合の note。省略時は runtime default note を使う
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`
- `--stale-after-hours <n>`: cadence freshness threshold used for `due-now` evaluation; default `24`

副作用:

- `.aof/context/active/cadence-tick.json` を更新する
- `.aof/context/active/cadence-timing.json` を更新する
- `cadence-trigger-guidance` を最新状態に refresh する
- 実行可能な follow-through があれば、そのまま `cadence-follow-through` まで進める
- cadence timing を `due-now` / `not-due` として first-class に記録する
- tick judgment を `Recent Confirmation Window` に追記する

### `cadence-cycle`

cadence timing を見て、`due-now` なら `cadence-tick` まで自動で進める。`not-due` なら何も起動せず、defer の判断だけを記録する。

```bash
node ./src/cli.js cadence-cycle \
  --project ./examples/aidlc-template \
  --resolution keep-open \
  --note "Retain the task after cadence cycle follow-through" \
  --stale-after-hours 24
```

主な option:

- `--project <path>`: target project root
- `--resolution <retire|keep-open>`: cycle が self-start した tick 内で retire review follow-through を実行する場合の resolution。省略時は conservative default として `keep-open` を使う
- `--note "<text>"`: cycle が self-start した tick 内で follow-through を実行する場合の note。省略時は runtime default note を使う
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`
- `--stale-after-hours <n>`: cadence freshness threshold used for `due-now` evaluation; default `24`

副作用:

- `.aof/context/active/cadence-cycle.json` を更新する
- cadence timing を評価する
- `due-now` なら `cadence-tick` をその場で起動する
- `not-due` なら defer judgment だけを `Recent Confirmation Window` に残す
- `.aof/context/active/cadence-schedule.json` を最新状態に refresh する

### `cadence-schedule`

external scheduler がそのまま読める cadence scheduling artifact を生成する。  
runtime の cadence timing を見て、

- `invoke-now`
- `poll-later`

のどちらかを machine-readable に返す。

```bash
node ./src/cli.js cadence-schedule \
  --project ./examples/aidlc-template \
  --stale-after-hours 24
```

主な option:

- `--project <path>`: target project root
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`
- `--stale-after-hours <n>`: cadence freshness threshold used to compute invoke-now vs poll-later; default `24`

副作用:

- `.aof/context/active/cadence-schedule.json` を更新する
- cadence timing を再評価する
- `invoke-now` なら `cadence-cycle` を外部 scheduler が起動すべきことを machine-readable に示す
- `poll-later` なら `recommended_next_check_at` / `recommended_next_check_after_hours` を返す
- scheduling summary を `Recent Confirmation Window` に追記する

### `cadence-dispatch`

external scheduler が定期的に叩く受け皿。  
runtime の `cadence-schedule` を見て、

- `invoke-now` なら `cadence-cycle` まで進める
- `poll-later` なら defer を記録する

ので、外部 cron / scheduler からは `cadence-dispatch` を呼ぶだけでよい。

注意:

- この repository の current workflow は **self-hosting topology** 前提である
- managed project では cadence state を product `main` に直接 push しない
- managed project の write target policy は [github-operations-model.md](./github-operations-model.md) を正本とする

```bash
node ./src/cli.js cadence-dispatch \
  --project ./examples/aidlc-template \
  --resolution keep-open \
  --note "Retain the task after external cadence dispatch" \
  --stale-after-hours 24
```

主な option:

- `--project <path>`: target project root
- `--resolution <retire|keep-open>`: dispatch が `cadence-cycle` を自動起動し、その中で retire review follow-through を実行する場合の resolution。省略時は conservative default として `keep-open` を使う
- `--note "<text>"`: dispatch 由来の follow-through note。省略時は runtime default note を使う
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`
- `--stale-after-hours <n>`: cadence freshness threshold used across schedule, cycle, and tick; default `24`

副作用:

- `.aof/context/active/cadence-dispatch.json` を更新する
- `.aof/context/active/cadence-schedule.json` を再評価する
- `invoke-now` のときは `cadence-cycle` をその場で起動する
- `poll-later` のときは defer judgment と次の polling window を残す
- dispatch summary を `Recent Confirmation Window` に追記する

### `cadence-scheduler-binding`

real operation で external scheduler をどう結びつけるかを machine-readable に出す。  
`cadence-schedule` と `cadence-dispatch` は runtime surface として揃ったので、この command は

- cron
- GitHub Actions schedule
- agent loop

の 3 profile で `cadence-dispatch` をどう呼ぶかを固定化する。

```bash
node ./src/cli.js cadence-scheduler-binding \
  --project ./examples/aidlc-template \
  --stale-after-hours 24
```

主な option:

- `--project <path>`: target project root
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`
- `--stale-after-hours <n>`: cadence freshness threshold used to derive the conservative polling interval; default `24`

副作用:

- `.aof/context/active/cadence-scheduler-binding.json` を更新する
- `cadence-schedule` を再評価する
- `dispatch_command` を canonical に出す
- cron / GitHub Actions / agent-loop の 3 profile を machine-readable に残す
- binding summary を `Recent Confirmation Window` に追記する

### `cadence-scheduler-profile`

候補 profile 群の中から、production で使う primary scheduler profile を first-class に確定する。  
binding artifact が候補を出すのに対して、この command は

- `cron`
- `github_actions`
- `agent_loop`

のどれを採るかを runtime memory に固定する。

profile 選択は topology と切り離せない。

- self-hosting topology:
  - `github_actions` で `.aof/` を repository に戻す運用を採りうる
- managed-project topology:
  - scheduler profile を選んでも、write target は product `main` ではなく `aof/state` branch か equivalent separated channel を使う

```bash
node ./src/cli.js cadence-scheduler-profile \
  --project ./examples/aidlc-template \
  --profile github_actions \
  --note "Prefer GitHub Actions as the first production scheduler profile" \
  --stale-after-hours 24
```

主な option:

- `--project <path>`: target project root
- `--profile <cron|github_actions|agent_loop>`: primary production scheduler profile
- `--note "<text>"`: optional rationale note
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`
- `--stale-after-hours <n>`: cadence freshness threshold used to derive the underlying binding; default `24`

副作用:

- `.aof/context/active/cadence-scheduler-profile.json` を更新する
- `.aof/context/active/cadence-scheduler-binding.json` を再評価した上で選択を固定する
- selected profile の details を `dispatch_command` と一緒に残す
- profile selection summary を `Recent Confirmation Window` に追記する

### `self-audit-record`

active self-audit artifact を `.aof/context/active/framework-self-audit.json` に書き込み、  
recent confirmation と next value slice を必要に応じて更新する。

```bash
node ./src/cli.js self-audit-record \
  --project ./examples/aidlc-template \
  --audit-id FSA-007 \
  --scope "post-pulse cadence review" \
  --summary "task triage cadence is now runtime-backed" \
  --detected-gap "self-audit cadence is still weaker than pulse-backed task triage" \
  --next-action "make self-audit cadence refresh through the same operating loop" \
  --related-task-id TASK-004 \
  --next-value-slice "Extend TASK-004 into runtime-backed self-audit cadence"
```

主な option:

- `--project <path>`: target project root
- `--audit-id <id>`: self-audit identifier
- `--scope "<text>"`: audit scope
- `--summary "<text>"`: current audit summary
- `--detected-gap "<text>"`: remaining gap statement
- `--result-state <active|stable|escalate>`: optional audit state
- `--next-action "<text>"`: next operating move
- `--related-task-id <TASK-id>`: related open task, multiple allowed
- `--next-value-slice "<text>"`: optional next value slice refresh
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`

副作用:

- `.aof/context/active/framework-self-audit.json` を更新する
- `Recent Confirmation Window` に self-audit outcome を追記する
- optional に `Next Value Slice` を更新する
- self-audit 実行後に `cadence-trigger-guidance.json` も自動 refresh する

### `retire-candidate-review`

retire candidate review を active artifact として残し、review 結果に応じて task を `retired` に移すか、`open` のまま保持する。

```bash
node ./src/cli.js retire-candidate-review \
  --project ./examples/aidlc-template \
  --resolution keep-open \
  --task-id TASK-004 \
  --note "Retain the task for the next cadence slice"
```

主な option:

- `--project <path>`: target project root
- `--resolution <retire|keep-open>`: retire disposition
- `--task-id <TASK-id>`: reviewed task id, multiple allowed
- `--note "<text>"`: human-approved review note
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`

副作用:

- `.aof/context/active/retire-candidate-review.json` を更新する
- review outcome に応じて task を `retired` または `open` に更新する
- `Recent Confirmation Window` に review outcome を追記する
- retire review 実行後に `cadence-trigger-guidance.json` も自動 refresh する

## Execution Inspection

### `packet`

stage / role ごとの model input packet を出力する。

```bash
node ./src/cli.js packet \
  --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json \
  --stage planning
```

主な option:

- `--session <path>`
- `--stage <clarification|planning|proposal|review|approval|reopen>`
- `--project <path>`: optional
- `--role <role>`: optional role override

### `council`

stage-role matrix に基づく council plan を表示する。

```bash
node ./src/cli.js council \
  --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json \
  --stage review \
  --include-optional
```

主な option:

- `--session <path>`
- `--stage <stage>`
- `--project <path>`
- `--role <role>`
- `--include-optional`: optional seat も含める

### `council-exec`

council plan を実行し、必要なら provider-backed model call まで行う。

```bash
node ./src/cli.js council-exec \
  --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json \
  --stage planning \
  --invoke-model \
  --provider mock
```

主な option:

- `--session <path>`
- `--stage <stage>`
- `--project <path>`
- `--role <role>`
- `--include-optional`
- `--invoke-model`
- `--provider <provider>`
- `--model <name>`
- `--base-url <url>`
- `--api-key-env <name>`
- `--timeout-ms <ms>`
- `--max-retries <n>`
- `--mock-seat-decision <Role=decision>`
- `--mock-seat-veto <Role=yes|no>`
- `--write-artifact <path>`

副作用:

- approval stage 実行時は `Recent Confirmation Window` に approval outcome を要約記録する
- rejection 時は escalation が open されたことを mismatch として confirmation memory に残す

## Signal And Escalation

### `signal`

external signal を session に適用する。

```bash
node ./src/cli.js signal \
  --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json \
  --signal ./examples/aidlc-template/.aof/signals/SIG-001.json
```

主な option:

- `--session <path>`
- `--signal <path>`

副作用:

- signal による reopen / context update を `Recent Confirmation Window` に要約記録する
- reopen 時は mismatch と next direction を confirmation memory に残す

### `escalation-resolve`

human escalation state を `approve` / `reopen` / `stop` のいずれかに解決する。

```bash
node ./src/cli.js escalation-resolve \
  --session ./examples/aidlc-template/.aof/sessions/SESS-LX9KS8-AB12CD.json \
  --resolution reopen \
  --note "Needs wider review"
```

主な option:

- `--session <path>`
- `--resolution <approve|reopen|stop>`
- `--note "<text>"`

副作用:

- human escalation resolution を `Recent Confirmation Window` に記録する
- reopen / approve / stop に応じた next direction を confirmation memory に残す

## Provider Verification

### `provider-check`

provider config の preflight と optional ping を行う。

```bash
node ./src/cli.js provider-check \
  --provider openai-compatible \
  --model gpt-4.1-mini \
  --base-url https://api.openai.com/v1 \
  --api-key-env OPENAI_API_KEY \
  --ping
```

主な option:

- `--provider <provider>`
- `--model <name>`
- `--base-url <url>`
- `--api-key-env <name>`
- `--ping`
- `--write-artifact <path>`
- `--timeout-ms <ms>`
- `--max-retries <n>`

### `live-verify`

provider-check から planning / optional middle stages / optional reopen branches / optional approval まで one-shot で実行する。

```bash
node ./src/cli.js live-verify \
  --project ./examples/aidlc-template \
  --provider mock \
  --artifact-dir /tmp/aof-live-verification \
  --include-middle-stages \
  --include-approval \
  --include-signal-reopen \
  --include-escalation-reopen \
  --include-escalation-terminal \
  --archive \
  --archive-max-runs 10
```

主な option:

- `--project <path>`
- `--request "<text>"`
- `--response "<text>"`
- `--signal-response "<text>"`
- `--escalation-response "<text>"`
- `--provider <provider>`
- `--model <name>`
- `--base-url <url>`
- `--api-key-env <name>`
- `--ping`
- `--include-middle-stages`
- `--include-approval`
- `--include-signal-reopen`
- `--include-escalation-reopen`
- `--include-escalation-terminal`
- `--signal-path <path>`
- `--timeout-ms <ms>`
- `--max-retries <n>`
- `--artifact-dir <path>`
- `--archive`
- `--archive-dir <path>`
- `--archive-max-runs <n>`

詳細手順は [live-provider-verification.md](./live-provider-verification.md) を参照する。

## Verification Rollups

### `verify-history`

複数 bundle を比較し、run 間 drift を集計する。

```bash
node ./src/cli.js verify-history \
  --input /tmp/aof-live-verification \
  --input /tmp/aof-live-verification-second/verification-bundle.json \
  --artifact-dir /tmp/aof-verification-history
```

### `verify-log`

verification bundle を append-oriented に蓄積し、latest state と threshold trend を読む。

```bash
node ./src/cli.js verify-log \
  --input /tmp/aof-live-verification \
  --artifact-dir /tmp/aof-verification-log
```

### `verify-lineage`

history / log / index を跨いだ recommendation lineage を集約する。

```bash
node ./src/cli.js verify-lineage \
  --history-input /tmp/aof-verification-history/verification-history.json \
  --log-input /tmp/aof-verification-log/verification-log.json \
  --index-input /tmp/aof-verification-log/verification-index.json \
  --artifact-dir /tmp/aof-verification-lineage
```

### `verify-dashboard`

history / log / index / lineage を束ねた operator dashboard を生成する。

```bash
node ./src/cli.js verify-dashboard \
  --history-input /tmp/aof-verification-history/verification-history.json \
  --log-input /tmp/aof-verification-log/verification-log.json \
  --index-input /tmp/aof-verification-log/verification-index.json \
  --lineage-input /tmp/aof-verification-lineage/verification-lineage.json \
  --artifact-dir /tmp/aof-verification-dashboard
```

### `verify-dashboard-log`

dashboard snapshot を時系列で蓄積する。

```bash
node ./src/cli.js verify-dashboard-log \
  --input /tmp/aof-verification-dashboard \
  --artifact-dir /tmp/aof-verification-dashboard-log
```

### `verify-dashboard-index`

dashboard log から latest operator state を compact に読む。

```bash
node ./src/cli.js verify-dashboard-index \
  --log-input /tmp/aof-verification-dashboard-log/verification-dashboard-log.json \
  --artifact-dir /tmp/aof-verification-dashboard-index
```

## Human Visibility

### `visibility-serve`

`status_card` / `timeline_feed` / `flow_snapshot` の JSON を読んで、local web viewer を起動する。

```bash
node ./src/cli.js visibility-serve \
  --status-input /tmp/aof-visibility/status-card.json \
  --timeline-input /tmp/aof-visibility/timeline-feed.json \
  --flow-input /tmp/aof-visibility/flow-snapshot.json \
  --port 4174
```

主な option:

- `--status-input <path>`
- `--timeline-input <path>`
- `--flow-input <path>`
- `--host <host>`: default `127.0.0.1`
- `--port <port>`: default `4174`
- `--title "<text>"`: viewer page title

起動すると JSON で viewer URL を返し、そのまま local web server を維持する。

## Project-Local Archive

### `verify-archive`

verification run を `.aof/artifacts/verification/` に durable import し、derived artifact をまとめて更新する。

```bash
node ./src/cli.js verify-archive \
  --project ./examples/aidlc-template \
  --input /tmp/aof-live-verification \
  --input /tmp/aof-live-verification-second \
  --max-runs 10
```

主な option:

- `--project <path>`
- `--input <path>`: 複数指定可
- `--archive-dir <path>`
- `--max-runs <n>`

### `verify-archive-log`

archive index snapshot を時系列で蓄積する。

```bash
node ./src/cli.js verify-archive-log \
  --input ./examples/aidlc-template/.aof/artifacts/verification/verification-archive-index.json \
  --artifact-dir /tmp/aof-verification-archive-log
```

### `verify-archive-dashboard`

archive current-state と archive trend を 1 つの operator-facing rollup に束ねる。

```bash
node ./src/cli.js verify-archive-dashboard \
  --index-input ./examples/aidlc-template/.aof/artifacts/verification/verification-archive-index.json \
  --log-input ./examples/aidlc-template/.aof/artifacts/verification/archive-log/verification-archive-log.json \
  --artifact-dir /tmp/aof-verification-archive-dashboard
```
