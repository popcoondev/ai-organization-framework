# CLI Reference

この文書は current prototype の `aof` CLI command をまとめた quick reference である。  
実装の正本は [src/cli.js](../src/cli.js) にある。

## Command Taxonomy

`v3.5` では command surface を次の taxonomy で扱う。

- `read`: 状態・register・status を読む
- `verify`: 整合性・drift・benchmark を検証する
- `write`: canonical artifact や governed state を書く
- `execute`: runtime や orchestration を前に進める
- `observe`: metrics・visibility・analytics を出力する

毎回この全文を読む代わりに、まず `command-register` を読む前提にする。

## Core Flow

### `init`

別プロジェクトに AOF の canonical `.aof/` skeleton と AI recognition packet を一括配置する。

```bash
aof init --topology managed-project
```

より明示的に seed したい場合:

```bash
node ./src/cli.js init \
  --project /path/to/target-repo \
  --topology managed-project \
  --project-type web-app \
  --domain-summary "Internal operations dashboard"
```

主な option:

- `--project <path>`: target project root。default は current directory
- `--topology <self-hosting|managed-project>`: required
- `--write-target <target>`: optional override。managed-project の default は `aof/state`、self-hosting の default は `main`
- `--project-type <type>`: seed orientation に入れる project type
- `--domain-summary "<text>"`: seed orientation に入れる domain summary
- `--install-mode <runtime-on|framing-only>`: default は `runtime-on`

副作用:

- `.aof/` directory skeleton を生成する
- `.aof/project-bootstrap.json` を生成する
- `.aof/organization.json` を生成する
- `.aof/command-registry.json` を生成する
- `.aof/context/active/project-orientation.json` を生成する
- `.aof/skills.json` / `.aof/capability-registry.json` / `.aof/resource-inventory.json` / `.aof/policies.json` を生成する
- `north-star / operating-goal / next-value-slice` の seed goal file を生成する
- `recent-confirmation-window.json` を空 state で生成する

### `upgrade`

既存 `.aof/` bootstrap を current AOF installer shape に migrate する。

```bash
aof upgrade --project /path/to/target-repo
```

主な option:

- `--project <path>`: target project root。default は current directory
- `--write-target <target>`: optional override。既存 bootstrap の write target を上書きしたい時だけ使う
- `--install-mode <runtime-on|framing-only>`: optional override。既存 bootstrap の install mode を上書きしたい時だけ使う

副作用:

- `.aof/project-bootstrap.json` に `bootstrap_format_version` と current `aof_version` を反映する
- canonical refs と topology-aware write policy を補完する
- 欠けている `organization.json` / `command-registry.json` / `project-orientation.json` / capability-layer artifact / seed goals / `recent-confirmation-window.json` を再生成する
- 既存 project context をなるべく保持したまま installer state を最新 shape へ寄せる

### `command-registry-refresh`

canonical command catalog から `.aof/command-registry.json` を再生成する。

```bash
node ./src/cli.js command-registry-refresh --project .
```

主な効果:

- `.aof/command-registry.json` を current CLI surface に更新する
- command taxonomy / purpose / top command metadata を artifact 化する

### `command-register`

`command-registry.json` を読むための operator-facing read surface。

```bash
node ./src/cli.js command-register --project .
```

主な観測値:

- command count
- category counts
- top commands
- command purpose / routing metadata

### `command-routing-audit`

bootstrap / orientation / command registry の routing surface が揃っているかを narrow に検証する。

```bash
node ./src/cli.js command-routing-audit --project .
```

主な確認項目:

- `project-bootstrap.json` の `command_registry_ref`
- `project-orientation.json` の `command_registry_ref`
- routing summary category coverage
- top command coverage
- CLI reference detail ref presence

### `organization-verify`

`.aof/project-bootstrap.json` を起点に、organization / skill / capability / resource / policy artifact の schema と相互参照を検証する。

```bash
node ./src/cli.js organization-verify --project .
```

主な確認項目:

- `project-bootstrap.json` / `organization.json` / `project-orientation.json` の schema 整合
- `command-registry.json` の schema 整合
- `skills.json` / `capability-registry.json` / `resource-inventory.json` / `policies.json` の schema 整合
- organization と capability-layer artifact の ref alignment
- command registry と orientation routing summary の ref alignment
- skill / capability / resource / policy の cross-reference 整合
- contract artifact path の存在確認

### `contract-register`

current `.aof/organization.json` から contract register を返す。

```bash
node ./src/cli.js contract-register --project .
```

主な観測値:

- contract id
- name
- owner team ref
- contract type
- artifact ref
- artifact presence

### `release-state-refresh`

active release baseline を runtime-native path で更新する。

```bash
node ./src/cli.js release-state-refresh \
  --project . \
  --release-version 3.4.0 \
  --release-tag v3.4.0 \
  --release-definition-ref docs/v3.4-release-definition.md \
  --release-notes-ref docs/v3.4.0-release-notes.md \
  --release-checklist-ref docs/v3.4-release-checklist.md
```

主な効果:

- `.aof/context/active/active-release-manifest.json` を書く
- `.aof/project-bootstrap.json` の `aof_version` を更新する
- `.aof/organization.json` の `contract-governance-to-release` を更新する

### `release-state-audit`

active release baseline の drift を narrow に検査する。

```bash
node ./src/cli.js release-state-audit --project .
```

主な確認項目:

- active release manifest の存在
- active release refs の存在
- bootstrap version alignment
- governance release contract alignment

### `dependency-graph`

current `.aof/organization.json` から dependency graph を返す。

```bash
node ./src/cli.js dependency-graph --project .
```

主な観測値:

- declared dependency edges
- team-local dependency refs
- adjacency view

### `decision-register`

current `.aof/decisions/` から decision register を返す。

```bash
node ./src/cli.js decision-register --project .
```

主な観測値:

- decision id
- decision summary
- stage / scope
- markdown pair presence
- canonical path alignment

### `organization-audit`

current AOF state を operator-facing にまとめて監査する。

```bash
node ./src/cli.js organization-audit --project .
```

主な確認項目:

- organization verification summary
- decision verification summary
- task lifecycle duplicate detection
- active audit artifact writeback

### `decision-verify`

project の `.aof/decisions/` を走査して、decision record artifact の schema と pair 整合を検証する。

```bash
node ./src/cli.js decision-verify --project ./examples/aidlc-template
```

主な確認項目:

- decision record の bundled schema 整合
- project-local decision schema 整合
- `decision_id` と filename の一致
- `canonical_markdown_path` と expected path の一致
- `.json` と `.md` pair の存在確認

### `metrics-snapshot`

current `.aof/` state から最小の organization metrics snapshot を生成する。

```bash
node ./src/cli.js metrics-snapshot --project .
```

主な観測値:

- open task count
- closed throughput total
- contract coverage ratio
- unresolved escalation count
- decision record count

### `organization-status`

current `.aof/` state から operator-facing な organization summary を返す。

```bash
node ./src/cli.js organization-status --project .
```

主な観測値:

- topology / install mode / write target
- north star / operating goal / next value slice
- council / team / role summary
- task counts by lifecycle
- capability / resource / policy artifact presence

### `organization-analytics-snapshot`

current `.aof/` state から最小の organization analytics snapshot を生成する。

```bash
node ./src/cli.js organization-analytics-snapshot --project .
```

主な観測値:

- task flow by lifecycle status
- contract artifact coverage
- dependency bottleneck count
- unresolved escalation count
- human-readable observations

### `roadmap-status`

current roadmap artifact と runtime backlog の対応関係を返す。

```bash
node ./src/cli.js roadmap-status --project .
```

主な観測値:

- current next value slice
- latest alignment pulse summary
- roadmap / release plan / current release definition refs
- release track ごとの task grouping

### `learning-loop-snapshot`

current `.aof/` state から outcome / self-audit / next value slice / improvement focus を束ねた learning-loop artifact を生成する。

```bash
node ./src/cli.js learning-loop-snapshot --project .
```

主な確認項目:

- latest outcome evidence
- latest self-audit
- current next value slice
- improvement proposal basis
- current learning loop state

### `allocation-plan-record`

governed allocation recommendation を canonical artifact として記録する。

```bash
node ./src/cli.js allocation-plan-record \
  --project . \
  --subject-ref TASK-010 \
  --target-role-ref builder \
  --candidate-resource-ref resource-repo-main \
  --recommended-allocation-json '{"role_ref":"builder","primary_resource_ref":"resource-repo-main","supporting_resource_refs":[],"rationale":"repo access needed","capability_refs":["cap-contract-alignment"],"constraint_refs":["policy-main-branch-access"],"workload_state":"available","approval_required":true}' \
  --policy-ref policy-main-branch-access \
  --risk-note "main writes require review"
```

主な観測値:

- subject ref
- target role refs
- candidate resource refs
- recommended allocations
- policy refs
- risk notes

### `policy-evaluation-report`

allocation または execution request に対する policy judgment を canonical artifact として記録する。

```bash
node ./src/cli.js policy-evaluation-report \
  --project . \
  --subject-ref TASK-010 \
  --evaluation-scope "allocation recommendation review" \
  --overall-outcome requires-review \
  --policy-ref policy-main-branch-access \
  --result-json '{"policy_id":"policy-main-branch-access","effect":"require-review","outcome":"requires-review","reason":"repository writes stay review-gated","blocking":false}' \
  --recommended-action "Route allocation through review before execution."
```

主な観測値:

- evaluation scope
- policy refs
- overall outcome
- per-policy results
- recommended actions

### `resource-claim-record`

reviewed resource reservation request を canonical artifact として記録する。

```bash
node ./src/cli.js resource-claim-record \
  --project . \
  --subject-ref TASK-010 \
  --resource-ref resource-repo-main \
  --claimant-role-ref builder \
  --claim-scope "temporary repository write access for v2.5 implementation slice" \
  --claim-status requested \
  --approval-policy-ref policy-main-branch-access \
  --justification "allocation plan recommends repo access but policy requires review before use"
```

主な観測値:

- resource ref
- claimant role ref
- claim scope
- claim status
- approval policy refs
- justification
- optional allocation plan / policy evaluation linkage

### `role-result-record`

role 単位の execution result を canonical artifact として記録する。

```bash
node ./src/cli.js role-result-record \
  --project . \
  --role Builder \
  --stage planning \
  --session-id SESS-BUILD-001 \
  --status completed \
  --recommendation "Merge into the team packet." \
  --rationale "Implementation path is coherent."
```

主な観測値:

- role / stage / session
- status / recommendation / rationale
- signal list
- artifact refs
- decision required flag

### `team-output-record`

複数 role output を team-level packet に束ねる。

```bash
node ./src/cli.js team-output-record \
  --project . \
  --team-id runtime-team \
  --stage planning \
  --expected-role Builder \
  --expected-role Guardian \
  --received-role Builder \
  --aggregate-state waiting-for-missing-roles \
  --recommended-next-step "Wait for Guardian role result."
```

主な観測値:

- expected / received / missing roles
- aggregate state
- blocking signals
- joined role result refs
- next recommended step

### `role-join-record`

親オーケストレータが複数 role result の回収状態を join artifact として記録する。

```bash
node ./src/cli.js role-join-record \
  --project . \
  --stage planning \
  --expected-role Builder \
  --expected-role Guardian \
  --expected-role Visionary \
  --received-role Builder \
  --received-role Guardian \
  --aggregate-state waiting-for-missing-roles \
  --recommended-next-step "Wait for Visionary role result."
```

主な観測値:

- expected / received / missing roles
- join aggregate state
- blocking signals
- received session ids
- orchestrator next step

### `council-review-packet`

team output を council judgment artifact に変換する。

```bash
node ./src/cli.js council-review-packet \
  --project . \
  --council-id architecture-council \
  --stage review \
  --review-status deferred \
  --decision-summary "Waiting for complete team packet." \
  --rationale "Guardian output has not arrived." \
  --recommendation "Wait for Guardian role result."
```

主な観測値:

- council id / stage / review status
- decision summary / rationale / recommendation
- team output refs / role result refs / evidence refs
- follow-up task ids
- escalation required flag

### `runtime-loop-proof`

framing から allocation, execution, review, outcome, next-step recommendation までを deterministic に 1 本通し、`TASK-011` 向けの auditable proof artifact を生成する。

```bash
node ./src/cli.js runtime-loop-proof \
  --project . \
  --provider mock \
  --source-task-id TASK-011
```

主な観測値:

- session / decision refs
- allocation / policy / resource claim refs
- role result / role join / team output / council review refs
- execution lineage ref
- learning loop ref
- per-phase proof status

### `execution-lineage`

execution artifact 群から current lineage snapshot を生成する。

```bash
node ./src/cli.js execution-lineage --project . --source-task-id TASK-012
```

主な観測値:

- role join count
- role result / team output / council review count
- stages observed
- latest stage
- blocking signal count
- recommended next step
- normalized artifact refs

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

single-action の cadence guidance をそのまま runtime execution に落とす。

```bash
node ./src/cli.js cadence-follow-through \
  --project ./examples/aidlc-template \
  --resolution keep-open \
  --note "Retain the task after guided follow-through"
```

主な option:

- `--project <path>`: target project root
- `--resolution <retire|keep-open>`: current single-action retire review 用の resolution
- `--note "<text>"`: follow-through note
- `--source-session-id <id>`: optional originating session
- `--source-decision-record-id <id>`: optional originating decision
- `--max-entries <n>`: retain only the latest `n` recent confirmation entries; default `3`

副作用:

- `.aof/context/active/cadence-follow-through.json` を更新する
- current guidance が `single-action` かつ `retire-candidate-review` の場合、その review を runtime 経由で実行する
- follow-through outcome を `Recent Confirmation Window` に追記する
- それ以外の guidance state では skip reason を artifact に残す

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

この command は verification artifact をまとめて出す最短経路であり、運用上の入口はこの CLI reference と quickstart を正本として扱う。

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

`status_card` / `timeline_feed` / `flow_snapshot` を基本入力として、必要に応じて `mission_control` も読んで local web viewer を起動する。

```bash
node ./src/cli.js visibility-serve \
  --status-input /tmp/aof-visibility/status-card.json \
  --timeline-input /tmp/aof-visibility/timeline-feed.json \
  --flow-input /tmp/aof-visibility/flow-snapshot.json \
  --mission-input /tmp/aof-visibility/mission-control.json \
  --port 4174
```

主な option:

- `--status-input <path>`
- `--timeline-input <path>`
- `--flow-input <path>`
- `--mission-input <path>`: optional. pass `mission-control.json` to enable Mission Control lineage / blocker / next-action view
- `--host <host>`: default `127.0.0.1`
- `--port <port>`: default `4174`
- `--title "<text>"`: viewer page title

起動すると JSON で viewer URL を返し、そのまま local web server を維持する。  
`--mission-input` を省略した場合でも viewer は fallback で開くが、Mission Control の truthful surface を使うなら `visibility-export` の出力をそのまま渡す方がよい。  
ただし `v3.8` 以降の main operator path は viewer-first ではなく `operator-brief` である。

### `visibility-export`

current `.aof` state から `status_card` / `timeline_feed` / `flow_snapshot` / `mission_control` / `operator_brief` を生成し、viewer-ready な visibility packet と operator-facing brief を書き出す。

```bash
node ./src/cli.js visibility-export \
  --project . \
  --artifact-dir /tmp/aof-visibility
```

主な option:

- `--project <path>`
- `--artifact-dir <path>`: default `.aof/artifacts/visibility/current`

### `operator-brief`

current runtime situation を 1 つの operator-facing packet に圧縮して返す。  
この command は `what is happening now / why / what is blocked / what should happen next` を、canonical runtime artifacts から導出して返す。

```bash
node ./src/cli.js operator-brief \
  --project . \
  --write-artifact /tmp/aof-operator-brief.json
```

主な option:

- `--project <path>`
- `--write-artifact <path>`: optional. default は `.aof/artifacts/visibility/current/operator-brief.json`

### `mission-control-benchmark`

temp project 上で discovery handoff → Need Validation → implementation task open の chain を再生成し、`mission_control` が `visibility-baseline` から `implementation-ready` まで truthfully 遷移するかを検証する。

```bash
node ./src/cli.js mission-control-benchmark \
  --project . \
  --write-artifact /tmp/aof-mission-control-benchmark.json
```

主な option:

- `--project <path>`
- `--write-artifact <path>`: optional. benchmark summary を保存する

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
