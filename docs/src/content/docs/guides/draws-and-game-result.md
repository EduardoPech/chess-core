---
title: Draws & game result
description: Detecting checkmate, stalemate, insufficient material, the fifty-move rule, and threefold repetition.
---

chess-core is stateless: a `Position` knows nothing about the moves that led to it, only the board, side to move, castling rights, en passant square, and clocks. `isFiftyMoveRule` and `isInsufficientMaterial` can be read straight off a single position. **Threefold repetition can't** — it depends on history — so it takes a caller-supplied list of position hashes instead of chess-core tracking a game for you.

## The hash history

Every `Position` carries a Zobrist `hash`, kept in sync incrementally by `makeMove`. Push it onto an array after every move (and once for the starting position) to build the history that repetition detection needs:

```typescript
import { fromFen, fromSan, makeMove, STARTING_FEN } from '@pech/chess-core';

let pos = fromFen(STARTING_FEN);
const history: bigint[] = [pos.hash];

for (const san of ['Nf3', 'Nf6', 'Ng1', 'Ng8']) {
  const move = fromSan(pos, san)!;
  pos = makeMove(pos, move);
  history.push(pos.hash);
}
```

## Checking for repetition

```typescript
import { countRepetitions, isThreefoldRepetition } from '@pech/chess-core';

console.log(countRepetitions(pos.hash, history)); // 1 — back to the start position once
console.log(isThreefoldRepetition(pos, history));  // false — needs 3 occurrences
```

Repeat the same four-move knight shuffle again and the starting position has occurred three times:

```typescript
for (const san of ['Nf3', 'Nf6', 'Ng1', 'Ng8']) {
  const move = fromSan(pos, san)!;
  pos = makeMove(pos, move);
  history.push(pos.hash);
}

console.log(isThreefoldRepetition(pos, history)); // true
```

Because the hash folds in castling rights and the en passant square, two positions with the same piece placement but different rights are correctly treated as *different* positions — moving a rook away and back, for example, loses a castling right and is not a repetition.

## Getting the overall game result

`getGameResult` wraps checkmate, stalemate, insufficient material, the fifty-move rule, and (when you pass a history) threefold repetition into a single call, checked in that priority order:

```typescript
import { getGameResult, GameResult, DrawReason } from '@pech/chess-core';

const status = getGameResult(pos, history);
// { result: GameResult.Draw, drawReason: DrawReason.ThreefoldRepetition }

if (status.result === GameResult.Draw) {
  console.log('Draw:', DrawReason[status.drawReason!]);
} else if (status.result === GameResult.WhiteWins || status.result === GameResult.BlackWins) {
  console.log('Checkmate:', GameResult[status.result]);
} else {
  console.log('Game in progress');
}
```

Omit `history` (or pass an empty array) to skip the repetition check — useful when you're not tracking a full game, e.g. when analyzing a single position:

```typescript
import { fromFen, getGameResult, GameResult, DrawReason } from '@pech/chess-core';

const stalemated = fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
console.log(getGameResult(stalemated));
// { result: GameResult.Draw, drawReason: DrawReason.Stalemate }
```

## Individual checks

Reach for the underlying functions directly when you only need one condition, or are evaluating a position with no history at hand:

```typescript
import {
  isCheck,
  isCheckmate,
  isStalemate,
  isInsufficientMaterial,
  isFiftyMoveRule,
} from '@pech/chess-core';

isCheck(pos);
isCheckmate(pos);
isStalemate(pos);
isInsufficientMaterial(pos); // e.g. K vs K, K+N vs K, same-color-bishop K+B vs K+B
isFiftyMoveRule(pos);        // halfmoveClock >= 100
```
