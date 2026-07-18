import {
  type Position,
  type Square,
  Color,
  PieceType,
  GameResult,
  DrawReason,
  oppositeColor,
} from './types.ts';
import { popcount } from './bitboard.ts';
import { occupied, typeBB, kingSquare } from './board.ts';
import { isAttacked } from './attacks.ts';
import { getLegalMoves } from './move-gen.ts';

// ---------------------------------------------------------------------------
// Square attack detection
// ---------------------------------------------------------------------------

export function isSquareAttacked(pos: Position, sq: Square, byColor: Color): boolean {
  return isAttacked(pos.pieces.byColor, pos.pieces.byType, sq, byColor);
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

  const pieceCount = popcount(allPieces);
  if (pieceCount > 4) return false;

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

// ---------------------------------------------------------------------------
// Repetition detection (stateless: caller supplies the hash history)
// ---------------------------------------------------------------------------

/** Counts how many entries of `history` equal `hash`. */
export function countRepetitions(hash: bigint, history: readonly bigint[]): number {
  let count = 0;
  for (const h of history) {
    if (h === hash) count++;
  }
  return count;
}

/**
 * True when the current position has occurred three or more times.
 * `history` must contain the hashes of every position reached so far,
 * including `pos` itself (e.g. push `pos.hash` after every makeMove).
 */
export function isThreefoldRepetition(pos: Position, history: readonly bigint[]): boolean {
  return countRepetitions(pos.hash, history) >= 3;
}

// ---------------------------------------------------------------------------
// Game result
// ---------------------------------------------------------------------------

export interface GameStatus {
  result: GameResult;
  drawReason?: DrawReason;
}

/**
 * Evaluates the game state of a position. Repetition is only checked when a
 * hash `history` is provided (see isThreefoldRepetition for its contract).
 */
export function getGameResult(pos: Position, history?: readonly bigint[]): GameStatus {
  if (getLegalMoves(pos).length === 0) {
    if (isCheck(pos)) {
      return {
        result: pos.sideToMove === Color.White ? GameResult.BlackWins : GameResult.WhiteWins,
      };
    }
    return { result: GameResult.Draw, drawReason: DrawReason.Stalemate };
  }
  if (isInsufficientMaterial(pos)) {
    return { result: GameResult.Draw, drawReason: DrawReason.InsufficientMaterial };
  }
  if (isFiftyMoveRule(pos)) {
    return { result: GameResult.Draw, drawReason: DrawReason.FiftyMoveRule };
  }
  if (history !== undefined && isThreefoldRepetition(pos, history)) {
    return { result: GameResult.Draw, drawReason: DrawReason.ThreefoldRepetition };
  }
  return { result: GameResult.InProgress };
}
