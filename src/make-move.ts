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
import { setPiece, removePiece, pieceAt } from './board.ts';
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

  // Castling: move the rook
  if (move.flag === MoveFlag.Castling) {
    const isKingside = move.to > move.from;
    const rookFrom = square(isKingside ? move.from + 3 : move.from - 4);
    const rookTo = square(isKingside ? move.from + 1 : move.from - 1);
    newPos = removePiece(newPos, rookFrom, us, PieceType.Rook);
    newPos = setPiece(newPos, rookTo, us, PieceType.Rook);
  }

  // Update en passant square
  const newEpSquare = move.flag === MoveFlag.DoublePush
    ? ((us === Color.White ? move.from + 8 : move.from - 8) as typeof move.from)
    : null;

  // Update castling rights
  const newCastlingRights = updateCastlingRights(pos.castlingRights, move, piece.type, us);

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

  // Castling: move the rook
  if (move.flag === MoveFlag.Castling) {
    const isKingside = move.to > move.from;
    const rookFrom = square(isKingside ? move.from + 3 : move.from - 4);
    const rookTo = square(isKingside ? move.from + 1 : move.from - 1);
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
// Castling rights update
// ---------------------------------------------------------------------------

// Mask indexed by square: AND with current rights to clear relevant bits.
// Moving FROM or capturing TO one of these squares revokes the associated right.
const CASTLING_MASK: number[] = new Array<number>(64).fill(
  CastlingRight.All,
);
CASTLING_MASK[0] = ~CastlingRight.WhiteQueenside & 0xF;   // a1 rook
CASTLING_MASK[4] = ~(CastlingRight.WhiteKingside | CastlingRight.WhiteQueenside) & 0xF; // e1 king
CASTLING_MASK[7] = ~CastlingRight.WhiteKingside & 0xF;    // h1 rook
CASTLING_MASK[56] = ~CastlingRight.BlackQueenside & 0xF;  // a8 rook
CASTLING_MASK[60] = ~(CastlingRight.BlackKingside | CastlingRight.BlackQueenside) & 0xF; // e8 king
CASTLING_MASK[63] = ~CastlingRight.BlackKingside & 0xF;   // h8 rook

function updateCastlingRights(
  rights: number,
  move: Move,
  _pieceType: PieceType,
  _us: Color,
): number {
  return rights & CASTLING_MASK[move.from]! & CASTLING_MASK[move.to]!;
}
