import type { Square, File, Rank } from './types.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const EMPTY = 0n;
export const FULL = 0xFFFF_FFFF_FFFF_FFFFn;

export const FILE_A = 0x0101_0101_0101_0101n;
export const FILE_B = FILE_A << 1n;
export const FILE_G = FILE_A << 6n;
export const FILE_H = FILE_A << 7n;

export const RANK_1 = 0xFFn;
export const RANK_2 = RANK_1 << 8n;
export const RANK_7 = RANK_1 << 48n;
export const RANK_8 = RANK_1 << 56n;

export const NOT_FILE_A = ~FILE_A & FULL;
export const NOT_FILE_H = ~FILE_H & FULL;
export const NOT_FILE_AB = ~(FILE_A | FILE_B) & FULL;
export const NOT_FILE_GH = ~(FILE_G | FILE_H) & FULL;

// ---------------------------------------------------------------------------
// Files & ranks arrays (indexed 0..7)
// ---------------------------------------------------------------------------

export const FILES: readonly bigint[] = Array.from({ length: 8 }, (_, i) => FILE_A << BigInt(i));
export const RANKS: readonly bigint[] = Array.from({ length: 8 }, (_, i) => RANK_1 << BigInt(i * 8));

// ---------------------------------------------------------------------------
// Single-square bitboard
// ---------------------------------------------------------------------------

export function bit(sq: Square): bigint {
  return 1n << BigInt(sq);
}

export function fileBB(f: File): bigint {
  return FILES[f]!;
}

export function rankBB(r: Rank): bigint {
  return RANKS[r]!;
}

// ---------------------------------------------------------------------------
// Population count (number of set bits)
// ---------------------------------------------------------------------------

const LO_MASK = 0xFFFF_FFFFn;

function popcount32(v: number): number {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  v = (v + (v >>> 4)) & 0x0f0f0f0f;
  return (v * 0x01010101) >>> 24;
}

export function popcount(bb: bigint): number {
  return popcount32(Number(bb & LO_MASK)) + popcount32(Number((bb >> 32n) & LO_MASK));
}

// ---------------------------------------------------------------------------
// Bit scans via 32-bit halves + Math.clz32 (O(1), no bigint loops)
// ---------------------------------------------------------------------------

/** Index of the least significant set bit, or -1 when empty. */
export function bitscan(bb: bigint): Square {
  const lo = Number(bb & LO_MASK);
  if (lo !== 0) return (31 - Math.clz32(lo & -lo)) as Square;
  const hi = Number((bb >> 32n) & LO_MASK);
  if (hi === 0) return -1 as Square;
  return (63 - Math.clz32(hi & -hi)) as Square;
}

/** Index of the most significant set bit, or -1 when empty. */
export function bitscanReverse(bb: bigint): Square {
  const hi = Number((bb >> 32n) & LO_MASK);
  if (hi !== 0) return (63 - Math.clz32(hi)) as Square;
  const lo = Number(bb & LO_MASK);
  if (lo === 0) return -1 as Square;
  return (31 - Math.clz32(lo)) as Square;
}

// ---------------------------------------------------------------------------
// Iterate over set bits
// ---------------------------------------------------------------------------

export function* eachSquare(bb: bigint): Generator<Square> {
  let b = bb;
  while (b) {
    const sq = bitscan(b);
    yield sq;
    b &= b - 1n;
  }
}

// ---------------------------------------------------------------------------
// Shift operations (directional)
// ---------------------------------------------------------------------------

export function shiftNorth(bb: bigint): bigint {
  return (bb << 8n) & FULL;
}

export function shiftSouth(bb: bigint): bigint {
  return bb >> 8n;
}

export function shiftEast(bb: bigint): bigint {
  return (bb << 1n) & NOT_FILE_A & FULL;
}

export function shiftWest(bb: bigint): bigint {
  return (bb >> 1n) & NOT_FILE_H;
}

export function shiftNorthEast(bb: bigint): bigint {
  return (bb << 9n) & NOT_FILE_A & FULL;
}

export function shiftNorthWest(bb: bigint): bigint {
  return (bb << 7n) & NOT_FILE_H & FULL;
}

export function shiftSouthEast(bb: bigint): bigint {
  return (bb >> 7n) & NOT_FILE_A;
}

export function shiftSouthWest(bb: bigint): bigint {
  return (bb >> 9n) & NOT_FILE_H;
}

// ---------------------------------------------------------------------------
// Debug: print bitboard as 8x8 grid
// ---------------------------------------------------------------------------

export function toBoardString(bb: bigint): string {
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    for (let f = 0; f < 8; f++) {
      const sq = r * 8 + f;
      row += (bb >> BigInt(sq)) & 1n ? '1 ' : '. ';
    }
    rows.push(`${r + 1} ${row.trimEnd()}`);
  }
  rows.push('  a b c d e f g h');
  return rows.join('\n');
}
