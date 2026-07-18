import {
  type Position,
  type Square,
  type CastlingRookSquares,
  Color,
  PieceType,
  square,
} from './types.ts';
import { EMPTY_POSITION, setPiece, pieceAt } from './board.ts';
import { getCastlingRooks } from './castling.ts';
import { computeHash } from './zobrist.ts';

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

  if (activeColor !== 'w' && activeColor !== 'b') {
    throw new Error(`Invalid FEN: side to move must be 'w' or 'b', got '${activeColor}'`);
  }

  const halfmove = parseClock(parts[4], 'halfmove clock', 0);
  const fullmove = parseClock(parts[5], 'fullmove number', 1);

  let pos: Position = {
    ...EMPTY_POSITION,
    sideToMove: activeColor === 'b' ? Color.Black : Color.White,
    epSquare: parseEpSquare(enPassant),
    halfmoveClock: halfmove,
    fullmoveNumber: fullmove,
  };

  const ranks = piecePlacement.split('/');
  if (ranks.length !== 8) {
    throw new Error(`Invalid FEN: expected 8 ranks, got ${ranks.length}`);
  }

  const kingCount: [number, number] = [0, 0];
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
        if (f > 7) {
          throw new Error(`Invalid FEN: rank '${rank}' describes more than 8 files`);
        }
        const color = ch === lower ? Color.Black : Color.White;
        if (pieceType === PieceType.King) kingCount[color]++;
        if (pieceType === PieceType.Pawn && (r === 0 || r === 7)) {
          throw new Error(`Invalid FEN: pawn on back rank in '${rank}'`);
        }
        const sq = square((7 - r) * 8 + f);
        pos = setPiece(pos, sq, color, pieceType);
        f++;
      }
    }
    if (f !== 8) {
      throw new Error(`Invalid FEN: rank '${rank}' describes ${f > 8 ? 'more' : 'fewer'} than 8 files`);
    }
  }

  if (kingCount[Color.White] !== 1 || kingCount[Color.Black] !== 1) {
    throw new Error(
      `Invalid FEN: expected exactly one king per side, got ${kingCount[Color.White]} white / ${kingCount[Color.Black]} black`,
    );
  }

  const { rights, rooks } = parseCastling(pos, castling);
  pos = { ...pos, castlingRights: rights, castlingRooks: rooks };

  return { ...pos, hash: computeHash(pos) };
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
      const piece = pieceAt(pos, sq);
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
  parts.push(castlingToString(pos.castlingRooks));
  parts.push(pos.epSquare !== null ? squareToAlgebraic(pos.epSquare) : '-');
  parts.push(pos.halfmoveClock.toString());
  parts.push(pos.fullmoveNumber.toString());

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Castling field parsing / serialization
// ---------------------------------------------------------------------------

/**
 * Parses the FEN castling field into rights + bound rook squares.
 * Accepts classical letters (KQkq, bound to the outermost rooks — X-FEN
 * convention) and Shredder-FEN file letters (AHah). Rights that cannot be
 * bound to an actual rook (or whose king is off the back rank) are dropped.
 */
function parseCastling(pos: Position, str: string): { rights: number; rooks: CastlingRookSquares } {
  const rooks: [Square | null, Square | null, Square | null, Square | null] = [null, null, null, null];
  if (str !== '-') {
    if (!/^[KQkqA-Ha-h]+$/.test(str)) {
      throw new Error(`Invalid FEN: castling field '${str}'`);
    }
    for (const ch of str) {
      const color = ch === ch.toUpperCase() ? Color.White : Color.Black;
      const backRankBase = color === Color.White ? 0 : 56;
      const inferred = getCastlingRooks(pos, color);
      const kingFile = inferred.king & 7;
      const kingOnBackRank = inferred.king >> 3 === (color === Color.White ? 0 : 7);
      if (!kingOnBackRank) continue;

      let rookSq: Square | null = null;
      let kingside: boolean;
      const upper = ch.toUpperCase();
      if (upper === 'K') {
        kingside = true;
        rookSq = inferred.kingsideRook;
      } else if (upper === 'Q') {
        kingside = false;
        rookSq = inferred.queensideRook;
      } else {
        const file = upper.charCodeAt(0) - 65; // 'A' = 65
        kingside = file > kingFile;
        const sq = square(backRankBase + file);
        const piece = pieceAt(pos, sq);
        rookSq = piece && piece.color === color && piece.type === PieceType.Rook ? sq : null;
      }
      if (rookSq !== null) {
        rooks[(color << 1) | (kingside ? 0 : 1)] = rookSq;
      }
    }
  }
  const rights =
    (rooks[0] !== null ? 1 : 0) |
    (rooks[1] !== null ? 2 : 0) |
    (rooks[2] !== null ? 4 : 0) |
    (rooks[3] !== null ? 8 : 0);
  return { rights, rooks };
}

/**
 * Emits KQkq letters when the bound rook sits on its classical corner,
 * Shredder-FEN file letters otherwise (so Chess 960 rights round-trip).
 */
function castlingToString(rooks: CastlingRookSquares): string {
  let str = '';
  for (let i = 0; i < 4; i++) {
    const sq = rooks[i]!;
    if (sq === null) continue;
    const kingside = (i & 1) === 0;
    const white = i < 2;
    const file = sq & 7;
    let letter: string;
    if (kingside && file === 7) letter = 'K';
    else if (!kingside && file === 0) letter = 'Q';
    else letter = String.fromCharCode(65 + file);
    str += white ? letter : letter.toLowerCase();
  }
  return str === '' ? '-' : str;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseClock(field: string | undefined, name: string, fallback: number): number {
  if (field === undefined) return fallback;
  if (!/^\d+$/.test(field)) {
    throw new Error(`Invalid FEN: ${name} '${field}' is not a non-negative integer`);
  }
  return parseInt(field, 10);
}

function parseEpSquare(str: string): Square | null {
  if (str === '-') return null;
  if (!/^[a-h][36]$/.test(str)) {
    throw new Error(`Invalid FEN: en passant square '${str}'`);
  }
  const f = str.charCodeAt(0) - 97; // 'a' = 97
  const r = parseInt(str[1]!, 10) - 1;
  return square(r * 8 + f);
}

export function squareToAlgebraic(sq: Square): string {
  const f = sq & 7;
  const r = sq >> 3;
  return String.fromCharCode(97 + f) + (r + 1).toString();
}
