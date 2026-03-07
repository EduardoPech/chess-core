import {
  type Position,
  type Move,
  type Square,
  PieceType,
  MoveFlag,
  square,
} from './types.ts';
import { squareToAlgebraic } from './fen.ts';
import { pieceAt } from './board.ts';
import { getLegalMoves } from './move-gen.ts';
import { makeMove } from './make-move.ts';
import { isCheck, isCheckmate } from './validation.ts';

// ---------------------------------------------------------------------------
// Piece type → SAN character
// ---------------------------------------------------------------------------

const PIECE_TO_SAN: Record<number, string> = {
  [PieceType.Knight]: 'N',
  [PieceType.Bishop]: 'B',
  [PieceType.Rook]: 'R',
  [PieceType.Queen]: 'Q',
  [PieceType.King]: 'K',
};

const PROMO_CHARS: Record<number, string> = {
  [PieceType.Queen]: 'q',
  [PieceType.Rook]: 'r',
  [PieceType.Bishop]: 'b',
  [PieceType.Knight]: 'n',
};

// ---------------------------------------------------------------------------
// Move → SAN (Standard Algebraic Notation)
// ---------------------------------------------------------------------------

export function toSan(pos: Position, move: Move): string {
  const piece = pieceAt(pos, move.from);
  if (!piece) return '';

  // Castling
  if (move.flag === MoveFlag.Castling) {
    const isKingside = (move.to & 7) > (move.from & 7);
    return isKingside ? 'O-O' : 'O-O-O';
  }

  let san = '';

  if (piece.type === PieceType.Pawn) {
    const isCapture = (move.from & 7) !== (move.to & 7);
    if (isCapture) {
      san += String.fromCharCode(97 + (move.from & 7));
      san += 'x';
    }
    san += squareToAlgebraic(move.to);
    if (move.flag === MoveFlag.Promotion && move.promotion !== undefined) {
      san += '=' + PROMO_CHARS[move.promotion]!.toUpperCase();
    }
  } else {
    san += PIECE_TO_SAN[piece.type] ?? '';
    san += disambiguate(pos, move, piece.type);
    const captured = pieceAt(pos, move.to);
    if (captured) san += 'x';
    san += squareToAlgebraic(move.to);
  }

  // Check / checkmate suffix
  const newPos = makeMove(pos, move);
  if (isCheckmate(newPos)) {
    san += '#';
  } else if (isCheck(newPos)) {
    san += '+';
  }

  return san;
}

// ---------------------------------------------------------------------------
// Disambiguation
// ---------------------------------------------------------------------------

function disambiguate(pos: Position, move: Move, pieceType: PieceType): string {
  const legalMoves = getLegalMoves(pos);
  const ambiguous = legalMoves.filter(
    (m) =>
      m.to === move.to &&
      m.from !== move.from &&
      pieceAt(pos, m.from)?.type === pieceType,
  );

  if (ambiguous.length === 0) return '';

  const fromFile = move.from & 7;
  const fromRank = move.from >> 3;

  const sameFile = ambiguous.some((m) => (m.from & 7) === fromFile);
  const sameRank = ambiguous.some((m) => (m.from >> 3) === fromRank);

  if (!sameFile) return String.fromCharCode(97 + fromFile);
  if (!sameRank) return (fromRank + 1).toString();
  return String.fromCharCode(97 + fromFile) + (fromRank + 1).toString();
}

// ---------------------------------------------------------------------------
// Move → UCI notation
// ---------------------------------------------------------------------------

export function toUci(move: Move): string {
  let uci = squareToAlgebraic(move.from) + squareToAlgebraic(move.to);
  if (move.flag === MoveFlag.Promotion && move.promotion !== undefined) {
    uci += PROMO_CHARS[move.promotion] ?? '';
  }
  return uci;
}

// ---------------------------------------------------------------------------
// UCI string → Move
// ---------------------------------------------------------------------------

export function fromUci(pos: Position, uci: string): Move | null {
  if (uci.length < 4) return null;

  const from = algebraicToSquare(uci.slice(0, 2));
  const to = algebraicToSquare(uci.slice(2, 4));
  if (from === null || to === null) return null;

  const promoChar = uci[4]?.toLowerCase();
  const promotion = promoChar ? sanCharToPromo(promoChar) : undefined;

  const legalMoves = getLegalMoves(pos);
  return legalMoves.find(
    (m) =>
      m.from === from &&
      m.to === to &&
      (promotion === undefined || m.promotion === promotion),
  ) ?? null;
}

// ---------------------------------------------------------------------------
// SAN string → Move
// ---------------------------------------------------------------------------

export function fromSan(pos: Position, san: string): Move | null {
  const legalMoves = getLegalMoves(pos);

  // Castling
  if (san === 'O-O' || san === 'O-O+' || san === 'O-O#') {
    return legalMoves.find((m) => m.flag === MoveFlag.Castling && (m.to & 7) > (m.from & 7)) ?? null;
  }
  if (san === 'O-O-O' || san === 'O-O-O+' || san === 'O-O-O#') {
    return legalMoves.find((m) => m.flag === MoveFlag.Castling && (m.to & 7) < (m.from & 7)) ?? null;
  }

  // Strip check/checkmate suffixes
  let s = san.replace(/[+#]$/, '');

  // Determine piece type
  let targetPieceType: PieceType;
  const SAN_TO_PIECE: Record<string, PieceType> = {
    N: PieceType.Knight, B: PieceType.Bishop, R: PieceType.Rook,
    Q: PieceType.Queen, K: PieceType.King,
  };
  if (SAN_TO_PIECE[s[0]!] !== undefined) {
    targetPieceType = SAN_TO_PIECE[s[0]!]!;
    s = s.slice(1);
  } else {
    targetPieceType = PieceType.Pawn;
  }

  // Parse promotion suffix (e.g. "=Q")
  let promotion: PieceType | undefined;
  const promoMatch = s.match(/=([QRBN])$/i);
  if (promoMatch) {
    promotion = sanCharToPromo(promoMatch[1]!.toLowerCase());
    s = s.slice(0, -2);
  }

  // Remove capture marker
  s = s.replace('x', '');

  // Last two chars are the destination square
  if (s.length < 2) return null;
  const destStr = s.slice(-2);
  const to = algebraicToSquare(destStr);
  if (to === null) return null;
  s = s.slice(0, -2);

  // Remaining chars are disambiguation (file, rank, or both)
  let disambigFile: number | null = null;
  let disambigRank: number | null = null;
  for (const ch of s) {
    if (ch >= 'a' && ch <= 'h') disambigFile = ch.charCodeAt(0) - 97;
    else if (ch >= '1' && ch <= '8') disambigRank = parseInt(ch, 10) - 1;
  }

  // Find matching legal move
  const candidates = legalMoves.filter((m) => {
    if (m.to !== to) return false;
    const p = pieceAt(pos, m.from);
    if (!p || p.type !== targetPieceType) return false;
    if (disambigFile !== null && (m.from & 7) !== disambigFile) return false;
    if (disambigRank !== null && (m.from >> 3) !== disambigRank) return false;
    if (promotion !== undefined && m.promotion !== promotion) return false;
    if (promotion === undefined && m.promotion !== undefined) return false;
    return true;
  });

  return candidates.length === 1 ? candidates[0]! : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function algebraicToSquare(str: string): Square | null {
  if (str.length !== 2) return null;
  const f = str.charCodeAt(0) - 97;
  const r = parseInt(str[1]!, 10) - 1;
  if (f < 0 || f > 7 || r < 0 || r > 7) return null;
  return square(r * 8 + f);
}

function sanCharToPromo(ch: string): PieceType | undefined {
  const map: Record<string, PieceType> = {
    q: PieceType.Queen,
    r: PieceType.Rook,
    b: PieceType.Bishop,
    n: PieceType.Knight,
  };
  return map[ch];
}
