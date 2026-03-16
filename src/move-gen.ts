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
import { bit, eachSquare, shiftNorth, shiftSouth, shiftNorthEast, shiftNorthWest, shiftSouthEast, shiftSouthWest, RANK_2, RANK_7, NOT_FILE_A, NOT_FILE_H, FULL } from './bitboard.ts';
import { occupied, colorBB, typeBB, kingSquare } from './board.ts';
import { getCastlingRooks } from './castling.ts';
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

  // Captures (use bitboard shifts so destination is 64-bit masked)
  const captureLeft = us === Color.White ? shiftNorthWest(pawns) : shiftSouthWest(pawns);
  const captureRight = us === Color.White ? shiftNorthEast(pawns) : shiftSouthEast(pawns);
  const leftTargets = captureLeft & theirPieces;
  const rightTargets = captureRight & theirPieces;
  const leftOffset = us === Color.White ? -7 : 9;
  const rightOffset = us === Color.White ? -9 : 7;

  for (const to of eachSquare(leftTargets)) {
    const from = square(to + leftOffset);
    if (bit(from) & promoRank) {
      addPromotions(from, to, moves);
    } else {
      moves.push({ from, to, flag: MoveFlag.Normal });
    }
  }
  for (const to of eachSquare(rightTargets)) {
    const from = square(to + rightOffset);
    if (bit(from) & promoRank) {
      addPromotions(from, to, moves);
    } else {
      moves.push({ from, to, flag: MoveFlag.Normal });
    }
  }

  // En passant
  if (pos.epSquare !== null) {
    const epBit = bit(pos.epSquare);
    if (captureLeft & epBit) {
      const from = square(pos.epSquare + leftOffset);
      moves.push({ from, to: pos.epSquare, flag: MoveFlag.EnPassant });
    }
    if (captureRight & epBit) {
      const from = square(pos.epSquare + rightOffset);
      moves.push({ from, to: pos.epSquare, flag: MoveFlag.EnPassant });
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
  const kingsideRight = us === Color.White ? CastlingRight.WhiteKingside : CastlingRight.BlackKingside;
  const queensideRight = us === Color.White ? CastlingRight.WhiteQueenside : CastlingRight.BlackQueenside;

  const { king, kingsideRook, queensideRook } = getCastlingRooks(pos, us);
  const rank = king >> 3;
  const kingFile = king & 7;

  // FIDE Chess960: king and rook end on the same squares as in standard chess.
  // Kingside: king to g (file 6), rook to f (file 5)
  if (pos.castlingRights & kingsideRight && kingsideRook !== null) {
    const rookFile = kingsideRook & 7;
    const kingDest = square(rank * 8 + 6);
    let pathBB = 0n;
    for (let f = kingFile + 1; f <= 5; f++) {
      if (f !== rookFile) pathBB |= bit(square(rank * 8 + f));
    }
    if (!(allOcc & pathBB)) {
      let notAttacked = !isSquareAttacked(pos, king, them);
      if (notAttacked) {
        for (let f = kingFile; f <= 6; f++) {
          if (isSquareAttacked(pos, square(rank * 8 + f), them)) {
            notAttacked = false;
            break;
          }
        }
      }
      if (notAttacked) {
        moves.push({ from: king, to: kingDest, flag: MoveFlag.Castling });
      }
    }
  }

  // Queenside: king to c (file 2), rook to d (file 3). If king already on c1/c8, kingDest = king.
  if (pos.castlingRights & queensideRight && queensideRook !== null) {
    const rookFile = queensideRook & 7;
    const kingDest = kingFile === 2 ? king : square(rank * 8 + 2);
    let pathBB = 0n;
    if (kingFile === 2) {
      pathBB = bit(square(rank * 8 + 3)); // only rook dest (d1/d8) must be empty
    } else {
      for (let f = rookFile + 1; f <= kingFile - 1; f++) {
        pathBB |= bit(square(rank * 8 + f));
      }
    }
    if (!(allOcc & pathBB)) {
      let notAttacked = !isSquareAttacked(pos, king, them);
      if (notAttacked) {
        for (let f = 2; f <= kingFile; f++) {
          if (isSquareAttacked(pos, square(rank * 8 + f), them)) {
            notAttacked = false;
            break;
          }
        }
      }
      if (notAttacked) {
        moves.push({ from: king, to: kingDest, flag: MoveFlag.Castling });
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
