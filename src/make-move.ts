import {
  type Position,
  type Move,
  type Square,
  type CastlingRookSquares,
  Color,
  PieceType,
  MoveFlag,
  square,
  oppositeColor,
} from './types.ts';
import { bit } from './bitboard.ts';
import { hashPiece, hashSide, hashCastling, hashEp } from './zobrist.ts';

// ---------------------------------------------------------------------------
// Apply a move to produce a new immutable Position (single allocation)
// ---------------------------------------------------------------------------

export function makeMove(pos: Position, move: Move): Position {
  const us = pos.sideToMove;
  const them = oppositeColor(us);
  const pieces = pos.pieces;
  const fromBB = bit(move.from);
  const toBB = bit(move.to);

  if (!(pieces.byColor[us] & fromBB)) {
    throw new Error(`No piece of the side to move at source square ${move.from}`);
  }
  const srcType = typeAt(pieces.byType, fromBB);

  const byColor: [bigint, bigint] = [pieces.byColor[0], pieces.byColor[1]];
  const byType: [bigint, bigint, bigint, bigint, bigint, bigint] = [
    pieces.byType[0],
    pieces.byType[1],
    pieces.byType[2],
    pieces.byType[3],
    pieces.byType[4],
    pieces.byType[5],
  ];

  const isCastling = move.flag === MoveFlag.Castling;
  let placedType = srcType;
  let capturedType: PieceType | null = null;
  let castlingRookFrom: Square | null = null;
  let castlingRookTo: Square | null = null;

  if (isCastling) {
    // FIDE Chess960: king/rook end on standard squares (kingside g/f, queenside
    // c/d). Castling never captures; the king's destination may coincide with
    // the rook's square or the king's own origin. When from === to, the wing is
    // identified by the destination file.
    const isKingside = move.to === move.from ? (move.from & 7) === 6 : (move.to & 7) > (move.from & 7);
    const rookSq = pos.castlingRooks[(us << 1) | (isKingside ? 0 : 1)] ?? null;
    if (rookSq === null) {
      throw new Error('Castling move without a matching castling right');
    }
    castlingRookFrom = rookSq;
    castlingRookTo = square((move.from >> 3) * 8 + (isKingside ? 5 : 3));
    const rookFromBB = bit(castlingRookFrom);
    const rookToBB = bit(castlingRookTo);
    byColor[us] = (byColor[us] & ~fromBB & ~rookFromBB) | toBB | rookToBB;
    byType[PieceType.King] = (byType[PieceType.King] & ~fromBB) | toBB;
    byType[PieceType.Rook] = (byType[PieceType.Rook] & ~rookFromBB) | rookToBB;
  } else {
    // Capture: remove enemy piece at target (or the en-passant pawn)
    if (byColor[them] & toBB) {
      capturedType = typeAt(pieces.byType, toBB);
      byColor[them] &= ~toBB;
      byType[capturedType] &= ~toBB;
    } else if (move.flag === MoveFlag.EnPassant) {
      const capBB = bit(square(us === Color.White ? move.to - 8 : move.to + 8));
      byColor[them] &= ~capBB;
      byType[PieceType.Pawn] &= ~capBB;
    }

    if (move.flag === MoveFlag.Promotion && move.promotion !== undefined) {
      placedType = move.promotion;
    }
    byColor[us] = (byColor[us] & ~fromBB) | toBB;
    byType[srcType] &= ~fromBB;
    byType[placedType] |= toBB;
  }

  // Update en passant square
  const newEpSquare = move.flag === MoveFlag.DoublePush
    ? ((us === Color.White ? move.from + 8 : move.from - 8) as typeof move.from)
    : null;

  // Update castling rights via the stored rook squares — O(1)
  const { rights: newCastlingRights, rooks: newCastlingRooks } =
    updateCastling(pos, move, us, srcType);

  // Update clocks
  const isCapture = capturedType !== null || move.flag === MoveFlag.EnPassant;
  const newHalfmove = isCapture || srcType === PieceType.Pawn ? 0 : pos.halfmoveClock + 1;
  const newFullmove = us === Color.Black ? pos.fullmoveNumber + 1 : pos.fullmoveNumber;

  return {
    pieces: { byColor, byType },
    sideToMove: them,
    castlingRights: newCastlingRights,
    castlingRooks: newCastlingRooks,
    epSquare: newEpSquare,
    halfmoveClock: newHalfmove,
    fullmoveNumber: newFullmove,
    hash: incrementalHash(
      pos, us, them, srcType, placedType, capturedType,
      move, newCastlingRights, newEpSquare, castlingRookFrom, castlingRookTo,
    ),
  };
}

function typeAt(byType: readonly bigint[], b: bigint): PieceType {
  for (let pt = 0; pt < 5; pt++) {
    if (byType[pt]! & b) return pt as PieceType;
  }
  return PieceType.King;
}

// ---------------------------------------------------------------------------
// Incremental Zobrist hash
// ---------------------------------------------------------------------------

function incrementalHash(
  pos: Position,
  us: Color,
  them: Color,
  srcType: PieceType,
  placedType: PieceType,
  capturedType: PieceType | null,
  move: Move,
  newCastlingRights: number,
  newEpSquare: typeof move.from | null,
  castlingRookFrom: Square | null,
  castlingRookTo: Square | null,
): bigint {
  let h = pos.hash;

  // Remove moved piece from source, place it (or the promoted piece) at dest
  h ^= hashPiece(us, srcType, move.from);
  h ^= hashPiece(us, placedType, move.to);

  // Remove captured piece
  if (capturedType !== null) {
    h ^= hashPiece(them, capturedType, move.to);
  }

  // En passant capture: pawn was on a different square than move.to
  if (move.flag === MoveFlag.EnPassant) {
    const capturedSq = (us === Color.White ? move.to - 8 : move.to + 8) as typeof move.to;
    h ^= hashPiece(them, PieceType.Pawn, capturedSq);
  }

  // Castling: the rook moved too
  if (castlingRookFrom !== null && castlingRookTo !== null) {
    h ^= hashPiece(us, PieceType.Rook, castlingRookFrom);
    h ^= hashPiece(us, PieceType.Rook, castlingRookTo);
  }

  // Flip side to move
  h ^= hashSide();

  // Update castling rights hash
  h ^= hashCastling(pos.castlingRights);
  h ^= hashCastling(newCastlingRights);

  // Update en passant hash
  h ^= hashEp(pos.epSquare);
  h ^= hashEp(newEpSquare);

  return h;
}

// ---------------------------------------------------------------------------
// Castling rights update (O(1) via the stored rook squares)
// ---------------------------------------------------------------------------

function updateCastling(
  pos: Position,
  move: Move,
  us: Color,
  movedType: PieceType,
): { rights: number; rooks: CastlingRookSquares } {
  if (pos.castlingRights === 0) {
    return { rights: 0, rooks: pos.castlingRooks };
  }

  let [wk, wq, bk, bq] = pos.castlingRooks;

  if (movedType === PieceType.King) {
    if (us === Color.White) {
      wk = null;
      wq = null;
    } else {
      bk = null;
      bq = null;
    }
  }
  // A move from a castling rook's square (the rook moved) or to it (the rook
  // was captured) invalidates that right.
  if (wk !== null && (move.from === wk || move.to === wk)) wk = null;
  if (wq !== null && (move.from === wq || move.to === wq)) wq = null;
  if (bk !== null && (move.from === bk || move.to === bk)) bk = null;
  if (bq !== null && (move.from === bq || move.to === bq)) bq = null;

  const rights =
    (wk !== null ? 1 : 0) |
    (wq !== null ? 2 : 0) |
    (bk !== null ? 4 : 0) |
    (bq !== null ? 8 : 0);

  if (rights === pos.castlingRights) {
    return { rights, rooks: pos.castlingRooks };
  }
  return { rights, rooks: [wk, wq, bk, bq] };
}
