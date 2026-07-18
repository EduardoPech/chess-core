---
title: Chess 960
description: Generating and playing Chess 960 (Fischer Random) positions.
---

Chess 960 (Fischer Random Chess) shuffles the back-rank pieces before the game starts — bishops on opposite colors, king between the two rooks — and keeps every other rule of chess, including castling. chess-core generates valid starting positions and handles Chess 960 castling automatically, wherever the king and rooks start.

## Generate a starting position

Use `chess960StartingFen` with a **Scharnagl index** (0–959) for a specific, reproducible position, or `randomChess960Fen` for a random one. Index `518` is always the standard chess starting position, so the same code path works for both variants.

```typescript
import { fromFen, chess960StartingFen, randomChess960Fen } from '@pech/chess-core';

const standard = chess960StartingFen(518);
console.log(standard); // "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

const fixed = chess960StartingFen(284);
const pos = fromFen(fixed);

const random = randomChess960Fen();       // Math.random() under the hood
const seeded = randomChess960Fen(() => 0.42); // deterministic — same index every call
```

## Castling

Castling moves are generated and played exactly like standard chess from the caller's side — `getLegalMoves` and `makeMove` need no special handling. Internally, the king and rook always **land on the standard destination squares** (kingside → king g-file / rook f-file, queenside → king c-file / rook d-file) per the FIDE Chess 960 rules, even though they may start on unusual files.

```typescript
import { fromFen, getLegalMoves, makeMove, toFen, toSan, MoveFlag } from '@pech/chess-core';

// King on f1, rooks on a1 and h1
const pos = fromFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4K1R w KQkq - 0 1');

const castling = getLegalMoves(pos).filter((m) => m.flag === MoveFlag.Castling);
console.log(castling.map((m) => toSan(pos, m))); // ["O-O", "O-O-O"]

const afterKingside = makeMove(pos, castling.find((m) => toSan(pos, m) === 'O-O')!);
console.log(toFen(afterKingside)); // rook lands on f1, king on g1: "...R4RK1..."
```

Castling is only offered when every square the king or rook crosses is empty and the king does not start, pass through, or end up in check — the same legality rules as standard chess, just computed relative to each side's actual rook files.

## Castling rights in FEN

Classical `KQkq` castling letters assume rooks start on the corner squares, which isn't always true in Chess 960. chess-core also accepts and emits **Shredder-FEN / X-FEN file letters**, which name the rook's file directly:

```typescript
import { fromFen, toFen } from '@pech/chess-core';

// Rooks on b1/e1 (not the classical corners) — Shredder-style castling field
const pos = fromFen('1rk1r3/8/8/8/8/8/8/1RK1R3 w EBeb - 0 1');
console.log(toFen(pos)); // "1rk1r3/8/8/8/8/8/8/1RK1R3 w EBeb - 0 1" — round-trips
```

`toFen` automatically falls back to `KQkq` whenever the bound rooks do happen to sit on their classical corners, so standard positions still print the familiar way.

## Verifying move generation

Chess 960 move generation is checked against [Stockfish](https://stockfishchess.org/)-verified perft node counts in chess-core's own test suite (`tests/perft.test.ts`), across several starting positions and castling-rich midgame positions — the same technique used to validate standard chess move generation.
