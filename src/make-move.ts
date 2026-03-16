import {
  type Position,
  type Move,
  Color,
  PieceType,
  MoveFlag,
  CastlingRight,
  square,
  oppositeColor,
} from './types.ts';
import { setPiece, removePiece, pieceAt, typeBB, colorBB } from './board.ts';
import { getCastlingRooks } from './castling.ts';
import { hashPiece, hashSide, hashCastling, hashEp } from './zobrist.ts';

// ---------------------------------------------------------------------------
// Apply a move to produce a new immutable Position
// ---------------------------------------------------------------------------

export function makeMove(pos: Position, move: Move): Position {
  const us = pos.sideToMove;
  const them = oppositeColor(us);
  const piece = pieceAt(pos, move.from);

  if (!piece) {
    throw new Error(`No piece at source square ${move.from}`);
  }

  let newPos = removePiece(pos, move.from, us, piece.type);

  // Castling: move the rook first (before placing king). FIDE Chess960: king/rook end on standard squares (kingside g/f, queenside c/d).
  if (move.flag === MoveFlag.Castling) {
    const { kingsideRook, queensideRook } = getCastlingRooks(pos, us);
    const isKingside = (move.to & 7) > (move.from & 7);
    const rank = move.from >> 3;
    const rookFrom = isKingside ? kingsideRook! : queensideRook!;
    const rookTo = square(rank * 8 + (isKingside ? 5 : 3));
    newPos = removePiece(newPos, rookFrom, us, PieceType.Rook);
    newPos = setPiece(newPos, rookTo, us, PieceType.Rook);
  }

  // Capture: remove enemy piece at target
  const captured = pieceAt(pos, move.to);
  if (captured) {
    newPos = removePiece(newPos, move.to, them, captured.type);
  }

  // Place piece at destination (or promoted piece)
  const placedType = move.flag === MoveFlag.Promotion && move.promotion !== undefined
    ? move.promotion
    : piece.type;
  newPos = setPiece(newPos, move.to, us, placedType);

  // En passant capture
  if (move.flag === MoveFlag.EnPassant) {
    const capturedPawnSquare = (us === Color.White ? move.to - 8 : move.to + 8) as typeof move.to;
    newPos = removePiece(newPos, capturedPawnSquare, them, PieceType.Pawn);
  }

  // Update en passant square
  const newEpSquare = move.flag === MoveFlag.DoublePush
    ? ((us === Color.White ? move.from + 8 : move.from - 8) as typeof move.from)
    : null;

  // Update castling rights (position-based for standard and Chess 960)
  const newCastlingRights = updateCastlingRights(pos, move);

  // Update clocks
  const isCapture = captured !== null || move.flag === MoveFlag.EnPassant;
  const isPawnMove = piece.type === PieceType.Pawn;
  const newHalfmove = isCapture || isPawnMove ? 0 : pos.halfmoveClock + 1;
  const newFullmove = us === Color.Black ? pos.fullmoveNumber + 1 : pos.fullmoveNumber;

  return {
    ...newPos,
    sideToMove: them,
    castlingRights: newCastlingRights,
    epSquare: newEpSquare,
    halfmoveClock: newHalfmove,
    fullmoveNumber: newFullmove,
    hash: incrementalHash(
      pos, us, them, piece.type, placedType, captured?.type ?? null,
      move, newCastlingRights, newEpSquare,
    ),
  };
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
): bigint {
  let h = pos.hash;

  // Remove moved piece from source
  h ^= hashPiece(us, srcType, move.from);

  // Place piece (or promoted piece) at destination
  h ^= hashPiece(us, placedType, move.to);

  // Remove captured piece
  if (capturedType !== null && move.flag !== MoveFlag.EnPassant) {
    h ^= hashPiece(them, capturedType, move.to);
  }

  // En passant capture: pawn was on a different square than move.to
  if (move.flag === MoveFlag.EnPassant) {
    const capturedSq = (us === Color.White ? move.to - 8 : move.to + 8) as typeof move.to;
    h ^= hashPiece(them, PieceType.Pawn, capturedSq);
  }

  // Castling: move the rook (standard target squares g/f or c/d)
  if (move.flag === MoveFlag.Castling) {
    const { kingsideRook, queensideRook } = getCastlingRooks(pos, us);
    const isKingside = (move.to & 7) > (move.from & 7);
    const rank = move.from >> 3;
    const rookFrom = isKingside ? kingsideRook! : queensideRook!;
    const rookTo = square(rank * 8 + (isKingside ? 5 : 3));
    h ^= hashPiece(us, PieceType.Rook, rookFrom);
    h ^= hashPiece(us, PieceType.Rook, rookTo);
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
// Castling rights update (position-based for standard and Chess 960)
// ---------------------------------------------------------------------------

function updateCastlingRights(pos: Position, move: Move): number {
  let rights = pos.castlingRights;

  for (const color of [Color.White, Color.Black] as const) {
    const hasKing = (colorBB(pos, color) & typeBB(pos, PieceType.King)) !== 0n;
    if (!hasKing) continue;

    const { king, kingsideRook, queensideRook } = getCastlingRooks(pos, color);
    const kingsideRight = color === Color.White ? CastlingRight.WhiteKingside : CastlingRight.BlackKingside;
    const queensideRight = color === Color.White ? CastlingRight.WhiteQueenside : CastlingRight.BlackQueenside;

    if (move.from === king || move.to === king) {
      rights &= ~(kingsideRight | queensideRight);
    }
    if (kingsideRook !== null && (move.from === kingsideRook || move.to === kingsideRook)) {
      rights &= ~kingsideRight;
    }
    if (queensideRook !== null && (move.from === queensideRook || move.to === queensideRook)) {
      rights &= ~queensideRight;
    }
  }

  return rights;
}
