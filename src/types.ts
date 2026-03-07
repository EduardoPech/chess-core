// ---------------------------------------------------------------------------
// Branded types -- compile-time distinct numeric types
// ---------------------------------------------------------------------------

export type Square = number & { readonly __brand: 'Square' };
export type File = number & { readonly __brand: 'File' };
export type Rank = number & { readonly __brand: 'Rank' };

export function square(value: number): Square {
  return value as Square;
}

export function file(value: number): File {
  return value as File;
}

export function rank(value: number): Rank {
  return value as Rank;
}

export function fileOf(sq: Square): File {
  return (sq & 7) as File;
}

export function rankOf(sq: Square): Rank {
  return (sq >> 3) as Rank;
}

export function squareFromFileRank(f: File, r: Rank): Square {
  return ((r << 3) | f) as Square;
}

// ---------------------------------------------------------------------------
// Piece types & colors
// ---------------------------------------------------------------------------

export const enum Color {
  White = 0,
  Black = 1,
}

export const enum PieceType {
  Pawn = 0,
  Knight = 1,
  Bishop = 2,
  Rook = 3,
  Queen = 4,
  King = 5,
}

export const COLOR_COUNT = 2;
export const PIECE_TYPE_COUNT = 6;

export function oppositeColor(c: Color): Color {
  return (c ^ 1) as Color;
}

// ---------------------------------------------------------------------------
// Castling rights (bitmask)
// ---------------------------------------------------------------------------

export const enum CastlingRight {
  None = 0,
  WhiteKingside = 1,
  WhiteQueenside = 2,
  BlackKingside = 4,
  BlackQueenside = 8,
  WhiteAll = WhiteKingside | WhiteQueenside,
  BlackAll = BlackKingside | BlackQueenside,
  All = WhiteAll | BlackAll,
}

export type CastlingRights = number;

// ---------------------------------------------------------------------------
// Move flags
// ---------------------------------------------------------------------------

export const enum MoveFlag {
  Normal = 0,
  DoublePush = 1,
  EnPassant = 2,
  Castling = 3,
  Promotion = 4,
}

// ---------------------------------------------------------------------------
// Move
// ---------------------------------------------------------------------------

export interface Move {
  readonly from: Square;
  readonly to: Square;
  readonly promotion?: PieceType | undefined;
  readonly flag: MoveFlag;
}

// ---------------------------------------------------------------------------
// Piece bitboards
// ---------------------------------------------------------------------------

export interface PieceBitboards {
  readonly byColor: readonly [bigint, bigint];
  readonly byType: readonly [bigint, bigint, bigint, bigint, bigint, bigint];
}

// ---------------------------------------------------------------------------
// Position (immutable game state)
// ---------------------------------------------------------------------------

export interface Position {
  readonly pieces: PieceBitboards;
  readonly sideToMove: Color;
  readonly castlingRights: CastlingRights;
  readonly epSquare: Square | null;
  readonly halfmoveClock: number;
  readonly fullmoveNumber: number;
  readonly hash: bigint;
}

// ---------------------------------------------------------------------------
// Game result
// ---------------------------------------------------------------------------

export const enum GameResult {
  InProgress,
  WhiteWins,
  BlackWins,
  Draw,
}

export const enum DrawReason {
  Stalemate,
  InsufficientMaterial,
  FiftyMoveRule,
  ThreefoldRepetition,
}
