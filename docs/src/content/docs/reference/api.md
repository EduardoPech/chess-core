---
title: API reference
description: Public API of @pech/chess-core.
---

## Types

| Type | Description |
|------|-------------|
| `Position` | Immutable game state (pieces, side to move, castling rights + bound rook squares, en passant, clocks, hash). |
| `Move` | A move with `from`, `to`, optional `promotion`, and `flag`. |
| `Square` | Branded number for a board square (0–63). |
| `Color` | `Color.White` or `Color.Black`. |
| `PieceType` | `PieceType.Pawn`, `PieceType.Knight`, `PieceType.Bishop`, `PieceType.Rook`, `PieceType.Queen`, `PieceType.King`. |
| `CastlingRookSquares` | `Position.castlingRooks` — a 4-tuple `[whiteKingside, whiteQueenside, blackKingside, blackQueenside]` of rook `Square | null`. |
| `GameResult` | `InProgress`, `WhiteWins`, `BlackWins`, or `Draw`. |
| `DrawReason` | `Stalemate`, `InsufficientMaterial`, `FiftyMoveRule`, or `ThreefoldRepetition`. |

Helpers: `square`, `file`, `rank`, `fileOf`, `rankOf`, `squareFromFileRank`, `oppositeColor`.

**Every `Position` has a Zobrist `hash`** that `makeMove` keeps in sync incrementally and `fromFen` computes on load — `pos.hash` always equals `computeHash(pos)`. Use it directly as a transposition-table key or, pushed into an array across a game, as the history argument to the repetition functions below.

**Concepts.** A **Position** is the full board state (pieces, side to move, castling, en passant, etc.). A **Move** is an object with `from` and `to` squares (0–63), optional `promotion`, and a `flag` (normal, castling, en passant, etc.). You get moves from `getLegalMoves` / `getPseudoLegalMoves` or by parsing notation with `fromSan` / `fromUci`; you don't construct them manually. **FEN** is position notation (one string = whole board). **SAN** and **UCI** are move notations (one string = one move); use `toSan` / `fromSan` or `toUci` / `fromUci` to convert between `Move` and strings.

---

## Position & FEN

| Function | Description |
|----------|-------------|
| `fromFen(fen: string): Position` | Parse a FEN string into a position. Throws a descriptive error on invalid FEN (see below). |
| `toFen(pos: Position): string` | Serialize a position to FEN. |
| `STARTING_FEN` | FEN of the standard starting position. |
| `EMPTY_POSITION` | Position with no pieces, White to move. |

Board helpers (for building or inspecting positions): `occupied`, `colorBB`, `typeBB`, `pieceAt`, `kingSquare`, `setPiece`, `removePiece`. `squareToAlgebraic(sq)` returns e.g. `"e4"`.

**Validation.** `fromFen` accepts any legal position and rejects malformed input loudly rather than corrupting state: each rank must describe exactly 8 files, there must be exactly one king per side, no pawns on the back ranks, a well-formed en passant square on rank 3/6, numeric clocks, and a valid side-to-move / castling field.

**Castling field.** The FEN castling field accepts classical letters (`KQkq`) as well as X-FEN / Shredder-FEN file letters (`AHah`, `Ee`, …) for Chess 960 positions where the castling rooks aren't on the classical corners. `toFen` round-trips whichever form applies: `KQkq` when the bound rooks sit on their classical squares, file letters otherwise.

```typescript
import { fromFen, toFen } from '@pech/chess-core';

// Chess 960: rooks on b1/e1, king on c1 — Shredder-style castling field
const pos = fromFen('1rk1r3/8/8/8/8/8/8/1RK1R3 w EBeb - 0 1');
console.log(toFen(pos)); // round-trips the same field
```

---

## Move generation

| Function | Description |
|----------|-------------|
| `getLegalMoves(pos: Position): Move[]` | All legal moves in the current position. |
| `getPseudoLegalMoves(pos: Position): Move[]` | Pseudo-legal moves (may leave own king in check). |

---

## Making moves

| Function | Description |
|----------|-------------|
| `makeMove(pos: Position, move: Move): Position` | Returns a new position after playing the move. Throws if no piece at source. |

---

## Chess 960

| Function | Description |
|----------|-------------|
| `chess960StartingFen(index: number): string` | Starting-position FEN for a Scharnagl index in `[0, 959]`. Index `518` is the standard chess starting position. |
| `randomChess960Fen(rng?: () => number): string` | A random Chess 960 starting-position FEN. Pass a custom `rng` (returning `[0, 1)`) for a deterministic/seeded position. |
| `getCastlingRooks(pos: Position, color: Color): CastlingRooks` | Infers the king square and the outermost kingside/queenside rook squares for `color` from the board (used internally when loading a FEN with `KQkq`-style rights; rook squares are `null` when the king isn't on the back rank). |

`getLegalMoves` and `makeMove` support Chess 960 castling automatically — king and rook always end on the standard destination squares (kingside g/f, queenside c/d) regardless of their starting files. See the [Chess 960 guide](/guides/chess-960/) for worked examples.

---

## Validation

| Function | Description |
|----------|-------------|
| `isCheck(pos: Position): boolean` | Side to move is in check. |
| `isCheckmate(pos: Position): boolean` | Side to move is checkmated. |
| `isStalemate(pos: Position): boolean` | Side to move is stalemated. |
| `isInsufficientMaterial(pos: Position): boolean` | Neither side can mate. |
| `isFiftyMoveRule(pos: Position): boolean` | Fifty-move rule draw. |
| `isSquareAttacked(pos, sq, byColor): boolean` | Whether `sq` is attacked by `byColor`. |

---

## Draws & game result

chess-core is stateless — it has no notion of "the game" beyond a single `Position` — so repetition detection takes a caller-supplied **history** of position hashes (`pos.hash` after every move, including the starting position).

| Function | Description |
|----------|-------------|
| `countRepetitions(hash: bigint, history: readonly bigint[]): number` | How many entries of `history` equal `hash`. |
| `isThreefoldRepetition(pos: Position, history: readonly bigint[]): boolean` | Whether `pos.hash` occurs 3+ times in `history`. |
| `getGameResult(pos: Position, history?: readonly bigint[]): GameStatus` | Evaluates checkmate, stalemate, insufficient material, the fifty-move rule, and (only when `history` is passed) threefold repetition, in that priority order. Returns `{ result: GameResult.InProgress }` otherwise. |

`GameStatus` is `{ result: GameResult; drawReason?: DrawReason }`. See the [Draws & game result guide](/guides/draws-and-game-result/) for a full example.

---

## Notation

Convert between **Move** objects and **SAN** (e.g. `"e4"`, `"Qxf7#"`) or **UCI** (e.g. `"e2e4"`, `"e7e8q"`).

**SAN (Standard Algebraic Notation)** is human-readable: piece letter (if not a pawn), optional disambiguation, optional `x`, destination, optional `=Q` or `#`/`+`. Examples: `e4`, `Nf3`, `Qxf7#`, `O-O`. SAN depends on the position (e.g. which knight moved), so `toSan` and `fromSan` both take the current position.

**UCI** is engine-style: four characters (from-square + to-square in lowercase), plus one letter for promotion (e.g. `e7e8q`). Examples: `e2e4`, `g1f3`. The string format does not depend on the position; `toUci(move)` only needs the move. `fromUci(pos, uci)` still needs the position to validate that the move is legal.

| Function | Description |
|----------|-------------|
| `toSan(pos: Position, move: Move): string` | Standard Algebraic Notation, e.g. `"e4"`, `"Nf3"`. |
| `toUci(move: Move): string` | UCI string, e.g. `"e2e4"`, `"e7e8q"`. |
| `fromUci(pos: Position, uci: string): Move | null` | Parse UCI into a move (must be legal in `pos`). |
| `fromSan(pos: Position, san: string): Move | null` | Parse SAN into a move (must be legal in `pos`). |

---

## Advanced

| Function | Description |
|----------|-------------|
| `perft(pos: Position, depth: number): number` | Perft node count for the given depth. |
| `divide(pos: Position, depth: number): DivideResult[]` | Perft “divide” (per-move counts). |
| `computeHash(pos: Position): bigint` | Zobrist hash for the position. |
