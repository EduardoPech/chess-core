import {
  type Position,
  type Square,
  Color,
  PieceType,
  CastlingRight,
  square,
} from './types.ts';
import { EMPTY_POSITION, setPiece } from './board.ts';

// ---------------------------------------------------------------------------
// FEN constants
// ---------------------------------------------------------------------------

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PIECE_CHAR_TO_TYPE: Record<string, PieceType> = {
  p: PieceType.Pawn,
  n: PieceType.Knight,
  b: PieceType.Bishop,
  r: PieceType.Rook,
  q: PieceType.Queen,
  k: PieceType.King,
};

const TYPE_TO_PIECE_CHAR: Record<number, string> = {
  [PieceType.Pawn]: 'p',
  [PieceType.Knight]: 'n',
  [PieceType.Bishop]: 'b',
  [PieceType.Rook]: 'r',
  [PieceType.Queen]: 'q',
  [PieceType.King]: 'k',
};

// ---------------------------------------------------------------------------
// FEN → Position
// ---------------------------------------------------------------------------

export function fromFen(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) {
    throw new Error(`Invalid FEN: expected at least 4 fields, got ${parts.length}`);
  }

  const [piecePlacement, activeColor, castling, enPassant] = parts as [string, string, string, string];
  const halfmove = parts[4] ? parseInt(parts[4], 10) : 0;
  const fullmove = parts[5] ? parseInt(parts[5], 10) : 1;

  let pos: Position = {
    ...EMPTY_POSITION,
    sideToMove: activeColor === 'b' ? Color.Black : Color.White,
    castlingRights: parseCastling(castling),
    epSquare: parseSquare(enPassant),
    halfmoveClock: halfmove,
    fullmoveNumber: fullmove,
  };

  const ranks = piecePlacement.split('/');
  if (ranks.length !== 8) {
    throw new Error(`Invalid FEN: expected 8 ranks, got ${ranks.length}`);
  }

  for (let r = 0; r < 8; r++) {
    const rank = ranks[r]!;
    let f = 0;
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        f += parseInt(ch, 10);
      } else {
        const lower = ch.toLowerCase();
        const pieceType = PIECE_CHAR_TO_TYPE[lower];
        if (pieceType === undefined) {
          throw new Error(`Invalid FEN: unknown piece character '${ch}'`);
        }
        const color = ch === lower ? Color.Black : Color.White;
        const sq = square((7 - r) * 8 + f);
        pos = setPiece(pos, sq, color, pieceType);
        f++;
      }
    }
  }

  return pos;
}

// ---------------------------------------------------------------------------
// Position → FEN
// ---------------------------------------------------------------------------

export function toFen(pos: Position): string {
  const parts: string[] = [];

  // Piece placement
  const ranks: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let rankStr = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const sq = square(r * 8 + f);
      const piece = pieceAtForFen(pos, sq);
      if (piece) {
        if (empty > 0) {
          rankStr += empty.toString();
          empty = 0;
        }
        const ch = TYPE_TO_PIECE_CHAR[piece.type]!;
        rankStr += piece.color === Color.White ? ch.toUpperCase() : ch;
      } else {
        empty++;
      }
    }
    if (empty > 0) rankStr += empty.toString();
    ranks.push(rankStr);
  }
  parts.push(ranks.join('/'));

  parts.push(pos.sideToMove === Color.White ? 'w' : 'b');
  parts.push(castlingToString(pos.castlingRights));
  parts.push(pos.epSquare !== null ? squareToAlgebraic(pos.epSquare) : '-');
  parts.push(pos.halfmoveClock.toString());
  parts.push(pos.fullmoveNumber.toString());

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCastling(str: string): number {
  if (str === '-') return CastlingRight.None;
  // X-FEN / Chess960 use file letters (e.g. GCgc, FBfb). Treat as all castling allowed;
  // getCastlingRooks will determine valid moves from the position.
  const standard = 'KQkq';
  for (const ch of str) {
    if (!standard.includes(ch)) return CastlingRight.All;
  }
  let rights = CastlingRight.None;
  if (str.includes('K')) rights |= CastlingRight.WhiteKingside;
  if (str.includes('Q')) rights |= CastlingRight.WhiteQueenside;
  if (str.includes('k')) rights |= CastlingRight.BlackKingside;
  if (str.includes('q')) rights |= CastlingRight.BlackQueenside;
  return rights;
}

function castlingToString(rights: number): string {
  if (rights === CastlingRight.None) return '-';
  let str = '';
  if (rights & CastlingRight.WhiteKingside) str += 'K';
  if (rights & CastlingRight.WhiteQueenside) str += 'Q';
  if (rights & CastlingRight.BlackKingside) str += 'k';
  if (rights & CastlingRight.BlackQueenside) str += 'q';
  return str;
}

function parseSquare(str: string): Square | null {
  if (str === '-') return null;
  const f = str.charCodeAt(0) - 97; // 'a' = 97
  const r = parseInt(str[1]!, 10) - 1;
  return square(r * 8 + f);
}

export function squareToAlgebraic(sq: Square): string {
  const f = sq & 7;
  const r = sq >> 3;
  return String.fromCharCode(97 + f) + (r + 1).toString();
}

function pieceAtForFen(pos: Position, sq: Square): { color: Color; type: PieceType } | null {
  const b = 1n << BigInt(sq);
  let color: Color;

  if (pos.pieces.byColor[Color.White] & b) {
    color = Color.White;
  } else if (pos.pieces.byColor[Color.Black] & b) {
    color = Color.Black;
  } else {
    return null;
  }

  for (let pt = 0; pt < 6; pt++) {
    if (pos.pieces.byType[pt]! & b) {
      return { color, type: pt as PieceType };
    }
  }

  return null;
}
