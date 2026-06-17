# AOF Orchestrator Runtime Discipline Benchmark

Date: `2026-06-15`

## Purpose

この benchmark は、

**「オーケストレータに相当する AI が runtime を使わず、会話だけで tasking / judgment / coordination を済ませてしまう」**

問題を benchmark failure として固定するためのものである。

AOF は単に賢い AI がうまく振る舞うことを目指しているのではない。  
**組織状態、役割分担、判断根拠、改善ループを runtime artifact として残せること** を目指している。

したがって、orchestrator が runtime を避けるなら、その時点で AOF の組織 OS としての主張は崩れる。

## Core Claim

AOF が実運用に耐える organization runtime であるなら、次を証明しなければならない。

1. parent AI が stateful coordination を runtime に残すこと
2. task / role / join / decision / goal の流れを artifact から再構成できること
3. runtime bypass が convenience ではなく benchmark failure として扱われること
4. green claim が runtime evidence に支えられていること

## Failure Pattern

この benchmark が捉える failure は次である。

- orchestrator が task を頭の中で分解し、runtime に task artifact を残さない
- child role の結果を口頭要約だけで扱い、role result / join artifact を残さない
- decision を会話だけで済ませ、decision record が残らない
- goal や next step を runtime ではなく prose だけで更新する
- 「今回だけ」「軽い作業だから」で runtime recording を省略する
- runtime に痕跡がないのに organization loop が回ったことにされる

## Benchmark Structure

### 1. Runtime Recording Discipline

Failure signal:

- material tasking や review が runtime 外で進む
- conversation にはあるが artifact がない

Requirement:

- tasking, join, decision, goal update のうち material なものは runtime artifact を持つ
- prose summary は artifact の代替ではなく補助とする

Pass condition:

- 主要 orchestration steps が artifact で追跡できる
- 口頭だけの state transition がない

### 2. Reconstruction From Artifacts

Failure signal:

- 誰が何を判断したか、artifact だけでは追えない
- runtime を見ても parent loop が復元できない

Requirement:

- task -> role result -> role join -> decision / next step の線が artifact 上で見える
- reviewer が artifact only で orchestration trace を再構成できる

Pass condition:

- 会話ログに依存せず loop が追える
- parent orchestration claim に必要な evidence chain がある

### 3. Anti-Slacking Enforcement

Failure signal:

- orchestrator が面倒だから runtime を使わない
- runtime omission が「好み」や「スタイル差」として流される

Requirement:

- runtime bypass を benchmark failure として記録する
- missing artifact は operator note ではなく blocking issue にする

Pass condition:

- runtime omission が reopen / changes-requested 条件になる
- orchestrator convenience より runtime integrity が優先される

### 4. Green Claim Integrity

Failure signal:

- runtime evidence が薄いのに green が出る
- organization success が会話 quality だけで判断される

Requirement:

- green claim には orchestration artifact refs を付ける
- organization success は artifact completeness とセットで判定する

Pass condition:

- green claim が task / join / decision / goal evidence に支えられている
- runtime bypass 状態では green を出せない

### 5. Human Auditability

Failure signal:

- 人間が「結局どう動いたのか」を runtime から把握できない
- AI の自己申告しか情報源がない

Requirement:

- human reviewer が runtime artifacts だけで parent loop を読める
- missing links を human が指摘したら benchmark failure にする

Pass condition:

- human reviewer が orchestration trace を検証できる
- 「AI はやったと言うが runtime にない」を failure として記録できる
- bounded-manual-review gate を machine-readable artifact として再判定できる

## Benchmark Protocol

少なくとも次の 4 ケースで回す。

### Case A: Prose-Only Orchestration

- 会話上は orchestration しているが runtime artifact が薄いケースを入力する
- benchmark が fail にできるかを見る

### Case B: Partial Runtime Use

- task はあるが join / decision が欠けるケースを入力する
- green を止められるかを見る

### Case C: Fully Recorded Loop

- task, role result, join, decision, goal update が揃ったケースを入力する
- benchmark が妥当に pass できるかを見る

### Case D: Human Audit Challenge

- human reviewer が artifact だけで loop を再構成する
- 追えない場合に failure へ戻せるかを見る

## Minimum Pass Gate

次を最低条件とする。

- Runtime Recording Discipline `>= 4`
- Reconstruction From Artifacts `>= 4`
- Anti-Slacking Enforcement `>= 4`
- Green Claim Integrity `>= 4`
- Human Auditability `>= 4`

いずれか 1 項目でも `3` 以下なら、AOF orchestrator runtime discipline は未完成扱いとする。

## Runtime Policy Implication

この benchmark から、AOF runtime には次を要求する。

- orchestration claim には runtime evidence chain が必要
- prose-only coordination は benchmark fail
- material coordination omission は reopen trigger
- parent AI の convenience より auditability を優先する
- runtime bypass を検知できる review / audit flow を持つ

## Next Action Standard

1. runtime utilization benchmark artifact set を作る
2. orchestrator claim に必要な最低 artifact chain を canonical に定義する
3. runtime bypass を検知する verification / audit checks を追加する
4. self-hosting runs をこの benchmark で再評価する

## Conclusion

AI が優秀でも、runtime を使わずに済ませるなら AOF は成立しない。  
必要なのは **「賢さ」ではなく「runtime discipline」** である。

したがって今後の AOF benchmark は、

- うまく説明したか
- それっぽく進行したか

だけではなく、

**「runtime に組織行動が記録され、後から監査できるか」**

を中心に置く。
