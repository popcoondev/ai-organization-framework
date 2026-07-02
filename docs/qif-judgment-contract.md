# QIF Judgment Contract (v0)

QIF Judgment は、AOF の品質判定を activity report ではなく judgment artifact として扱うための最初の executable contract である。

QIF は quality を activity count ではなく、次の 7 要素で扱う。

- `quality_intent`: この成果物が満たすべき品質は何か
- `risk`: この判定が間違っていた場合に何が起きるか
- `loss_boundary`: 許容できない損失の境界はどこか
- `evidence`: 判定の根拠。content digest 付きで固定する
- `verdict`: `pass | conditional-pass | fail | needs-evidence`
- `confidence` / `uncertainty_note`: 確信度と、判定が覆えるとしたらどこか
- `governance_trigger`: 誰がこの判定を最終化するか。self-judgment と non-pass では必須

## この contract が解く問題

AOF v5.0 までの verification は structural であった。schema に合致し、参照が解決すれば pass する。しかしそれは「AI が自分の成果物を自己満足で良しと判断する問題」を解いていない。

QIF Judgment v0 は、この問題の 2 つの最小成分を executable にする。

1. **Content binding**: `subject_ref` と各 `evidence_ref` の sha256 digest を記録時に計算し保存する。承認後に成果物を書き換えると `verifyQifJudgmentDigests` が mismatch を検出する。judgment は「その時の内容」に束縛される。
2. **Maker-checker cap**: `judged_by_ref === produced_by_ref` の場合、`self_judgment: true` が記録され、verdict `pass` は runtime error として拒否される。self-judgment の上限は `conditional-pass` であり、`governance_trigger` で独立した checker への経路を必ず宣言しなければならない。

## Command

```bash
node ./src/cli.js qif-judgment-record \
  --project . \
  --subject-ref docs/some-deliverable.md \
  --produced-by-ref builder \
  --judged-by-ref guardian \
  --quality-intent "The deliverable states a falsifiable release claim." \
  --risk "A false pass lets an unverified claim reach release state." \
  --loss-boundary "Release claims drift from runtime truth; operator trust is lost." \
  --evidence-ref test/qif-judgment.test.js \
  --evidence-ref .aof/tasks/assigned/TASK-056.json \
  --verdict pass \
  --confidence 0.8 \
  --uncertainty-note "Evidence covers structure and tests, not external adoption." \
  --source-task-id TASK-056
```

Artifact は default で `.aof/artifacts/qif/judgments/<QIF-id>.json` に書かれ、`schemas/aof-qif-judgment.schema.json` で検証される。

## Enforcement rules (executable, not guidance)

record 時に runtime error として強制されるルール:

- evidence が 0 件の judgment は記録できない
- 存在しない subject / evidence file への judgment は記録できない
- `confidence` は 0..1 の数値でなければならない
- self-judgment の `pass` は記録できない
- self-judgment または non-pass verdict は `--governance-trigger-condition` / `--governance-required-action` が必須

注意: bundled schema validator は `pattern` / `allOf` / number `minimum` を実装していないため、これらのルールの enforcement は schema ではなく command 実装が担う。schema はより厳密な external validator 向けの完全な契約として保持する。

## Verification

- `test/qif-judgment.test.js`: 正常系、self-judged pass 拒否、governance trigger 必須、missing evidence 拒否、tampering 検出、confidence/verdict validation
- `verifyQifJudgmentDigests(projectRoot, judgment)`: 記録済み judgment の digest 再検証。organization-verify への統合は次 slice(v5.1 TASK-057 候補)

## Non-goals (v0)

- semantic truth の自動判定。QIF Judgment は「誰が何を根拠にどの verdict を出し、誰が最終化するか」を固定するだけで、evidence の意味的正しさは判定しない
- HRI / Mission Control への projection
- task-done gating(v5.1 の後続 slice)
