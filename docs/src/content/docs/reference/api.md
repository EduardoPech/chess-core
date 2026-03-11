---
title: API reference
description: Public API of @pech/chess-core.
---

## Types

| Type | Description |
|------|-------------|
| `Position` | Immutable game state (pieces, side to move, castling, en passant, clocks, hash). |
| `Move` | A move with `from`, `to`, optional `promotion`, and `flag`. |
| `Square` | Branded number for a board square (0–63). |
| `Color` | `Color.White` or `Color.Black`. |
| `PieceType` | `PieceType.Pawn`, `PieceType.Knight`, `PieceType.Bishop`, `PieceType.Rook`, `PieceType.Queen`, `PieceType.King`. |

Helpers: `square`, `file`, `rank`, `fileOf`, `rankOf`, `squareFromFileRank`, `oppositeColor`.

**Concepts.** A **Position** is the full board state (pieces, side to move, castling, en passant, etc.). A **Move** is an object with `from` and `to` squares (0–63), optional `promotion`, and a `flag` (normal, castling, en passant, etc.). You get moves from `getLegalMoves` / `getPseudoLegalMoves` or by parsing notation with `fromSan` / `fromUci`; you don't construct them manually. **FEN** is position notation (one string = whole board). **SAN** and **UCI** are move notations (one string = one move); use `toSan` / `fromSan` or `toUci` / `fromUci` to convert between `Move` and strings.

---

## Position & FEN

| Function | Description |
|----------|-------------|
| `fromFen(fen: string): Position` | Parse a FEN string into a position. Throws on invalid FEN. |
| `toFen(pos: Position): string` | Serialize a position to FEN. |
| `STARTING_FEN` | FEN of the standard starting position. |
| `EMPTY_POSITION` | Position with no pieces, White to move. |

Board helpers (for building or inspecting positions): `occupied`, `colorBB`, `typeBB`, `pieceAt`, `kingSquare`, `setPiece`, `removePiece`. `squareToAlgebraic(sq)` returns e.g. `"e4"`.

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
