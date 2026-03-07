import { square } from './types.ts';
import type { Square } from './types.ts';
import {
  bit,
  FULL,
  NOT_FILE_A,
  NOT_FILE_H,
  NOT_FILE_AB,
  NOT_FILE_GH,
} from './bitboard.ts';

// ---------------------------------------------------------------------------
// Pre-computed attack tables (generated once at module load)
// ---------------------------------------------------------------------------

export const KNIGHT_ATTACKS: readonly bigint[] = initKnightAttacks();
export const KING_ATTACKS: readonly bigint[] = initKingAttacks();

// ---------------------------------------------------------------------------
// Knight attacks
// ---------------------------------------------------------------------------

function initKnightAttacks(): bigint[] {
  const table: bigint[] = new Array<bigint>(64);
  for (let sq = 0; sq < 64; sq++) {
    const bb = bit(square(sq));
    table[sq] =
      (((bb << 17n) & NOT_FILE_A) |
        ((bb << 15n) & NOT_FILE_H) |
        ((bb << 10n) & NOT_FILE_AB) |
        ((bb << 6n) & NOT_FILE_GH) |
        ((bb >> 6n) & NOT_FILE_AB) |
        ((bb >> 10n) & NOT_FILE_GH) |
        ((bb >> 15n) & NOT_FILE_A) |
        ((bb >> 17n) & NOT_FILE_H)) &
      FULL;
  }
  return table;
}

// ---------------------------------------------------------------------------
// King attacks
// ---------------------------------------------------------------------------

function initKingAttacks(): bigint[] {
  const table: bigint[] = new Array<bigint>(64);
  for (let sq = 0; sq < 64; sq++) {
    const bb = bit(square(sq));
    table[sq] =
      (((bb << 8n) | (bb >> 8n) |
        ((bb << 1n) & NOT_FILE_A) |
        ((bb >> 1n) & NOT_FILE_H) |
        ((bb << 9n) & NOT_FILE_A) |
        ((bb << 7n) & NOT_FILE_H) |
        ((bb >> 7n) & NOT_FILE_A) |
        ((bb >> 9n) & NOT_FILE_H))) &
      FULL;
  }
  return table;
}

// ---------------------------------------------------------------------------
// Sliding piece attacks (ray-based, no magic bitboards yet)
// ---------------------------------------------------------------------------

const DIRECTIONS_BISHOP = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

const DIRECTIONS_ROOK = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

function slidingAttacks(
  sq: Square,
  occupied: bigint,
  directions: readonly (readonly [number, number])[],
): bigint {
  let attacks = 0n;
  const f = sq & 7;
  const r = sq >> 3;

  for (const [df, dr] of directions) {
    let cf = f + df;
    let cr = r + dr;
    while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
      const target = square(cr * 8 + cf);
      const targetBit = bit(target);
      attacks |= targetBit;
      if (occupied & targetBit) break;
      cf += df;
      cr += dr;
    }
  }

  return attacks;
}

export function bishopAttacks(sq: Square, occupied: bigint): bigint {
  return slidingAttacks(sq, occupied, DIRECTIONS_BISHOP);
}

export function rookAttacks(sq: Square, occupied: bigint): bigint {
  return slidingAttacks(sq, occupied, DIRECTIONS_ROOK);
}

export function queenAttacks(sq: Square, occupied: bigint): bigint {
  return bishopAttacks(sq, occupied) | rookAttacks(sq, occupied);
}
