# Post-v5.0 Performance Leap Review (Runtime-Backed Direction Review)

- date: 2026-07-02
- reviewer: external design/implementation review session `SESS-FABLE-DIRECTION-REVIEW-20260702`
- review type: runtime-backed direction review, as required by `.aof/goals/operating-goal.json`
- runtime evidence basis (executed, not assumed):
  - `node ./src/cli.js situation-assess --project .` → active release `5.0.0`, stage `frontier-definition-needed` (at review start)
  - `node ./src/cli.js operator-brief --project .` → headline: no aligned implementation task open
  - `node ./src/cli.js release-state-audit --project .` → 7/7 checks pass
  - `node ./src/cli.js organization-verify --project .` → 148/148 checks pass
  - `npm test` → all suites green at review start

## 0. Claim Discrepancy Notice (must read first)

このレビューの依頼文は「最新リリース v6.6.0 / QIF v0.3.1 / Archmap-Aware Mission Control / docs/AI_AUTHORING_GUIDE.md / docs/aof-qif-quality-definition.md / docs/v6.6-*」を前提としていた。

**これらはこの repository には存在しない。** runtime 自身が報告する active release は `5.0.0` であり、`qif` / `archmap` / `v6.6` に一致する doc・schema・command は 0 件である。依頼文のうち runtime stage `frontier-definition-needed` だけが実際の runtime state と一致した。

AOF 自身のルール「AOF runtime command を実行せずに direction / review / self-review を完了扱いしない」「未検証 claim を achieved と言わない」に従い、本レビューは v6.6 系の記述を **unverified claim** として扱い、runtime が証明できる v5.0.0 baseline に対して行う。依頼文の version 語彙との対応は次の通り読み替える:

- 依頼文の `v6.7`(next minor)→ 本レビューの `v5.1`
- 依頼文の `v6.x` → `v5.x`
- 依頼文の `v7.0`(next major)→ `v6.0`

この食い違い自体が、依頼文の論点 9(roadmap の未検証 claim)に対する最初の実証的な回答である: **AOF の外側では、AOF が守らせたい規律はまだ守られていない。だからこそ enforcement が次の frontier である。**

## 1. Executive Verdict

### 現在地の水準

AOF v5.0.0 は「**自己ホスト型の process-evidence recorder として一級、quality verifier としては未着手**」である。

世界標準級に近い点:

1. **Runtime self-honesty が本物である。** このレビュー中、レビュー用 task の triage note に含めた `post-v5.0` という文字列を track 推定が拾い、`situation-assess` が即座に `truth-conflict` (`shipped-release-task-open`, severity critical) へ遷移した。自分の状態矛盾を自分で検出する runtime は実在し、飾りではない。この挙動を実際に観測したことが本レビューの最重要 positive evidence である。
2. **Claims trail proof の文化が文書・runtime の両方に一貫している。** release plan は「general autonomy を claim しない」と明記し、negative benchmark(fake success を fail にする)という発想が v3 から継続している。
3. **Canonical artifact → projection の分離が守られている。** operator-brief / mission-control は artifact からの導出であり、second source of truth になっていない(論点 3 の設計方針は正しい)。

致命的に足りない点(重要度順):

1. **Verification が全て structural であり、semantic ではない。** `organization-verify` 148 checks の実体は schema 適合・参照解決・ID 整合である。council-review-packet に `approved` と書けば approved になる。「AI が成果物を自己満足で良しと判断する問題」(論点 1)は **process の形では解かれているが、evidence の質では解かれていない**。
2. **判定と内容が束縛されていない。** 全 artifact が path 参照のみで content digest を持たない(repo 全体で sha256/checksum/digest の出現は 0 だった)。承認後に成果物を書き換えても何も検出されない。
3. **Maker-checker が identity として強制されていない。** Builder/Guardian/Council は「別々の JSON を書く」ことはできるが、全部同じ 1 プロセス・1 モデルが書いても runtime は区別できない(論点 6)。
4. **Enforcement 面が空である(論点 5)。** `.github/workflows/ci.yml` は `paths-ignore: '.aof/**'` で **canonical truth store そのものを CI から除外している**。さらに CI は `npm test` と smoke のみで、`organization-verify` / `release-state-audit` / 各 benchmark を実行しない。`task-update --status done` は無条件に done へ遷移する。つまり AOF の規律は現状 100% 名誉制であり、orchestrator が従わなければ何も起きない。
5. **Schema が executable verification より広く約束している。** bundled validator (`src/runtime/validation.js`) は `pattern` / `allOf` / `if-then` / number の `minimum`/`maximum` / `format` を実装していない。「schema-valid」という claim は schema が書いてある内容の一部しか意味しない。これは静かな over-claim である(論点 9)。
6. **External validation がゼロ。** self-hosting 1 repo の証拠しかなく、managed-project topology の実運用 artifact が存在しない。「世界標準級」への最大のリスクは機能不足ではなくこれである(論点 10)。
7. **CLI は AI-readable でない(論点 7)。** 88 command、`actor-skill-packet-record` は 25+ flag。orchestrator は毎回巨大な flag 列を組み立てる必要があり、誤りは runtime error でしか返らない。

### 総合判定

AOF は「AI 組織の判断を記録可能にする」段階を完了し、「記録された判断を **信用できるものにする**」段階に入っていない。次の飛躍は機能追加ではなく、**verdict の信用性(content binding + maker-checker + machine enforcement)** である。

## 2. Top 10 Leverage Points

### LP-1: QIF executable judgment gate(本レビューで v0 実装済み)

- **problem**: 品質判定が prose であり、self-approval を止める仕組みがない。
- **why it matters**: 論点 1 の核心。ここが解けない限り、全ての上位機能(Mission Control、Archmap、Workforce)は自己満足の上に建つ。
- **proposed change**: `qif-judgment-record` command。intent/risk/loss/evidence/verdict/confidence/governance-trigger を記録し、(a) subject と evidence の sha256 digest を固定、(b) `judged_by == produced_by` の `pass` を runtime error で拒否、(c) self-judgment / non-pass に governance trigger を必須化。
- **expected impact**: 「良しとした」という言明が、誰が・何の内容に対して・誰の最終化待ちで言ったかに分解され、機械検査可能になる。
- **artifacts / commands / tests**: `schemas/aof-qif-judgment.schema.json`, `src/commands/qif-judgment-record.js`, `test/qif-judgment.test.js`(実装済み、6/6 green)。
- **release**: v5.1(依頼文の v6.7)。

### LP-2: Evidence digest verification lane

- **problem**: 記録済み judgment の digest を再検証する経路が組織検証に入っていない。承認後改竄は commit されても検出されない。
- **why it matters**: content binding は再検証されて初めて意味を持つ。
- **proposed change**: `organization-verify` に「committed qif-judgment 全件の digest 再検証」check を追加。mismatch は critical failure。`verifyQifJudgmentDigests` は実装済みで統合のみ。
- **expected impact**: 「approve 後に書き換える」という最も安価な不正が CI で落ちる。
- **artifacts**: `src/commands/organization-verify.js` 拡張、negative test(tamper fixture)。
- **release**: v5.1。

### LP-3: Gated task completion(done に evidence を要求)

- **problem**: `task-update --status done` は無条件遷移。runtime の中核 loop(goal + execution + verification + stop condition)のうち verification と stop condition が task lifecycle に接続されていない。
- **why it matters**: 論点 5 の実体。AOF が orchestrator に強制力を持つ唯一の場所は「状態遷移を拒否できること」である。
- **proposed change**: frontier task(operating-goal に紐づく task)の `done` 遷移に `--qif-judgment-ref` を必須化。参照先が non-self `pass` または governance trigger 解決済みでなければ遷移拒否。escape hatch は `--human-override` + 理由の artifact 化のみ。
- **expected impact**: 「done と言った」が「独立した判定が pass した」に置き換わる。
- **artifacts**: `src/runtime/task-memory.js`, `src/commands/task-update.js`, schema 更新、negative tests。
- **release**: v5.1。

### LP-4: CI enforcement of runtime truth

- **problem**: CI が `.aof/**` を無視し、`organization-verify` / `release-state-audit` / benchmark を実行しない。規律は honor-system。
- **why it matters**: AI orchestrator への強制力は、対話中の指示ではなく merge を止める機械にしか宿らない。
- **proposed change**: `paths-ignore` から `.aof/**` を外し、CI job に `organization-verify`, `release-state-audit`, `skillful-actor-benchmark`, `need-validation-benchmark`, LP-2 の digest 再検証を追加。
- **expected impact**: 不整合な `.aof` state・stale release claim・tampered evidence が push した瞬間に落ちる。AOF が初めて「破れない」規格になる。
- **artifacts**: `.github/workflows/ci.yml`。
- **release**: v5.1。cadence-dispatch との commit 競合だけ設計注意。

### LP-5: 本物の JSON Schema validation

- **problem**: bundled validator が `pattern` / `allOf` / `if-then` / number bounds / `format` を silently ignore する。72 schema の一部の宣言は実行されていない。
- **why it matters**: 「schema-valid」は AOF の全 verification の土台語彙であり、その語が過大に約束している。negative benchmark の `schemaRejects` も validator が実装した機能しか検査できない。
- **proposed change**: validator を段階拡張(pattern / number bounds / allOf+if-then)し、**meta-test** を追加: 全 bundled schema を走査し、validator が未実装の keyword を使っていたら fail。
- **expected impact**: schema の約束と executable verification の一致。静かな over-claim の恒久的防止。
- **artifacts**: `src/runtime/validation.js`, `test/schema-keyword-coverage.test.js`。
- **release**: v5.2。

### LP-6: Executable verification runs(Guardian を実行可能にする)

- **problem**: evidence は「人/AI が書いた prose + file 参照」であり、機械が生成した検証結果(test 実行、benchmark 実行)を第一級 evidence として紐づける形式がない。
- **why it matters**: QIF の evidence 欄が prose である限り、semantic truth は結局自己申告に戻る。実行結果(exit code + output digest + 実行環境)は自己申告できない evidence である。
- **proposed change**: `verification-run` command: 宣言された command(例: `npm test`)を実行し、exit code / stdout digest / duration / runtime fingerprint を artifact 化。qif-judgment の evidence として参照可能に。
- **expected impact**: 「tests pass を品質達成とみなさない」制約を保ちつつ、tests pass を **改竄不能な evidence の 1 つ**に格上げできる。
- **artifacts**: `schemas/aof-verification-run.schema.json`, `src/commands/verification-run.js`。
- **release**: v5.2。

### LP-7: AI-readable command surface(CLI の再定義)

- **problem**: 88 command / 25+ flag 面は AI にも人間にも高コスト。command registry は存在するが入力 schema を公開しない。
- **why it matters**: 論点 7。CLI は AOF の enforcement point なので廃止すべきではない。ただし現形式は orchestrator の error rate と token cost を上げている。
- **proposed change**: (a) `aof record --type qif-judgment --json -`(stdin JSON、schema 直結)を全 `-record` command の共通 entrypoint として追加、(b) `.aof/command-registry.json` に各 command の input JSON schema ref を含める、(c) flag 面は互換維持。
- **expected impact**: orchestrator は schema を読んで JSON を 1 個書くだけになる。新 artifact type の追加コストが cli-main.js の 4 箇所編集から 1 箇所になる(今回の TASK-056 実装で 4 箇所編集が実測済み)。
- **artifacts**: `src/cli-main.js`, `src/runtime/command-registry-payload.js`。
- **release**: v5.2 → v6.0。

### LP-8: Actor identity attestation(Multi-Actor contract の実体化)

- **problem**: Council/role artifact は「誰が書いたか」を検証できない。1 プロセスが 3 seat を全部書ける。
- **why it matters**: 論点 6。maker-checker-governance 分離(Builder/Guardian/Council)は identity が区別できて初めて contract になる。LP-1 の `judged_by_ref` も現状は自己申告である。
- **proposed change**: role-result / council-review / qif-judgment に execution fingerprint(session id, provider/model id, invocation evidence ref)を必須化し、`organization-verify` で「同一 fingerprint が maker と checker を兼ねた pass」を fail にする。live-verify の provider 層を再利用。
- **expected impact**: 分離が名目から検証可能な事実になる。完全な偽装耐性は目標にしない(それは認証基盤の仕事)が、「うっかり自己承認」と「安価な偽装」は落ちる。
- **release**: v6.0(依頼文の v7.0)。

### LP-9: Managed-project external proof + architecture governance verifier

- **problem**: self-hosting 以外の運用 evidence がゼロ。また architecture impact governance(依頼文の Archmap に相当)は本 repo には存在せず、存在したとしても doc だけでは governance にならない(論点 4 への回答: **verifier / runtime command が必要**)。
- **why it matters**: 論点 10。標準は仕様の完成度ではなく採用の証拠で決まる。10 年後に AOF が独自性を持つ点は「organization-level の判断規律を machine-enforceable にした最初の framework」であり得るが、1 repo の自己証明では平凡に埋もれる。
- **proposed change**: (a) 2 つ以上の外部 repo に managed-project topology で導入し、intake→validation→execution→outcome の実 artifact を収集、(b) architecture source artifact(archmap 相当)を導入するなら、同時に `archmap-impact-verify` 相当の command と negative benchmark を必須にする。verifier のない governance 文書を作らない。
- **release**: v6.0。ただし (a) の 1 例目は v5.x 中に開始すべき。
- **注**: 依頼文の「QIF v0.3.1 は guidance alignment であり executable verifier replacement ではない」という位置づけは正しい。本レビューはその不足分(executable 側)を v0 として実装した。

### LP-10: Human comprehension benchmark(Mission Control の実測)

- **problem**: `mission-control-benchmark` は stage 遷移の truthfulness を検査するが、「人間が状況を理解できたか」(論点 3)は検査していない。operator-brief の 4 questions(what/why/blocked/next)は良い骨格だが、回答が読者に伝わる保証はない。
- **why it matters**: Human Recognition は AOF の release claim の中核であり、現状は semantic truth / operator comprehension を「達成」と言える証拠がない(依頼文の制約通り、言ってはならない)。
- **proposed change**: operator comprehension protocol: 人間 operator が brief のみを見て 4 questions に自分の言葉で回答 → 回答を artifact 化 → runtime state との一致を Guardian が qif-judgment で判定。四半期ごとに実施し、不一致は HRI の defect として task 化。
- **expected impact**: 「見た目」ではなく「人間が何を判断できたか」が計測される。
- **release**: v5.x で protocol 定義、v6.0 で release gate 化。

### Roadmap 矛盾・過剰主張の指摘(論点 9 の残り)

- `test/runtime-situation.test.js` が live runtime state をハードコードしており、frontier が動くたびに test が壊れる(本レビュー中に実証; TASK-056 open で 5 件 fail → truth 更新で修復)。「runtime state の test」は fixture project に対して行い、self-hosting state には `organization-verify` を使う構造へ分離すべき。
- track 推定 (`inferRoadmapTrack`) が正規表現 keyword 依存で、`post-v5.0` という語を v5.0 track と誤分類した。task schema に明示的な `target_track` field を追加すべき(v5.1 の小 slice 候補)。
- `docs/cli-reference.md` は 88 command 中 68 節しかなく、command surface の canonical doc としては不完全。command registry からの自動生成に置き換えるべき。
- 依頼文の v6.6.0 系 claim 群は本 repo に evidence がない(セクション 0)。

## 3. QIF Judgment(このレビュー自身への適用)

- **Quality Intent**: このレビューが、runtime 実行結果に基づき、AOF の次 frontier を反証可能な形で選定していること。
- **Risk**: レビューが誤っていれば、v5.1 が誤った方向(enforcement ではなく機能拡張)に開き、self-approval 問題が未解決のまま上位機能が積まれる。
- **Loss Boundary**: human council が本レビューを ratify する前に v5.1 の release claim が立つこと。それを越えると AOF は自らの規律に違反する。
- **Evidence**: situation-assess / operator-brief / release-state-audit / organization-verify の実行結果、`npm test` green、TASK-056 の実装と 6/6 negative/positive tests、レビュー中に実測した truth-conflict 遷移。
- **Verdict**: `conditional-pass`。本レビューは reviewer 自身が書き、reviewer 自身が判定しているため、AOF/QIF のルール上 `pass` を名乗れない(実装した `qif-judgment-record` はこの verdict の `pass` 記録を実際に拒否する)。
- **Confidence / Uncertainty**: 0.72。構造的欠陥(digest 不在、CI 除外、validator gap)は実測でありほぼ確実。不確実なのは優先順位判断であり、特に LP-7(CLI 再設計)は LP-9(external proof)より後であるべきという主張は運用データなしの推論である。
- **Governance Trigger**: `self_judgment == true` → human council(repository owner)が本レビューと v5.1 theme を ratify / reject / reframe するまで、v5.1 の release claim を立てない。
- この判定は `qif-judgment-record` 自身で記録済み: `.aof/artifacts/qif/judgments/` 配下の `QIF-*` artifact(subject = 本 document、self-judgment cap により conditional-pass、governance trigger = human council ratification)。

## 4. Recommended Next Release

- **version**: `v5.1.0`(依頼文の語彙では v6.7 に相当)
- **theme**: **QIF Executable Judgment Gate** — 判定を内容に束縛し、自己承認を機械的に拒否する
- **release claim**(反証可能な形で): 「AOF は、品質 verdict を成果物の正確な内容(sha256)に束縛し、producer 自身による pass を runtime error として拒否し、frontier task の done 遷移と CI merge を independent judgment evidence なしには通さない。」
- **non-goals**:
  - semantic truth の自動判定を達成したと claim しない
  - operator comprehension を達成したと claim しない(LP-10 は protocol 定義まで)
  - autonomy / workforce automation の拡大 claim をしない
  - HRI / viewer の見た目の拡張をしない
- **acceptance gates**:
  1. `qif-judgment-record` が digest binding と self-judgment cap を negative test 付きで強制する(**本レビューで完了**)
  2. `organization-verify` が committed qif-judgment の digest を再検証し、tamper fixture が fail する
  3. frontier task の `done` 遷移が non-self pass judgment ref なしに拒否される
  4. CI が `.aof/**` を含む全 push で `organization-verify` + `release-state-audit` + benchmarks を実行する
  5. v5.1 の release claim 自体に対する non-self qif-judgment(human または独立 session による pass)が commit されている
- **minimum implementation tasks**: 下記 5. の TASK-056〜TASK-060。

## 5. Implementation Plan

### TASK breakdown

| task | scope | stop condition | verification gate | 状態 |
|---|---|---|---|---|
| TASK-056 | `qif-judgment-record` v0: schema + command + CLI 配線 + registry 反映 | command が catalog/registry/CLI に配線され、negative tests が self-judged pass と missing evidence を拒否する | `test/qif-judgment.test.js` 6/6、`npm test` green、`organization-verify` 148/148 | **本レビューで実装済み**(done 宣言は LP-3 の思想に従い human council 確認後) |
| TASK-057 | digest 再検証を `organization-verify` に統合 | tamper fixture が critical failure になる | 新規 negative test + verify green | open 候補 |
| TASK-058 | task done gating | non-self pass ref なしの done 遷移が error | task-memory tests | open 候補 |
| TASK-059 | CI enforcement | `.aof/**` を含む push で verify/audit/benchmarks が走り、壊れた fixture で CI が赤になることを 1 度実証 | CI run evidence | open 候補 |
| TASK-060 | v5.1 release closure | release claim への non-self qif-judgment が commit 済み | release-state-audit + 判定 artifact | open 候補 |

### files likely to change

- 済: `schemas/aof-qif-judgment.schema.json`, `src/commands/qif-judgment-record.js`, `src/runtime/command-catalog.js`, `src/runtime/command-registry-payload.js`, `src/cli-main.js`, `scripts/test-runner.js`, `test/qif-judgment.test.js`, `docs/qif-judgment-contract.md`, `docs/cli-reference.md`, `.aof/command-registry.json`
- 次: `src/commands/organization-verify.js`, `src/runtime/task-memory.js`, `src/commands/task-update.js`, `.github/workflows/ci.yml`, `src/runtime/validation.js`

### runtime commands to add or update

- 追加済: `qif-judgment-record`
- 更新: `organization-verify`(digest lane), `task-update`(done gate)
- v5.2 候補: `verification-run`, `aof record --json`

### tests / benchmarks to add

- 済: `test/qif-judgment.test.js`(tamper 検出含む)
- TASK-057: tampered committed judgment fixture → verify fail
- TASK-058: done-without-judgment → error
- v5.2: schema keyword coverage meta-test
- benchmark 拡張: `skillful-actor-benchmark` に self-approved-pass ケースを追加し、qif gate なしの green を fake success として fail させる

### release checklist (v5.1)

1. TASK-056〜TASK-060 done(各 done は LP-3 gate 経由)
2. `npm test` / `npm run smoke` green
3. `organization-verify` / `release-state-audit` / `situation-assess` green・無矛盾
4. v5.1 release claim への non-self qif-judgment 記録
5. release definition / notes / checklist 作成、`release-state-refresh` 実行
6. human council ratification 記録(本 direction review の governance trigger 解決)
