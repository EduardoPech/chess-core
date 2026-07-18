import { Color, PieceType, COLOR_COUNT, PIECE_TYPE_COUNT } from './types.ts';
import type { Position, Square } from './types.ts';
import { bitscan } from './bitboard.ts';

// ---------------------------------------------------------------------------
// Zobrist hash tables (initialized with pseudo-random BigInts)
// ---------------------------------------------------------------------------

// Deterministic splitmix64 PRNG for key generation. The multiplications make
// it non-linear over GF(2): unlike a plain xorshift of the seed, XORs of keys
// do not telescope into XORs of seeds (which caused systematic collisions).
const MASK64 = 0xFFFF_FFFF_FFFF_FFFFn;
let rngState = 0x1A2B3C4D5E6F7788n;

function nextRandom(): bigint {
  rngState = (rngState + 0x9E37_79B9_7F4A_7C15n) & MASK64;
  let z = rngState;
  z = ((z ^ (z >> 30n)) * 0xBF58_476D_1CE4_E5B9n) & MASK64;
  z = ((z ^ (z >> 27n)) * 0x94D0_49BB_1331_11EBn) & MASK64;
  return z ^ (z >> 31n);
}

// 2 colors × 6 piece types × 64 squares
const PIECE_KEYS: bigint[][][] = initPieceKeys();

// 16 possible castling right combinations
const CASTLING_KEYS: bigint[] = initRandomArray(16);

// 65 en passant keys (0-63 for squares, 64 for "no ep")
const EP_KEYS: bigint[] = initRandomArray(65);

const SIDE_KEY: bigint = nextRandom();

// ---------------------------------------------------------------------------
// Compute full Zobrist hash for a position
// ---------------------------------------------------------------------------

export function computeHash(pos: Position): bigint {
  let hash = 0n;

  // Piece placement
  for (let color = 0; color < COLOR_COUNT; color++) {
    for (let pt = 0; pt < PIECE_TYPE_COUNT; pt++) {
      let bb = pos.pieces.byColor[color]! & pos.pieces.byType[pt]!;
      while (bb) {
        const sq = bitscan(bb);
        bb &= bb - 1n;
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
  for (let color = 0; color < COLOR_COUNT; color++) {
    keys[color] = [];
    for (let pt = 0; pt < PIECE_TYPE_COUNT; pt++) {
      keys[color]![pt] = [];
      for (let sq = 0; sq < 64; sq++) {
        keys[color]![pt]![sq] = nextRandom();
      }
    }
  }
  return keys;
}

function initRandomArray(size: number): bigint[] {
  const arr: bigint[] = [];
  for (let i = 0; i < size; i++) {
    arr[i] = nextRandom();
  }
  return arr;
}
