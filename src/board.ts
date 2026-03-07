import {
  type Position,
  type PieceBitboards,
  type Square,
  type CastlingRights,
  Color,
  PieceType,
  CastlingRight,
  PIECE_TYPE_COUNT,
} from './types.ts';
import { EMPTY, bit } from './bitboard.ts';

// ---------------------------------------------------------------------------
// Empty / initial position
// ---------------------------------------------------------------------------

const EMPTY_PIECES: PieceBitboards = {
  byColor: [EMPTY, EMPTY],
  byType: [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
};

export const EMPTY_POSITION: Position = {
  pieces: EMPTY_PIECES,
  sideToMove: Color.White,
  castlingRights: CastlingRight.None,
  epSquare: null,
  halfmoveClock: 0,
  fullmoveNumber: 1,
  hash: 0n,
};

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function occupied(pos: Position): bigint {
  return pos.pieces.byColor[Color.White] | pos.pieces.byColor[Color.Black];
}

export function colorBB(pos: Position, color: Color): bigint {
  return pos.pieces.byColor[color];
}

export function typeBB(pos: Position, pieceType: PieceType): bigint {
  return pos.pieces.byType[pieceType];
}

export function pieceAt(pos: Position, sq: Square): { color: Color; type: PieceType } | null {
  const b = bit(sq);
  let color: Color;

  if (pos.pieces.byColor[Color.White] & b) {
    color = Color.White;
  } else if (pos.pieces.byColor[Color.Black] & b) {
    color = Color.Black;
  } else {
    return null;
  }

  for (let pt = 0; pt < PIECE_TYPE_COUNT; pt++) {
    if (pos.pieces.byType[pt]! & b) {
      return { color, type: pt as PieceType };
    }
  }

  return null;
}

export function kingSquare(pos: Position, color: Color): Square {
  const kingBB = pos.pieces.byColor[color] & pos.pieces.byType[PieceType.King];
  if (kingBB === EMPTY) throw new Error(`No king found for color ${color}`);

  let idx = 0;
  let b = kingBB;
  while ((b & 1n) === 0n) {
    b >>= 1n;
    idx++;
  }
  return idx as Square;
}

// ---------------------------------------------------------------------------
// Immutable position builders
// ---------------------------------------------------------------------------

export function setPiece(pos: Position, sq: Square, color: Color, pieceType: PieceType): Position {
  const b = bit(sq);
  const newByColor: [bigint, bigint] = [pos.pieces.byColor[0], pos.pieces.byColor[1]];
  const newByType: [bigint, bigint, bigint, bigint, bigint, bigint] = [
    pos.pieces.byType[0],
    pos.pieces.byType[1],
    pos.pieces.byType[2],
    pos.pieces.byType[3],
    pos.pieces.byType[4],
    pos.pieces.byType[5],
  ];

  newByColor[color] |= b;
  newByType[pieceType] |= b;

  return {
    ...pos,
    pieces: { byColor: newByColor, byType: newByType },
  };
}

export function removePiece(pos: Position, sq: Square, color: Color, pieceType: PieceType): Position {
  const b = bit(sq);
  const mask = ~b;
  const newByColor: [bigint, bigint] = [pos.pieces.byColor[0], pos.pieces.byColor[1]];
  const newByType: [bigint, bigint, bigint, bigint, bigint, bigint] = [
    pos.pieces.byType[0],
    pos.pieces.byType[1],
    pos.pieces.byType[2],
    pos.pieces.byType[3],
    pos.pieces.byType[4],
    pos.pieces.byType[5],
  ];

  newByColor[color] &= mask;
  newByType[pieceType] &= mask;

  return {
    ...pos,
    pieces: { byColor: newByColor, byType: newByType },
  };
}

export function withSideToMove(pos: Position, color: Color): Position {
  return { ...pos, sideToMove: color };
}

export function withCastlingRights(pos: Position, rights: CastlingRights): Position {
  return { ...pos, castlingRights: rights };
}

export function withEpSquare(pos: Position, sq: Square | null): Position {
  return { ...pos, epSquare: sq };
}

export function withClocks(pos: Position, halfmove: number, fullmove: number): Position {
  return { ...pos, halfmoveClock: halfmove, fullmoveNumber: fullmove };
}
