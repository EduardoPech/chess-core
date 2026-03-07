import {
  type Position,
  type Move,
  type Square,
  Color,
  PieceType,
  MoveFlag,
  CastlingRight,
  square,
  oppositeColor,
} from './types.ts';
import { bit, eachSquare, shiftNorth, shiftSouth, RANK_2, RANK_7, NOT_FILE_A, NOT_FILE_H, FULL } from './bitboard.ts';
import { occupied, colorBB, typeBB, kingSquare } from './board.ts';
import { KNIGHT_ATTACKS, KING_ATTACKS, bishopAttacks, rookAttacks, queenAttacks } from './attacks.ts';
import { makeMove } from './make-move.ts';

// ---------------------------------------------------------------------------
// Legal move generation
// ---------------------------------------------------------------------------

export function getLegalMoves(pos: Position): Move[] {
  const pseudoLegal = getPseudoLegalMoves(pos);
  return pseudoLegal.filter((move) => isLegalMove(pos, move));
}

// ---------------------------------------------------------------------------
// Pseudo-legal move generation
// ---------------------------------------------------------------------------

export function getPseudoLegalMoves(pos: Position): Move[] {
  const moves: Move[] = [];
  const us = pos.sideToMove;
  const them = oppositeColor(us);
  const ourPieces = colorBB(pos, us);
  const theirPieces = colorBB(pos, them);
  const allOccupied = occupied(pos);

  generatePawnMoves(pos, us, ourPieces, theirPieces, allOccupied, moves);
  generateKnightMoves(us, ourPieces, pos, moves);
  generateBishopMoves(us, ourPieces, allOccupied, pos, moves);
  generateRookMoves(us, ourPieces, allOccupied, pos, moves);
  generateQueenMoves(us, ourPieces, allOccupied, pos, moves);
  generateKingMoves(pos, us, ourPieces, allOccupied, moves);

  return moves;
}

// ---------------------------------------------------------------------------
// Pawn moves
// ---------------------------------------------------------------------------

function generatePawnMoves(
  pos: Position,
  us: Color,
  ourPieces: bigint,
  theirPieces: bigint,
  allOccupied: bigint,
  moves: Move[],
): void {
  const pawns = ourPieces & typeBB(pos, PieceType.Pawn);
  const forward = us === Color.White ? shiftNorth : shiftSouth;
  const startRank = us === Color.White ? RANK_2 : RANK_7;
  const promoRank = us === Color.White ? RANK_7 : RANK_2;

  // Single push
  const singlePush = forward(pawns) & ~allOccupied;
  for (const to of eachSquare(singlePush)) {
    const from = square(us === Color.White ? to - 8 : to + 8);
    if (bit(from) & promoRank) {
      addPromotions(from, to, moves);
    } else {
      moves.push({ from, to, flag: MoveFlag.Normal });
    }
  }

  // Double push
  const startPawns = pawns & startRank;
  const firstStep = forward(startPawns) & ~allOccupied;
  const secondStep = forward(firstStep) & ~allOccupied;
  for (const to of eachSquare(secondStep)) {
    const from = square(us === Color.White ? to - 16 : to + 16);
    moves.push({ from, to, flag: MoveFlag.DoublePush });
  }

  // Captures
  const captureLeft = us === Color.White
    ? (pawns << 7n) & ~(0x0101_0101_0101_0101n << 7n) // NOT_FILE_H simplified
    : (pawns >> 7n) & ~0x0101_0101_0101_0101n;
  const captureRight = us === Color.White
    ? (pawns << 9n) & ~0x0101_0101_0101_0101n
    : (pawns >> 9n) & ~(0x0101_0101_0101_0101n << 7n);

  for (const targets of [captureLeft & theirPieces, captureRight & theirPieces]) {
    for (const to of eachSquare(targets)) {
      const fromOffset = targets === (captureLeft & theirPieces)
        ? (us === Color.White ? -7 : 7)
        : (us === Color.White ? -9 : 9);
      const from = square(to + fromOffset);
      if (bit(from) & promoRank) {
        addPromotions(from, to, moves);
      } else {
        moves.push({ from, to, flag: MoveFlag.Normal });
      }
    }
  }

  // En passant
  if (pos.epSquare !== null) {
    const epBit = bit(pos.epSquare);
    for (const targets of [captureLeft, captureRight]) {
      if (targets & epBit) {
        const fromOffset = targets === captureLeft
          ? (us === Color.White ? -7 : 7)
          : (us === Color.White ? -9 : 9);
        const from = square(pos.epSquare + fromOffset);
        moves.push({ from, to: pos.epSquare, flag: MoveFlag.EnPassant });
      }
    }
  }
}

function addPromotions(from: Square, to: Square, moves: Move[]): void {
  moves.push({ from, to, promotion: PieceType.Queen, flag: MoveFlag.Promotion });
  moves.push({ from, to, promotion: PieceType.Rook, flag: MoveFlag.Promotion });
  moves.push({ from, to, promotion: PieceType.Bishop, flag: MoveFlag.Promotion });
  moves.push({ from, to, promotion: PieceType.Knight, flag: MoveFlag.Promotion });
}

// ---------------------------------------------------------------------------
// Piece moves (knight, bishop, rook, queen, king)
// ---------------------------------------------------------------------------

function generateKnightMoves(_us: Color, ourPieces: bigint, pos: Position, moves: Move[]): void {
  const knights = ourPieces & typeBB(pos, PieceType.Knight);
  for (const from of eachSquare(knights)) {
    const attacks = KNIGHT_ATTACKS[from]! & ~ourPieces;
    for (const to of eachSquare(attacks)) {
      moves.push({ from, to, flag: MoveFlag.Normal });
    }
  }
}

function generateBishopMoves(_us: Color, ourPieces: bigint, allOccupied: bigint, pos: Position, moves: Move[]): void {
  const bishops = ourPieces & typeBB(pos, PieceType.Bishop);
  for (const from of eachSquare(bishops)) {
    const attacks = bishopAttacks(from, allOccupied) & ~ourPieces;
    for (const to of eachSquare(attacks)) {
      moves.push({ from, to, flag: MoveFlag.Normal });
    }
  }
}

function generateRookMoves(_us: Color, ourPieces: bigint, allOccupied: bigint, pos: Position, moves: Move[]): void {
  const rooks = ourPieces & typeBB(pos, PieceType.Rook);
  for (const from of eachSquare(rooks)) {
    const attacks = rookAttacks(from, allOccupied) & ~ourPieces;
    for (const to of eachSquare(attacks)) {
      moves.push({ from, to, flag: MoveFlag.Normal });
    }
  }
}

function generateQueenMoves(_us: Color, ourPieces: bigint, allOccupied: bigint, pos: Position, moves: Move[]): void {
  const queens = ourPieces & typeBB(pos, PieceType.Queen);
  for (const from of eachSquare(queens)) {
    const attacks = queenAttacks(from, allOccupied) & ~ourPieces;
    for (const to of eachSquare(attacks)) {
      moves.push({ from, to, flag: MoveFlag.Normal });
    }
  }
}

function generateKingMoves(pos: Position, us: Color, ourPieces: bigint, _allOccupied: bigint, moves: Move[]): void {
  const kingSq = kingSquare(pos, us);
  const attacks = KING_ATTACKS[kingSq]! & ~ourPieces;

  for (const to of eachSquare(attacks)) {
    moves.push({ from: kingSq, to, flag: MoveFlag.Normal });
  }

  // Castling
  generateCastlingMoves(pos, us, moves);
}

function generateCastlingMoves(pos: Position, us: Color, moves: Move[]): void {
  const allOcc = occupied(pos);
  const them = oppositeColor(us);

  if (us === Color.White) {
    if (pos.castlingRights & CastlingRight.WhiteKingside) {
      const f1 = square(5), g1 = square(6);
      if (!(allOcc & (bit(f1) | bit(g1)))) {
        if (!isSquareAttacked(pos, square(4), them) &&
            !isSquareAttacked(pos, f1, them) &&
            !isSquareAttacked(pos, g1, them)) {
          moves.push({ from: square(4), to: g1, flag: MoveFlag.Castling });
        }
      }
    }
    if (pos.castlingRights & CastlingRight.WhiteQueenside) {
      const b1 = square(1), c1 = square(2), d1 = square(3);
      if (!(allOcc & (bit(b1) | bit(c1) | bit(d1)))) {
        if (!isSquareAttacked(pos, square(4), them) &&
            !isSquareAttacked(pos, d1, them) &&
            !isSquareAttacked(pos, c1, them)) {
          moves.push({ from: square(4), to: c1, flag: MoveFlag.Castling });
        }
      }
    }
  } else {
    if (pos.castlingRights & CastlingRight.BlackKingside) {
      const f8 = square(61), g8 = square(62);
      if (!(allOcc & (bit(f8) | bit(g8)))) {
        if (!isSquareAttacked(pos, square(60), them) &&
            !isSquareAttacked(pos, f8, them) &&
            !isSquareAttacked(pos, g8, them)) {
          moves.push({ from: square(60), to: g8, flag: MoveFlag.Castling });
        }
      }
    }
    if (pos.castlingRights & CastlingRight.BlackQueenside) {
      const b8 = square(57), c8 = square(58), d8 = square(59);
      if (!(allOcc & (bit(b8) | bit(c8) | bit(d8)))) {
        if (!isSquareAttacked(pos, square(60), them) &&
            !isSquareAttacked(pos, d8, them) &&
            !isSquareAttacked(pos, c8, them)) {
          moves.push({ from: square(60), to: c8, flag: MoveFlag.Castling });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Legality filter
// ---------------------------------------------------------------------------

function isLegalMove(pos: Position, move: Move): boolean {
  const newPos = makeMove(pos, move);
  const us = pos.sideToMove;
  return !isSquareAttacked(newPos, kingSquare(newPos, us), oppositeColor(us));
}

// ---------------------------------------------------------------------------
// Attack detection
// ---------------------------------------------------------------------------

export function isSquareAttacked(pos: Position, sq: Square, byColor: Color): boolean {
  const attackers = colorBB(pos, byColor);
  const allOcc = occupied(pos);

  if (KNIGHT_ATTACKS[sq]! & attackers & typeBB(pos, PieceType.Knight)) return true;
  if (KING_ATTACKS[sq]! & attackers & typeBB(pos, PieceType.King)) return true;

  const diag = bishopAttacks(sq, allOcc);
  if (diag & attackers & (typeBB(pos, PieceType.Bishop) | typeBB(pos, PieceType.Queen))) return true;

  const straight = rookAttacks(sq, allOcc);
  if (straight & attackers & (typeBB(pos, PieceType.Rook) | typeBB(pos, PieceType.Queen))) return true;

  const pawns = attackers & typeBB(pos, PieceType.Pawn);
  if (pawns) {
    const sqBit = bit(sq);
    const pawnAttackers = byColor === Color.White
      ? ((sqBit >> 9n) & NOT_FILE_H) | ((sqBit >> 7n) & NOT_FILE_A)
      : (((sqBit << 7n) & NOT_FILE_H) | ((sqBit << 9n) & NOT_FILE_A)) & FULL;
    if (pawnAttackers & pawns) return true;
  }

  return false;
}
