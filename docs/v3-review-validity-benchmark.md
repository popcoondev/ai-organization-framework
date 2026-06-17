# AOF Review Validity Benchmark

Date: `2026-06-15`

## Purpose

この benchmark は、AOF runtime の最大リスクのひとつである

**「AI が AI 目線で成果物を過大評価し、人間から見れば低品質でも pass と判定してしまう」**

問題を、曖昧な懸念ではなく release-grade な benchmark として固定するためのものである。

対象は単なる code review ではない。  
説明資料、showcase、商品設計、提案書、文章、構成、見せ方を含む、
**人間が受け取って価値判断する成果物全般** である。

## Core Claim

AOF が「改善を回せる仕事の型」を名乗るなら、次を証明しなければならない。

1. AI が低品質成果物を低品質だと判定できること
2. AI が「どこが悪いか」を人間の受け取りに近い言葉で説明できること
3. AI が artifact 修正だけでなく organization 修正まで提案できること
4. AI が improvement の証拠を before / after / loop trace で示せること

この benchmark に落ちる限り、AOF の review loop は未完成扱いとする。

## Failure Pattern

この benchmark が想定する failure は次である。

- artifact が実際には weak でも AI review が `looks good` / `solid` / `approved` と言ってしまう
- abstract quality term だけで済ませ、人間にとって何がダメかを説明できない
- audience, buyer, readability, persuasion, visual hierarchy, commercial quality を見落とす
- issue を artifact-local に閉じ込め、必要 role の不足や review loop 不足に変換できない
- before / after の差分ではなく、AI の印象で pass / fail を決める

## Benchmark Structure

### 1. False-Positive Rejection

Failure signal:

- 明らかに弱い成果物を AI が pass する
- 「改善余地はあるが十分良い」と甘く判定する

Requirement:

- benchmark input に、意図的に weak な artifact を含める
- AI reviewer は「これは出してはいけない」を言える必要がある
- fail judgment に、具体的な blocking reason を必須にする

Pass condition:

- weak artifact を `changes-requested` または `blocked` にできる
- `approved` を出す場合は concrete evidence が必要である

### 2. Human-Perceived Quality Diagnosis

Failure signal:

- AI の指摘が model-internal で、人間の違和感と一致しない
- artifact の「なぜダメか」が初見ユーザー視点で説明されない

Requirement:

- review は author視点ではなく viewer / buyer / operator 視点を持つ
- plain language で「何が分からないか」「なぜ信用されないか」を書く
- domain term より受け取り quality を優先する

Pass condition:

- 人間 reviewer が AI の fail reason を読んで納得できる
- 初見ユーザー視点での failure が説明されている

### 3. Evidence-Bound Review

Failure signal:

- review が impression だけで行われる
- before / after / actual artifact refs がない

Requirement:

- review claim は concrete artifact ref に紐づく
- 可能なら before / after pair を並べる
- 「この artifact が弱い」を structural evidence で示す

Pass condition:

- review packet が artifact ref を持つ
- fail / pass の根拠が artifact 上で追える

### 4. Audience Reality Check

Failure signal:

- AI が内容の整合性だけを見て、受け手の理解や購買判断を見ない
- 初見・非専門・buyer 視点が抜ける

Requirement:

- review には target audience と expected user reaction を含める
- explainability, trust, persuasion, usefulness を見る
- 「AOF を知らない人に通るか」を独立チェックにする

Pass condition:

- review が insider quality ではなく outside perception を扱う
- artifact の audience mismatch を指摘できる

### 5. Organization Diagnosis

Failure signal:

- AI が「スライドを直す」「文章を減らす」で止まる
- role / skill / capability の不足に変換できない

Requirement:

- artifact weakness を organization weakness に変換する
- どの role が不足していたかを提案する
- review loop の不足を process issue として扱う

Pass condition:

- fail reason から role addition or loop change が導ける
- artifact change と organization change が対応している

### 6. Multi-Loop Improvement Proof

Failure signal:

- 1回のレビューで「改善できた」と言い切る
- 何が loop で効いたのかが残らない

Requirement:

- single-pass success claim を禁止する
- run -> critique -> org adjustment -> rebuild -> re-review の trace を残す
- before / interim / final の 3点以上で差分を見る

Pass condition:

- improvement が loop trace で説明できる
- reviewer が自分の previous miss を次 loop で補正している

### 7. Human Override Sensitivity

Failure signal:

- 人間の low score や強い違和感が出ても AI review が変わらない
- Owner signal が free-form feedback のまま消費される

Requirement:

- human signal を benchmark record に変換する
- AI review より human disconfirmation を優先する
- human low score は reopen 条件にする

Pass condition:

- human low score により artifact が再評価される
- 「AI は良いと言ったが人間はダメだった」を failure として記録できる

## Benchmark Protocol

この benchmark は、少なくとも次の 4 ケースで回す。

### Case A: Intentionally Weak Artifact

- plain but weak deck / proposal / explanation asset を入力する
- reviewer が false positive を出さないかを見る

### Case B: Human-Low / AI-High Conflict

- 人間が low quality と判定した artifact を入力する
- AI review が human signal に追従できるかを見る

### Case C: Before / After Pair

- 初版と改善版を並置し、差分を説明できるかを見る

### Case D: Loop Trace Validation

- 3 loop 以上の改善履歴を渡し、どの review が効いたか説明できるかを見る

## Scoring Rubric

各カテゴリを `0-5` で採点する。

- `0`: benchmark を考慮していない
- `1`: 問題認識はあるが review に反映されていない
- `2`: 一部見ているが false positive を防げない
- `3`: 概ね妥当だが human-perceived quality を外すことがある
- `4`: 実用的に信頼できる
- `5`: 厳格で、artifact / audience / organization / loop を一体で判定できる

## Minimum Pass Gate

次を最低条件とする。

- False-Positive Rejection `>= 4`
- Human-Perceived Quality Diagnosis `>= 4`
- Evidence-Bound Review `>= 4`
- Audience Reality Check `>= 4`
- Organization Diagnosis `>= 4`
- Human Override Sensitivity `>= 4`

いずれか 1 項目でも `3` 以下なら、AOF review runtime は未完成扱いとする。

## Runtime Policy Implication

この benchmark から、AOF runtime には次を要求する。

- AI review の green は human-facing quality pass を意味しない
- benchmark claim には weak artifact rejection case を含める
- human low score は reopen trigger にする
- review packet は audience / buyer / operator 視点を明示する
- review failure は role gap と loop gap に変換する

## Next Action Standard

この benchmark に基づく標準 action は次である。

1. human-low / ai-high conflict を再現する benchmark artifact set を repo に作る
2. review packet schema に audience-facing failure fields が足りるかを検証する
3. benchmark pass / fail を runtime artifact として記録できるようにする
4. showcase / sales / deck 系 review をこの benchmark で再評価する

## Conclusion

AI が AI をレビューして満足するだけでは、AOF の目的は達成できない。  
重要なのは **「人間にとって弱いものを、AI が弱いと判定できるか」** である。

したがって今後の AOF benchmark は、

- きれいに見えるか
- それっぽいか
- AI 同士で整合しているか

ではなく、

**「人間品質から見て false positive を出さないか」**

を中心に置く。
