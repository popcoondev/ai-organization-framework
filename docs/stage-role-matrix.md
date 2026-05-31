# Stage Role Matrix

AI Organization Framework における `Council of Three` の stage-to-seat mapping 仕様。

## Purpose

`Council of Three` を runtime で実現するとき、各 stage で誰が主導し、誰が参加し、どこで veto が効くかを固定する。

この文書で扱う `stage` は workflow 上の action / recommendation 単位であり、session lifecycle status とは別である。
たとえば `reopen` は stage 名だが、runtime session status は `reopened` を使ってよい。

## Core Interpretation

この matrix における語の意味は次の通り。

### Primary Seat

- その stage の owner
- その stage の first-pass message を出す seat
- `Model Input Packet` の `active_role` に入る seat

### Participating Seats

- primary seat の出力に対して意見、補助 review、整合確認を行う seat
- 常時フル参加ではない
- stage ごとに required または optional を定義できる

### Veto

- 発言権ではなく、governance 上の拒否権
- `review` と `approval` で主に使う

## Standard Matrix

| stage | primary seat | participating seats | veto |
|---|---|---|---|
| clarification | Visionary | none | none |
| planning | Builder | Visionary | none |
| proposal | Builder | Visionary, Guardian | none |
| review | Guardian | Visionary, Builder | Guardian |
| approval | all | all | Guardian |
| reopen | trigger-based | trigger-based | none |

## Why This Shape

### Clarification

`Need` と `Intent` を掘る段階なので、Visionary が primary になる。  
Builder の feasibility や Guardian の risk を先に強く出しすぎると、problem framing が早く閉じる。

### Planning

実行案の骨格を作る段階なので Builder が primary になる。  
ただし Intent とのズレを避けるため Visionary を participating に置く。

### Proposal

提案を組み立てる主体は Builder である。  
一方で value fit と risk fit を早い段階で入れるため、Visionary と Guardian を participating に置く。

### Review

ここで初めて Guardian を primary に置く。  
品質、安全、failure containment を主軸に proposal を評価する。

### Approval

approval は stage owner ではなく governance act なので、all seats を基本とする。  
Guardian veto が有効なのはこの段階である。

### Reopen

reopen は原因依存で primary seat が変わる。  
そのため固定 seat ではなく trigger-based にする。

## Reopen Trigger Override

reopen の primary seat は trigger に応じて切り替える。

| trigger class | primary seat | participating seats |
|---|---|---|
| need / intent mismatch | Visionary | Guardian |
| feasibility failure | Builder | Visionary |
| quality / safety signal | Guardian | Builder |
| external strategic change | Visionary | Builder, Guardian |

## Participation Mode

participating seats には次の mode を持たせてよい。

- `required`
- `optional`

標準既定値:

| stage | participation mode |
|---|---|
| clarification | none |
| planning | Visionary required |
| proposal | Visionary required, Guardian optional |
| review | Visionary optional, Builder required |
| approval | all required |
| reopen | trigger-based |

## Primary Output

各 stage で primary seat が最初に出すべき output の型を定義する。

| stage | primary output |
|---|---|
| clarification | clarification questions / framing summary |
| planning | plan |
| proposal | proposal |
| review | review / rejection / rework request |
| approval | approval decision |
| reopen | reopen recommendation / reframing direction |

## Runtime Rule

prototype 実装では、まず `one stage -> one primary packet` で回してよい。  
participating seat は追加 packet または follow-up review として後置する。

つまり、初期実装は次で十分である。

1. primary seat packet を 1 本作る
2. 必要な participating seat だけ追加で回す
3. review / approval で veto seat を評価する

## Why Not "All Seats Always Active"

すべての stage で全 seat を常時発話させると、次の問題が起きやすい。

1. message explosion
2. packet redundancy
3. lightweight task に対する過剰コスト
4. single-instance role switching でも multi-agent でも実装が重い

そのため、matrix は `all seats always active` ではなく、`primary-led with conditional participation` を基本とする。

## Relation to Model Input Packet

この matrix は `Model Input Packet` の `active_role` を決める前提表である。  
schema より先に決めるべき設計判断であり、packet shape はこの matrix から導出できる。

## Related Specifications

この文書は `誰が主導するか` を決める。  
実行形態や packet への落とし込みは次を参照する。

- [docs/council-execution-model.md](docs/council-execution-model.md)
- [docs/model-input-assembly.md](docs/model-input-assembly.md)
