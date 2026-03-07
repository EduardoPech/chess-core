import { Color, PieceType, COLOR_COUNT, PIECE_TYPE_COUNT } from './types.ts';
import type { Position, Square } from './types.ts';
import { eachSquare } from './bitboard.ts';

// ---------------------------------------------------------------------------
// Zobrist hash tables (initialized with pseudo-random BigInts)
// ---------------------------------------------------------------------------

// 2 colors × 6 piece types × 64 squares
const PIECE_KEYS: bigint[][][] = initPieceKeys();

// 16 possible castling right combinations
const CASTLING_KEYS: bigint[] = initRandomArray(16);

// 65 en passant keys (0-63 for squares, 64 for "no ep")
const EP_KEYS: bigint[] = initRandomArray(65);

const SIDE_KEY: bigint = pseudoRandomBigInt(9999);

// ---------------------------------------------------------------------------
// Compute full Zobrist hash for a position
// ---------------------------------------------------------------------------

export function computeHash(pos: Position): bigint {
  let hash = 0n;

  // Piece placement
  for (let color = 0; color < COLOR_COUNT; color++) {
    for (let pt = 0; pt < PIECE_TYPE_COUNT; pt++) {
      const bb = pos.pieces.byColor[color]! & pos.pieces.byType[pt]!;
      for (const sq of eachSquare(bb)) {
        hash ^= PIECE_KEYS[color]![pt]![sq]!;
      }
    }
  }

  if (pos.sideToMove === Color.Black) {
    hash ^= SIDE_KEY;
  }

  hash ^= CASTLING_KEYS[pos.castlingRights]!;
  hash ^= EP_KEYS[pos.epSquare ?? 64]!;

  return hash;
}

// ---------------------------------------------------------------------------
// Incremental update helpers
// ---------------------------------------------------------------------------

export function hashPiece(color: Color, pieceType: PieceType, sq: Square): bigint {
  return PIECE_KEYS[color]![pieceType]![sq]!;
}

export function hashSide(): bigint {
  return SIDE_KEY;
}

export function hashCastling(rights: number): bigint {
  return CASTLING_KEYS[rights]!;
}

export function hashEp(sq: Square | null): bigint {
  return EP_KEYS[sq ?? 64]!;
}

// ---------------------------------------------------------------------------
// PRNG for reproducible keys
// ---------------------------------------------------------------------------

function initPieceKeys(): bigint[][][] {
  const keys: bigint[][][] = [];
  let seed = 1;
  for (let color = 0; color < COLOR_COUNT; color++) {
    keys[color] = [];
    for (let pt = 0; pt < PIECE_TYPE_COUNT; pt++) {
      keys[color]![pt] = [];
      for (let sq = 0; sq < 64; sq++) {
        keys[color]![pt]![sq] = pseudoRandomBigInt(seed++);
      }
    }
  }
  return keys;
}

function initRandomArray(size: number): bigint[] {
  const arr: bigint[] = [];
  for (let i = 0; i < size; i++) {
    arr[i] = pseudoRandomBigInt(10000 + i);
  }
  return arr;
}

/**
 * Simple xorshift-based 64-bit PRNG for deterministic key generation.
 * Not cryptographically secure -- only needs to produce well-distributed values.
 */
function pseudoRandomBigInt(seed: number): bigint {
  let state = BigInt(seed) | 1n;
  state ^= state << 13n;
  state ^= state >> 7n;
  state ^= state << 17n;
  state ^= state << 31n;
  state ^= state >> 11n;
  state ^= state << 43n;
  state &= 0xFFFF_FFFF_FFFF_FFFFn;
  return state;
}
