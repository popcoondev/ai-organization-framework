# Organization Sizing

AI Organization Framework における lightweight `Organization Pattern` と初期組織サイズの決め方。

## Position

`v1.2` では heavy organization taxonomy を作らない。  
代わりに、request の大きさに応じて最初の組織サイズを早く選ぶための lightweight sizing rule を持つ。

`v1.7` では、size class を role 数だけでなく `execution topology` と `council execution pattern` でも読む。

## Sizing Axes

初期 sizing は次の 5 軸で見る。

1. `scope breadth`
2. `lifecycle span`
3. `stakeholder diversity`
4. `risk / irreversibility`
5. `outcome horizon`

## Size Classes

### `small`

- 単一機能、短命 task、関係者が少ない
- default organization:
  - `Visionary`
  - `Builder`
  - `Guardian`
- default topology:
  - `human-direct`
- default council execution:
  - `single-instance`

### `medium`

- 複数判断観点が必要
- 実装と review を明確に分けたい
- default organization:
  - `Visionary`
  - `Builder`
  - `Guardian`
  - `Reviewer`
- default topology:
  - `orchestrated-single`
- default council execution:
  - `hybrid`

### `large`

- lifecycle span が長い
- 関係者が多い
- 進行管理や intake 制御が必要
- default organization:
  - `Visionary`
  - `Builder`
  - `Guardian`
  - `Reviewer`
  - `Facilitator`
- default topology:
  - `orchestrated-parallel`
- default council execution:
  - `multi-agent` または strong `hybrid`

### `extended`

- `large` を超えて domain-specific role が必要
- default organization:
  - `large` を基底にし、追加 role は理由を明示して増やす
- default topology:
  - `orchestrated-parallel`
- default council execution:
  - `multi-agent`

## Topology Reading

size class と topology は次のように読むと分かりやすい。

| size | orchestrator | council execution |
|---|---|---|
| `small` | なしでもよい | `single-instance` |
| `medium` | あり推奨 | `hybrid` |
| `large` | あり | `orchestrated-parallel` with `hybrid` or `multi-agent` review |
| `extended` | あり | `orchestrated-parallel` |

## Selection Rule

初期判定は `Facilitator` が一次責務として持つ。  
ただし final acceptance は human owner が上書きしてよい。

実務上の rule は単純でよい。

- 5 軸のほとんどが低い → `small`
- 2〜3 軸が高い → `medium`
- 4 軸以上が高い、または high-risk → `large`
- `large` でも足りない domain governance がある → `extended`

ただし、uncertainty が高く repeated confirmation を前提にする案件では、  
role 数が少なくても topology だけ `orchestrated-single` 以上に上げてよい。

## Example

### AIDLC onboarding 改善

- `scope breadth`: medium
- `lifecycle span`: medium
- `stakeholder diversity`: medium
- `risk / irreversibility`: medium
- `outcome horizon`: medium
- reading: `medium`

### 住宅設計

- `scope breadth`: medium
- `lifecycle span`: large
- `stakeholder diversity`: medium
- `risk / irreversibility`: high
- `outcome horizon`: large
- reading: `large`

### ひまつぶしダンジョン MVP

- `scope breadth`: medium
- `lifecycle span`: medium
- `stakeholder diversity`: low to medium
- `risk / irreversibility`: low
- `outcome horizon`: medium
- reading: `medium`
