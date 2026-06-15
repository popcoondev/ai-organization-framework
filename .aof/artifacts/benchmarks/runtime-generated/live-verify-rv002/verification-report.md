# Live Verification Report

- generated at: 2026-06-15T14:39:56.257Z
- status: completed
- project root: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/examples/aidlc-template
- artifact directory: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002
- request: 初回離脱率を下げたい

## Verification Context
- organization: product-team (Product Team)
- language: ja
- workflow: aidlc (AIDLC)
- workflow stages: clarification, orientation, requirements, design, implementation, release
- default governance scope: requirements-approval
- default routing mode: deep-path
- governance model: council-of-three
- decision rule: majority-with-guardian-veto
- escalation target: human-maintainer
- escalation max retries: 2
- policy profile: default-product-policy
- policy priority order: value, quality, safety, speed, cost
- decision markdown template: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/examples/aidlc-template/.aof/templates/decision-record.md
- decision schema template: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/examples/aidlc-template/.aof/templates/decision-record.schema.json

## Execution Policy
- provider: mock
- model: provider-default
- base URL: env-or-provider-default
- API key source: env:AOF_MODEL_API_KEY
- routing mode: workflow-default
- timeout ms: 30000
- max retries: 0
- ping requested: false
- include middle stages: true
- include approval: true
- include signal reopen: true
- include escalation reopen: true
- include escalation terminal: false
- response count: 3
- signal response count: 1
- escalation resume response count: 1
- used default responses: true

## Branch Outcomes
- happy path planning: completed
- happy path proposal: completed
- happy path review: completed
- happy path approval: approved
- happy path guardian veto: false
- signal reopen status: reopened
- signal reopen routing mode: deep-path
- signal resume answer: framed
- signal resume proposal: completed
- signal resume review: completed
- escalation reopen approval: rejected
- escalation reopen status: reopened
- escalation reopen guardian veto: true
- escalation resume answer: framed
- escalation resume proposal: completed
- escalation resume review: completed
- escalation approve resolution: -
- escalation stop resolution: -

## Branch Policies
- happy path routing: deep-path
- happy path include middle stages: true
- happy path include approval: true
- signal reopen pre-routing: deep-path
- signal reopen post-routing: deep-path
- signal reopen routing escalated: false
- escalation reopen resolution: reopen
- escalation reopen note: Need broader clarification after approval rejection
- escalation approve resolution: -
- escalation approve note: -
- escalation stop resolution: -
- escalation stop note: -

## Verification Recommendation
- action: investigate-drift
- urgency: warning
- rationale: Verification included reopen or escalation branches, so branch-specific drift should be reviewed alongside the happy path.
- source signals: signal-reopen-observed, escalation-reopen-observed

## Provider Observability
### planning
- execution id: CRUN-MQFBKXTF-4TV8OX
- stage: planning
- observed steps: 0 / 2
- step details: none

### proposal
- execution id: CRUN-MQFBKXTJ-NMEW5K
- stage: proposal
- observed steps: 0 / 3
- step details: none

### review
- execution id: CRUN-MQFBKXTN-X1IQKM
- stage: review
- observed steps: 0 / 3
- step details: none

### approval
- execution id: CRUN-MQFBKXTQ-3MDAW2
- stage: approval
- observed steps: 0 / 3
- step details: none

### signal_resume_proposal
- execution id: CRUN-MQFBKXU2-X95R12
- stage: proposal
- observed steps: 0 / 3
- step details: none

### signal_resume_review
- execution id: CRUN-MQFBKXU5-MREHZ1
- stage: review
- observed steps: 0 / 3
- step details: none

### escalation_approval
- execution id: CRUN-MQFBKXUC-DGT5HN
- stage: approval
- observed steps: 0 / 3
- step details: none

### escalation_resume_proposal
- execution id: CRUN-MQFBKXUL-QSJWCO
- stage: proposal
- observed steps: 0 / 3
- step details: none

### escalation_resume_review
- execution id: CRUN-MQFBKXUN-A23Q4P
- stage: review
- observed steps: 0 / 3
- step details: none

## Artifact Inventory
- provider_check: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/provider-check.json
- verification_report: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/verification-report.md
- verification_bundle: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/verification-bundle.json
- planning_execution: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/planning-exec.json
- proposal_execution: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/proposal-exec.json
- review_execution: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/review-exec.json
- approval_execution: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/approval-exec.json
- signal_reopen: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/signal-reopen.json
- signal_resume_proposal_execution: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/signal-resume-proposal-exec.json
- signal_resume_review_execution: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/signal-resume-review-exec.json
- escalation_approval_execution: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/escalation-approval-exec.json
- escalation_reopen: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/escalation-reopen.json
- escalation_resume_proposal_execution: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/escalation-resume-proposal-exec.json
- escalation_resume_review_execution: /Users/mn/Documents/Codex/2026-05-30/ai-ai-organization-framework-ai-ai/.aof/artifacts/benchmarks/runtime-generated/live-verify-rv002/escalation-resume-review-exec.json
