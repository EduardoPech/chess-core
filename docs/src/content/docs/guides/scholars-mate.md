---
title: Scholar's Mate example
description: A complete Scholar's Mate game using chess-core.
---

Scholar's Mate is the classic four-move checkmate: 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#. The example below plays out this game using only chess-core — parsing SAN, making moves, and detecting checkmate.

## Example

```typescript
import {
  fromFen,
  STARTING_FEN,
  makeMove,
  fromSan,
  toSan,
  isCheckmate,
} from '@pech/chess-core';

const moves = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'];

let pos = fromFen(STARTING_FEN);

for (const san of moves) {
  const move = fromSan(pos, san);
  if (!move) throw new Error(`Invalid move: ${san}`);
  console.log(toSan(pos, move));
  pos = makeMove(pos, move);
}

console.log('Checkmate:', isCheckmate(pos));  // true
```

## Output

```
e4
e5
Bc4
Nc6
Qh5
Nf6
Qxf7#
Checkmate: true
```

After 4. Qxf7#, Black is in checkmate. The final position is produced entirely by repeated `fromSan` and `makeMove`; `isCheckmate(pos)` confirms the game is over.
