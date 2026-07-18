# chess-core

A fast, type-safe chess library for JavaScript and TypeScript. Immutable state, bitboard representation, and a pure functional API.

**[Documentation](https://eduardopech.github.io/chess-core/)** — visit for guides, examples, and the full API reference.

**[Interactive example](https://eduardopech.github.io/chess-board/guides/example/)** — see chess-core combined with [chess-board](https://github.com/eduardopech/chess-board) for a draggable board with legal moves and position updates.

## Features

- **Bitboard-based** move generation for high performance
- **Immutable positions** -- every move returns a new state
- **Pure functions** -- no hidden state, fully tree-shakeable
- **Type-safe** -- branded types for squares, files, and ranks
- **Chess 960** -- full castling support, Scharnagl position numbering, X-FEN/Shredder-FEN castling fields
- **Draw detection** -- stalemate, insufficient material, fifty-move rule, threefold repetition
- **Perft-tested** -- verified against known node counts and Stockfish (standard and Chess 960)

## Install

```bash
npm install @pech/chess-core
# or
bun add @pech/chess-core
```

## Quick Start

```typescript
import { fromFen, getLegalMoves, makeMove, toSan, isCheckmate, STARTING_FEN } from '@pech/chess-core';

const pos = fromFen(STARTING_FEN);
const moves = getLegalMoves(pos);
const newPos = makeMove(pos, moves[0]);

console.log(toSan(pos, moves[0]));   // "e4"
console.log(isCheckmate(newPos));     // false
```

## API

### Position

```typescript
fromFen(fen: string): Position
toFen(pos: Position): string
```

`fromFen` validates its input (rank lengths, exactly one king per side, no pawns
on back ranks, en passant square, clocks) and throws a descriptive error on
malformed FENs. Castling fields accept classical `KQkq`, X-FEN, and
Shredder-FEN file letters (e.g. `HAha`); `toFen` emits file letters whenever a
castling rook is not on its classical corner, so Chess 960 positions round-trip.

Every `Position` carries a Zobrist `hash` that is maintained incrementally by
`makeMove` and always equals `computeHash(pos)` — usable directly for
transposition tables and repetition detection.

### Chess 960

```typescript
chess960StartingFen(index: number): string  // Scharnagl numbering, 518 = standard chess
randomChess960Fen(rng?: () => number): string
getCastlingRooks(pos: Position, color: Color): CastlingRooks
```

### Move Generation

```typescript
getLegalMoves(pos: Position): Move[]
getPseudoLegalMoves(pos: Position): Move[]
```

### Making Moves

```typescript
makeMove(pos: Position, move: Move): Position
```

### Validation

```typescript
isCheck(pos: Position): boolean
isCheckmate(pos: Position): boolean
isStalemate(pos: Position): boolean
isInsufficientMaterial(pos: Position): boolean
isFiftyMoveRule(pos: Position): boolean
isSquareAttacked(pos: Position, sq: Square, byColor: Color): boolean
```

### Draws & game result

The library is stateless, so repetition detection takes a caller-supplied
history of position hashes — push `pos.hash` after every move (and the starting
position's hash), then:

```typescript
countRepetitions(hash: bigint, history: readonly bigint[]): number
isThreefoldRepetition(pos: Position, history: readonly bigint[]): boolean
getGameResult(pos: Position, history?: readonly bigint[]): GameStatus
// GameStatus = { result: GameResult; drawReason?: DrawReason }
```

```typescript
const history = [pos.hash];
pos = makeMove(pos, move);
history.push(pos.hash);
const { result, drawReason } = getGameResult(pos, history);
```

### Notation

```typescript
toSan(pos: Position, move: Move): string
toUci(move: Move): string
fromUci(pos: Position, uci: string): Move | null
fromSan(pos: Position, san: string): Move | null
```

### Perft

```typescript
perft(pos: Position, depth: number): number
divide(pos: Position, depth: number): DivideResult[]
```

## Development

```bash
bun install          # install dependencies
bun run test         # run tests
bun run test:watch   # run tests in watch mode
bun run build        # build with tsup
bun run typecheck    # type-check without emitting
```

## License

MIT
