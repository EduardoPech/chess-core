import { Color, PieceType, square } from './types.ts';
import type { Square } from './types.ts';
import {
  bit,
  bitscan,
  bitscanReverse,
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
// Sliding piece attacks — classical precomputed rays + blocker bit scan
// ---------------------------------------------------------------------------

function initRay(df: number, dr: number): bigint[] {
  const table: bigint[] = new Array<bigint>(64);
  for (let sq = 0; sq < 64; sq++) {
    let ray = 0n;
    let cf = (sq & 7) + df;
    let cr = (sq >> 3) + dr;
    while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
      ray |= bit(square(cr * 8 + cf));
      cf += df;
      cr += dr;
    }
    table[sq] = ray;
  }
  return table;
}

// Positive rays extend toward higher square indices (blocker = LSB scan),
// negative rays toward lower indices (blocker = MSB scan).
const RAY_NE = initRay(1, 1);
const RAY_NW = initRay(-1, 1);
const RAY_SE = initRay(1, -1);
const RAY_SW = initRay(-1, -1);
const RAY_N = initRay(0, 1);
const RAY_S = initRay(0, -1);
const RAY_E = initRay(1, 0);
const RAY_W = initRay(-1, 0);

function positiveRay(rays: readonly bigint[], sq: Square, occupied: bigint): bigint {
  const ray = rays[sq]!;
  const blockers = ray & occupied;
  if (blockers === 0n) return ray;
  return ray ^ rays[bitscan(blockers)]!;
}

function negativeRay(rays: readonly bigint[], sq: Square, occupied: bigint): bigint {
  const ray = rays[sq]!;
  const blockers = ray & occupied;
  if (blockers === 0n) return ray;
  return ray ^ rays[bitscanReverse(blockers)]!;
}

export function bishopAttacks(sq: Square, occupied: bigint): bigint {
  return (
    positiveRay(RAY_NE, sq, occupied) |
    positiveRay(RAY_NW, sq, occupied) |
    negativeRay(RAY_SE, sq, occupied) |
    negativeRay(RAY_SW, sq, occupied)
  );
}

export function rookAttacks(sq: Square, occupied: bigint): bigint {
  return (
    positiveRay(RAY_N, sq, occupied) |
    positiveRay(RAY_E, sq, occupied) |
    negativeRay(RAY_S, sq, occupied) |
    negativeRay(RAY_W, sq, occupied)
  );
}

export function queenAttacks(sq: Square, occupied: bigint): bigint {
  return bishopAttacks(sq, occupied) | rookAttacks(sq, occupied);
}

// ---------------------------------------------------------------------------
// Attack detection on raw bitboards (single implementation, used by
// validation.isSquareAttacked and the move-gen legality filter)
// ---------------------------------------------------------------------------

export function isAttacked(
  byColor: readonly bigint[],
  byType: readonly bigint[],
  sq: Square,
  attacker: Color,
): boolean {
  const attackers = byColor[attacker]!;
  const occ = byColor[0]! | byColor[1]!;

  if (KNIGHT_ATTACKS[sq]! & attackers & byType[PieceType.Knight]!) return true;
  if (KING_ATTACKS[sq]! & attackers & byType[PieceType.King]!) return true;

  const diag = bishopAttacks(sq, occ);
  if (diag & attackers & (byType[PieceType.Bishop]! | byType[PieceType.Queen]!)) return true;

  const straight = rookAttacks(sq, occ);
  if (straight & attackers & (byType[PieceType.Rook]! | byType[PieceType.Queen]!)) return true;

  const pawns = attackers & byType[PieceType.Pawn]!;
  if (pawns) {
    const sqBit = bit(sq);
    const pawnAttackers = attacker === Color.White
      ? ((sqBit >> 9n) & NOT_FILE_H) | ((sqBit >> 7n) & NOT_FILE_A)
      : (((sqBit << 7n) & NOT_FILE_H) | ((sqBit << 9n) & NOT_FILE_A)) & FULL;
    if (pawnAttackers & pawns) return true;
  }

  return false;
}
