# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@pech/chess-core` — a chess library (npm package) with immutable state, bitboard representation, and a pure functional API. Supports standard chess and Chess 960. No runtime dependencies. Bun is the package manager (`bun.lock`).

## Commands

```bash
bun install          # install dependencies
bun run test         # run all tests (vitest run)
bun run test:watch   # tests in watch mode
bunx vitest run tests/fen.test.ts        # single test file
bunx vitest run -t "depth 1"            # tests matching a name
bun run typecheck    # tsc --noEmit
bun run build        # tsup → dist/ (ESM + CJS + .d.ts)
bun run docs:dev     # docs site dev server (Astro, in docs/)
```

Tests live in `tests/` only (`tests/**/*.test.ts`); fixtures (PGN games, EPD positions) in `tests/fixtures/`. The perft suite runs to depth 4 and is the primary correctness gate — never skip or weaken it; expected node counts were generated with Stockfish 18 (`go perft N`, `UCI_Chess960 true` for 960 positions).

## Architecture

Everything is pure functions over an immutable `Position`. There is no class or mutable game object: every operation (`makeMove`, `setPiece`, …) returns a new `Position`. This is a hard invariant — never mutate a `Position` or its bitboards.

Core representation (`src/types.ts`):
- Bitboards are `bigint` (64-bit masks). `PieceBitboards` stores 2 by-color + 6 by-type boards; a piece's board is the AND of its color and type boards.
- Squares are 0–63 (a1=0, h8=63; `sq = rank*8 + file`). `Square`/`File`/`Rank` are branded number types — construct them with `square()`, `file()`, `rank()`, never bare casts.
- `Position` carries an incrementally-updated Zobrist `hash` (`src/zobrist.ts`); the invariant `pos.hash === computeHash(pos)` must hold after `fromFen` and every `makeMove` — `tests/games.test.ts` replays full games asserting it. Zobrist keys come from an iterated splitmix64 PRNG; do not replace it with anything linear over GF(2) (a plain xorshift of sequential seeds makes key XORs telescope and collide systematically).
- `Position.castlingRooks` stores the *identity* of each castling rook as a 4-tuple `[wk, wq, bk, bq]` (same order as the `CastlingRight` bits, kept in sync with `castlingRights`). Rooks are bound once at FEN load and only ever cleared — never re-derived from the board, which would break in Chess 960 when a second rook reaches the back rank.

Data flow between modules:
- `src/bitboard.ts` — bigint constants and bit ops; `bitscan`/`bitscanReverse`/`popcount` work on 32-bit halves with `Math.clz32` (O(1), keep it that way)
- `src/attacks.ts` — precomputed knight/king tables, classical ray tables for sliders, and `isAttacked(byColor, byType, sq, attacker)` — the **single** attack-detection implementation (leaf module: must not import board/move-gen)
- `src/board.ts` — `Position` queries and immutable piece set/remove (cold paths; `makeMove` does not use them)
- `src/move-gen.ts` — pseudo-legal generation (bitscan while-loops, no generators in hot paths), then a legality filter that applies only the move's bitboard deltas before calling `isAttacked` — it never calls `makeMove`
- `src/make-move.ts` — applies a move in a single Position allocation; handles castling/en passant/promotion, O(1) castling-rights update via `castlingRooks`, incremental hash
- `src/fen.ts` (strict validation, X-FEN/Shredder castling fields), `src/notation.ts` (SAN/UCI), `src/perft.ts`, `src/validation.ts` (checks, draws, `getGameResult`) sit on top

Chess 960: castling moves are encoded king-from → king-to (from === to is legal when the king already stands on its destination file); king and rook land on standard destination squares (g/f, c/d) per FIDE 960 rules. Castling never captures — `makeMove` special-cases it. Path emptiness = every square either piece crosses (destinations included) minus the two origins. `src/castling.ts` (`getCastlingRooks`) infers outermost rooks only at FEN load. `src/chess960.ts` maps Scharnagl indices (518 = standard start). Changes to castling logic must keep both standard and 960 working — `tests/castling-960.test.ts` and `tests/castling-bugs.test.ts` cover this, and the perft suite includes Stockfish-verified Chess 960 counts.

`src/index.ts` is the only public entry point (excluded from coverage); intra-src imports use explicit `.ts` extensions. Correctness is validated by perft node counts against Stockfish (`tests/perft.test.ts` — standard + 960) and full-game replay from PGN fixtures (`tests/games.test.ts`). When touching move generation, run the perft tests first — they catch nearly everything.

The `docs/` directory is a separate Astro site with its own package.json, deployed to GitHub Pages via `.github/workflows/deploy-docs.yml`.
