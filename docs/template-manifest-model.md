# Template Manifest Model

AI Organization Framework のローカル template folder と manifest schema の正式仕様。

## Purpose

project に `.aof/` を置いたとき、runtime がどこから何を読むかを deterministic にする。

## Canonical Entry Point

root manifest は `.aof/aof.yaml` とする。  
runtime はまずこの 1 ファイルだけを読む。

`aof.yaml` は次を持つ。

1. format version
2. organization definition reference
3. governance definition reference
4. policy definition reference
5. actor file references
6. workflow file references
7. template file references
8. state directory references

## Folder Layout

推奨 layout は次である。

```text
project-root/
  .aof/
    aof.yaml
    organization.yaml
    governance.yaml
    policies.yaml
    actors/
      visionary.yaml
      builder.yaml
      guardian.yaml
    workflows/
      aidlc.yaml
    templates/
      decision-record.md
      decision-record.schema.json
    prompts/
    sessions/
    decisions/
    context/
      active/
      summaries/
      snapshots/
      archive/
    signals/
    artifacts/
```

## Deterministic Load Order

runtime は次の順で load する。

1. `.aof/aof.yaml`
2. `organization.yaml`
3. `governance.yaml`
4. `policies.yaml`
5. `actors/*.yaml`
6. selected `workflow`
7. `templates/*`

この順序により、workflow selection 前に組織と governance の前提が確定する。

## Root Manifest Schema

`aof.yaml` の最小形は次である。

```yaml
format_version: 1.0.0
organization: organization.yaml
governance: governance.yaml
policies: policies.yaml
actors:
  - actors/visionary.yaml
  - actors/builder.yaml
  - actors/guardian.yaml
workflows:
  default: aidlc
  registry:
    aidlc: workflows/aidlc.yaml
templates:
  decision_record_markdown: templates/decision-record.md
  decision_record_schema: templates/decision-record.schema.json
state:
  sessions: sessions/
  decisions: decisions/
  context_active: context/active/
  context_summaries: context/summaries/
  context_snapshots: context/snapshots/
  context_archive: context/archive/
  signals: signals/
  artifacts: artifacts/
```

## Root Manifest Rules

### Required

- `format_version`
- `organization`
- `governance`
- `policies`
- `actors`
- `workflows`
- `templates`
- `state`

### Path Rule

すべての path は `.aof/` からの相対 path とする。  
absolute path は使わない。

### Version Rule

`format_version` は template format の版を指す。  
framework spec version そのものとは分けてよい。

## Component Schemas

### Organization File

`organization.yaml` は最低限次を持つ。

- `organization_id`
- `name`
- `mission optional`
- `governance_scopes`

### Governance File

`governance.yaml` は最低限次を持つ。

- `model`
- `decision_rules`
- `escalation`
- `routing`

### Policy File

`policies.yaml` は最低限次を持つ。

- `policy_profile_id`
- `default_priority_order`
- `project_overrides optional`

### Actor File

`actors/*.yaml` は最低限次を持つ。

- `actor_id`
- `display_name`
- `kind`
- `roles optional`
- `capabilities`
- `policy_profile optional`
- `performance_profile optional`
- `capacity_profile optional`

### Workflow File

`workflows/*.yaml` は最低限次を持つ。

- `workflow_id`
- `name`
- `entry_conditions`
- `stages`
- `decision_points`
- `default_governance_scope`

## Directory Responsibilities

### `actors/`

actor identity の定義。  
責務ラベルではなく、runtime が assign する主体を置く。

### `workflows/`

process map と approval point の定義。

### `templates/`

decision record や prompt fragments の reusable template。

### `prompts/`

role-specific prompt or instruction fragment。  
存在は optional だが path 予約は推奨する。

### `sessions/`

runtime session state。
session file shape の正式仕様は [docs/runtime-session-model.md](/Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/docs/runtime-session-model.md:1) を参照する。

### `decisions/`

canonical markdown と JSON companion の保存先。

### `context/`

active / summaries / snapshots / archive の context lifecycle 保管先。

## Example AIDLC Template

### `.aof/aof.yaml`

```yaml
format_version: 1.0.0
organization: organization.yaml
governance: governance.yaml
policies: policies.yaml
actors:
  - actors/visionary.yaml
  - actors/builder.yaml
  - actors/guardian.yaml
workflows:
  default: aidlc
  registry:
    aidlc: workflows/aidlc.yaml
templates:
  decision_record_markdown: templates/decision-record.md
  decision_record_schema: templates/decision-record.schema.json
state:
  sessions: sessions/
  decisions: decisions/
  context_active: context/active/
  context_summaries: context/summaries/
  context_snapshots: context/snapshots/
  context_archive: context/archive/
  signals: signals/
  artifacts: artifacts/
```

### `organization.yaml`

```yaml
organization_id: product-team
name: Product Team
mission: Deliver software outcomes through AIDLC
governance_scopes:
  - requirements-approval
  - design-approval
  - release-approval
```

### `governance.yaml`

```yaml
model: council-of-three
decision_rules:
  default: majority-with-guardian-veto
escalation:
  target: human-maintainer
  max_retries: 2
routing:
  fast_track:
    allowed_when:
      - low-blast-radius
      - reversible
      - low-safety-impact
```

### `workflows/aidlc.yaml`

```yaml
workflow_id: aidlc
name: AIDLC
entry_conditions:
  - request-present
stages:
  - clarification
  - orientation
  - requirements
  - design
  - implementation
  - release
decision_points:
  - requirements-approval
  - design-approval
  - release-approval
default_governance_scope: requirements-approval
```

## Validation Rule

runtime は root manifest を load したあと、参照先 component file を schema validation してよい。  
component file が欠けている場合は fail-fast する。

## Compatibility Rule

1. root manifest key の削除は breaking change
2. optional field の追加は non-breaking
3. directory path の予約名変更は breaking change

## Runtime Binding

`#12` session lifecycle と persistence は、この layout を前提に定義する。  
`#13` SDK surface は、この root manifest と component schema を前提に loader を設計する。
