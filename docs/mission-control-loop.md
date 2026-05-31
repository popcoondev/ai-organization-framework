# Mission Control Loop

AI Organization Framework における `v1.3` の mission control loop。

## Position

mission control の目的は、記録を増やすことではない。  
毎ターンまたは checkpoint ごとに **次の一手を変える** ことである。

この loop があれば、

- short kickoff work
- long-running operation

の両方で同じ vocabulary を使える。

## Minimum Checkpoint

checkpoint は最低限次を持つ。

1. `current goal`
2. `owner`
3. `next checkpoint`
4. `open signals`
5. `deferred work`

必要なら次も持てる。

- `current workflow`
- `routing mode`
- `active assumptions`

## Loop

最小 loop は次である。

`work -> observe -> signal -> reprioritize or re-scope -> next decision -> work`

重要なのは、signal が出たあとに必ず次の判断へ戻ることである。  
signal を記録だけして進み続けるのは mission control ではない。

## Drift Classes

minimum drift classes は次である。

### `workflow mismatch`

- いまの workflow と実態がずれている

### `user-driven priority drift`

- ユーザー要請で最優先が変わった

### `scope expansion`

- 1 つの task が別の larger task へ広がった

### `output quality drift`

- output は出ているが、期待品質に届いていない

## Response Types

各 drift に対して次の response を取る。

- `continue`
  - loop は維持するが operating goal は変えない
- `reprioritize`
  - current goal を維持しつつ順序を変える
- `re-scope`
  - operating goal を切り直す
- `reframe`
  - workflow / need / intent まで戻る

## Owner Responsibility

owner は checkpoint の更新責任を持つ。  
最低限、次を明示できなければならない。

- 今の最優先は何か
- 何が止まっているか
- 何を defer したか
- 次に escalation が必要か

## Short / Long Reuse

### Short Kickoff Work

- checkpoint 間隔は短い
- drift class は少ない
- `re-scope` が多い

### Long-Running Operation

- checkpoint は継続する
- `workflow mismatch` と `output quality drift` が増える
- `reframe` がより重要になる

それでも、使う vocabulary は同じでよい。  
これが AOF を万能モデルとして保つ鍵である。

## Failure Modes

- signal を open のまま放置する
- drift があるのに `continue` を繰り返す
- checkpoint に owner がいない
- deferred work が増えるだけで next decision が更新されない
