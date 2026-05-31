# Knowledge State Model

AI Organization Framework における `Knowledge State` の最小仕様。

## Position

`Knowledge State` は、request を受けた時点で何が既知で何が未知かを記述するための lightweight state である。  
`Discovery` と `Clarification` の両方で使えるが、特に discovery-first intake で重要になる。

## Minimum Fields

- `known`
  - すでに確からしい情報
- `unknown`
  - まだ答えがなく、判断に影響する情報
- `assumptions`
  - 一時的に置く仮説
- `confidence`
  - 現時点の理解の確からしさ

## Purpose

`Knowledge State` の役割は次である。

- 不要な質問を減らす
- 何を先に聞くべきかを決める
- unsupported assumption を明示する
- まだ分からないことを隠したまま次へ進まないようにする

## Usage

### In Discovery

- `known`: request から直接読めること
- `unknown`: 何を解くべきか決まっていない点
- `assumptions`: provisional need を支える仮説

### In Clarification

- `known`: framed need や制約
- `unknown`: まだ不足している context / success criteria
- `assumptions`: 暫定的に埋めた gap

## Interpretation Rule

`unknown` が high-impact なら質問を優先する。  
`assumptions` が high-risk なら、その assumption を放置したまま delivery に進まない。

## Lightweight Constraint

`Knowledge State` は full research database ではない。  
最初の目的は、front-AI や human facilitator が「今どこが分かっていないか」を揃えて話せるようにすることにある。

## Example

### Request

`ひまつぶしダンジョンを作りたい`

### Knowledge State

- `known`
  - ゲームの方向性は短時間反復プレイ寄り
- `unknown`
  - 何を面白さの中心にするか
  - target session length は何分か
- `assumptions`
  - 初回は mobile-friendly な短いループを優先する
- `confidence`
  - medium
