---
title: Getting started
description: Install and use chess-core in a few steps.
---

## Install

```bash
npm install @pech/chess-core
```

Or with Bun:

```bash
bun add @pech/chess-core
```

## Create a position

Parse a position from FEN. Use `STARTING_FEN` for the standard starting position.

```typescript
import { fromFen, STARTING_FEN } from '@pech/chess-core';

const pos = fromFen(STARTING_FEN);
```

## Get legal moves

`getLegalMoves(pos)` returns an array of **Move** objects (each has `from`, `to`, and a `flag`). Use `toSan(pos, move)` to get human-readable strings like `"e4"`.

```typescript
import { getLegalMoves } from '@pech/chess-core';

const moves = getLegalMoves(pos);
```

## Make a move

Every move returns a new immutable position.

```typescript
import { makeMove } from '@pech/chess-core';

const newPos = makeMove(pos, moves[0]);
```

## Notation

**FEN** describes a full position (use `fromFen` / `toFen`). **SAN** (e.g. `"e4"`, `"Qxf7#"`) and **UCI** (e.g. `"e2e4"`) describe a single move. Use `toSan(pos, move)` or `toUci(move)` to get a string; use `fromSan(pos, san)` or `fromUci(pos, uci)` to parse a string into a `Move` for the current position.

```typescript
import { toSan, toFen } from '@pech/chess-core';

console.log(toSan(pos, moves[0]));  // e.g. "e4"
console.log(toFen(newPos));          // FEN string of the new position
```

That’s the core workflow: **FEN → legal moves → make move → SAN/FEN**. For a full game example, see [Scholar's Mate example](/guides/scholars-mate/). See the [API reference](/reference/api/) for validation, pseudo-legal moves, and more.
