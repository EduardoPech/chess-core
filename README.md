# chess-core

A fast, type-safe chess library for JavaScript and TypeScript. Immutable state, bitboard representation, and a pure functional API.

## Features

- **Bitboard-based** move generation for high performance
- **Immutable positions** -- every move returns a new state
- **Pure functions** -- no hidden state, fully tree-shakeable
- **Type-safe** -- branded types for squares, files, and ranks
- **Perft-tested** -- verified against known node counts

## Install

```bash
npm install chess-core
# or
bun add chess-core
```

## Quick Start

```typescript
import { fromFen, getLegalMoves, makeMove, toSan, isCheckmate, STARTING_FEN } from 'chess-core';

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
