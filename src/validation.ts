import {
  type Position,
  type Square,
  Color,
  PieceType,
  oppositeColor,
} from './types.ts';
import { bit, eachSquare, popcount } from './bitboard.ts';
import { occupied, colorBB, typeBB, kingSquare } from './board.ts';
import { KNIGHT_ATTACKS, KING_ATTACKS, bishopAttacks, rookAttacks } from './attacks.ts';
import { getLegalMoves } from './move-gen.ts';

// ---------------------------------------------------------------------------
// Square attack detection
// ---------------------------------------------------------------------------

export function isSquareAttacked(pos: Position, sq: Square, byColor: Color): boolean {
  const attackers = colorBB(pos, byColor);
  const allOccupied = occupied(pos);

  // Knight attacks
  if (KNIGHT_ATTACKS[sq]! & attackers & typeBB(pos, PieceType.Knight)) return true;

  // King attacks
  if (KING_ATTACKS[sq]! & attackers & typeBB(pos, PieceType.King)) return true;

  // Bishop / Queen (diagonal)
  const diag = bishopAttacks(sq, allOccupied) & attackers;
  if (diag & (typeBB(pos, PieceType.Bishop) | typeBB(pos, PieceType.Queen))) return true;

  // Rook / Queen (straight)
  const straight = rookAttacks(sq, allOccupied) & attackers;
  if (straight & (typeBB(pos, PieceType.Rook) | typeBB(pos, PieceType.Queen))) return true;

  // Pawn attacks
  const pawnAttackers = attackers & typeBB(pos, PieceType.Pawn);
  if (pawnAttackers) {
    const sqBit = bit(sq);
    if (byColor === Color.White) {
      if (((sqBit >> 7n) & ~0x0101_0101_0101_0101n & pawnAttackers) ||
          ((sqBit >> 9n) & ~(0x0101_0101_0101_0101n << 7n) & pawnAttackers)) {
        return true;
      }
    } else {
      if (((sqBit << 7n) & ~(0x0101_0101_0101_0101n << 7n) & pawnAttackers) ||
          ((sqBit << 9n) & ~0x0101_0101_0101_0101n & pawnAttackers)) {
        return true;
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Check / checkmate / stalemate
// ---------------------------------------------------------------------------

export function isCheck(pos: Position): boolean {
  const kingSq = kingSquare(pos, pos.sideToMove);
  return isSquareAttacked(pos, kingSq, oppositeColor(pos.sideToMove));
}

export function isCheckmate(pos: Position): boolean {
  return isCheck(pos) && getLegalMoves(pos).length === 0;
}

export function isStalemate(pos: Position): boolean {
  return !isCheck(pos) && getLegalMoves(pos).length === 0;
}

// ---------------------------------------------------------------------------
// Insufficient material
// ---------------------------------------------------------------------------

export function isInsufficientMaterial(pos: Position): boolean {
  const allPieces = occupied(pos);
  const pawns = typeBB(pos, PieceType.Pawn);
  const rooks = typeBB(pos, PieceType.Rook);
  const queens = typeBB(pos, PieceType.Queen);

  if (pawns || rooks || queens) return false;

  const knights = typeBB(pos, PieceType.Knight);
  const bishops = typeBB(pos, PieceType.Bishop);

  let pieceCount = 0;
  for (const _ of eachSquare(allPieces)) {
    pieceCount++;
    if (pieceCount > 4) return false;
  }

  // K vs K
  if (pieceCount === 2) return true;

  // K+N vs K or K+B vs K
  if (pieceCount === 3 && (knights || bishops)) return true;

  // K+B vs K+B with same-color bishops
  if (pieceCount === 4 && popcount(bishops) === 2) {
    const LIGHT_SQUARES = 0x55AA_55AA_55AA_55AAn;
    const onLight = popcount(bishops & LIGHT_SQUARES);
    if (onLight === 0 || onLight === 2) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Fifty-move rule
// ---------------------------------------------------------------------------

export function isFiftyMoveRule(pos: Position): boolean {
  return pos.halfmoveClock >= 100;
}
