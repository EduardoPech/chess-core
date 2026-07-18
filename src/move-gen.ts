import {
  type Position,
  type Move,
  type Square,
  Color,
  PieceType,
  MoveFlag,
  square,
  oppositeColor,
} from './types.ts';
import { bit, bitscan, shiftNorth, shiftSouth, shiftNorthEast, shiftNorthWest, shiftSouthEast, shiftSouthWest, RANK_2, RANK_7 } from './bitboard.ts';
import { occupied, colorBB, typeBB, kingSquare } from './board.ts';
import { KNIGHT_ATTACKS, KING_ATTACKS, bishopAttacks, rookAttacks, queenAttacks, isAttacked } from './attacks.ts';

// ---------------------------------------------------------------------------
// Legal move generation
// ---------------------------------------------------------------------------

export function getLegalMoves(pos: Position): Move[] {
  const pseudoLegal = getPseudoLegalMoves(pos);
  const ourKing = kingSquare(pos, pos.sideToMove);
  return pseudoLegal.filter((move) => isLegalMove(pos, move, ourKing));
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
  let singlePush = forward(pawns) & ~allOccupied;
  while (singlePush) {
    const to = bitscan(singlePush);
    singlePush &= singlePush - 1n;
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
  let secondStep = forward(firstStep) & ~allOccupied;
  while (secondStep) {
    const to = bitscan(secondStep);
    secondStep &= secondStep - 1n;
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

  let lt = leftTargets;
  while (lt) {
    const to = bitscan(lt);
    lt &= lt - 1n;
    const from = square(to + leftOffset);
    if (bit(from) & promoRank) {
      addPromotions(from, to, moves);
    } else {
      moves.push({ from, to, flag: MoveFlag.Normal });
    }
  }
  let rt = rightTargets;
  while (rt) {
    const to = bitscan(rt);
    rt &= rt - 1n;
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
  let knights = ourPieces & typeBB(pos, PieceType.Knight);
  while (knights) {
    const from = bitscan(knights);
    knights &= knights - 1n;
    pushTargets(from, KNIGHT_ATTACKS[from]! & ~ourPieces, moves);
  }
}

function pushTargets(from: Square, targets: bigint, moves: Move[]): void {
  while (targets) {
    const to = bitscan(targets);
    targets &= targets - 1n;
    moves.push({ from, to, flag: MoveFlag.Normal });
  }
}

function generateBishopMoves(_us: Color, ourPieces: bigint, allOccupied: bigint, pos: Position, moves: Move[]): void {
  let bishops = ourPieces & typeBB(pos, PieceType.Bishop);
  while (bishops) {
    const from = bitscan(bishops);
    bishops &= bishops - 1n;
    pushTargets(from, bishopAttacks(from, allOccupied) & ~ourPieces, moves);
  }
}

function generateRookMoves(_us: Color, ourPieces: bigint, allOccupied: bigint, pos: Position, moves: Move[]): void {
  let rooks = ourPieces & typeBB(pos, PieceType.Rook);
  while (rooks) {
    const from = bitscan(rooks);
    rooks &= rooks - 1n;
    pushTargets(from, rookAttacks(from, allOccupied) & ~ourPieces, moves);
  }
}

function generateQueenMoves(_us: Color, ourPieces: bigint, allOccupied: bigint, pos: Position, moves: Move[]): void {
  let queens = ourPieces & typeBB(pos, PieceType.Queen);
  while (queens) {
    const from = bitscan(queens);
    queens &= queens - 1n;
    pushTargets(from, queenAttacks(from, allOccupied) & ~ourPieces, moves);
  }
}

function generateKingMoves(pos: Position, us: Color, ourPieces: bigint, _allOccupied: bigint, moves: Move[]): void {
  const kingSq = kingSquare(pos, us);
  pushTargets(kingSq, KING_ATTACKS[kingSq]! & ~ourPieces, moves);

  // Castling
  generateCastlingMoves(pos, us, moves);
}

function generateCastlingMoves(pos: Position, us: Color, moves: Move[]): void {
  const rookIdxBase = us << 1;
  if (pos.castlingRooks[rookIdxBase] === null && pos.castlingRooks[rookIdxBase + 1] === null) {
    return;
  }

  const allOcc = occupied(pos);
  const them = oppositeColor(us);
  // A live castling right implies the king is still on its back rank.
  const king = kingSquare(pos, us);
  const rank = king >> 3;
  const kingFile = king & 7;

  // FIDE Chess960: king and rook end on the same squares as in standard chess.
  // Kingside: king to g (file 6), rook to f (file 5). Queenside: king to c, rook to d.
  for (let side = 0; side < 2; side++) {
    const rookSq = pos.castlingRooks[rookIdxBase + side] ?? null;
    if (rookSq === null) continue;

    const kingDestFile = side === 0 ? 6 : 2;
    const rookDestFile = side === 0 ? 5 : 3;
    const rookFile = rookSq & 7;

    // Every square the king or the rook crosses (destinations included) must be
    // empty, apart from the king's and rook's own starting squares.
    let pathBB = 0n;
    const kLo = Math.min(kingFile, kingDestFile);
    const kHi = Math.max(kingFile, kingDestFile);
    for (let f = kLo; f <= kHi; f++) pathBB |= bit(square(rank * 8 + f));
    const rLo = Math.min(rookFile, rookDestFile);
    const rHi = Math.max(rookFile, rookDestFile);
    for (let f = rLo; f <= rHi; f++) pathBB |= bit(square(rank * 8 + f));
    pathBB &= ~bit(king) & ~bit(rookSq);
    if (allOcc & pathBB) continue;

    // No square the king stands on or crosses may be attacked.
    let attacked = false;
    for (let f = kLo; f <= kHi; f++) {
      if (isAttacked(pos.pieces.byColor, pos.pieces.byType, square(rank * 8 + f), them)) {
        attacked = true;
        break;
      }
    }
    if (attacked) continue;

    moves.push({ from: king, to: square(rank * 8 + kingDestFile), flag: MoveFlag.Castling });
  }
}

// ---------------------------------------------------------------------------
// Legality filter — applies only the bitboard deltas of the move (no hash,
// castling-rights, or clock bookkeeping) before testing for check.
// ---------------------------------------------------------------------------

function isLegalMove(pos: Position, move: Move, ourKing: Square): boolean {
  const us = pos.sideToMove;
  const them = oppositeColor(us);
  const pieces = pos.pieces;
  const fromBB = bit(move.from);
  const toBB = bit(move.to);

  let usBB = pieces.byColor[us];
  let themBB = pieces.byColor[them];
  const byType: [bigint, bigint, bigint, bigint, bigint, bigint] = [
    pieces.byType[0],
    pieces.byType[1],
    pieces.byType[2],
    pieces.byType[3],
    pieces.byType[4],
    pieces.byType[5],
  ];

  let kingSq: Square;
  if (move.flag === MoveFlag.Castling) {
    const isKingside = move.to === move.from ? (move.from & 7) === 6 : (move.to & 7) > (move.from & 7);
    const rookSq = pos.castlingRooks[(us << 1) | (isKingside ? 0 : 1)]!;
    const rookFromBB = bit(rookSq);
    const rookToBB = bit(square((move.from >> 3) * 8 + (isKingside ? 5 : 3)));
    usBB = (usBB & ~fromBB & ~rookFromBB) | toBB | rookToBB;
    byType[PieceType.King] = (byType[PieceType.King] & ~fromBB) | toBB;
    byType[PieceType.Rook] = (byType[PieceType.Rook] & ~rookFromBB) | rookToBB;
    kingSq = move.to;
  } else {
    const srcType = typeAt(pieces.byType, fromBB);
    if (themBB & toBB) {
      const capturedType = typeAt(pieces.byType, toBB);
      themBB &= ~toBB;
      byType[capturedType] &= ~toBB;
    } else if (move.flag === MoveFlag.EnPassant) {
      const capBB = bit(square(us === Color.White ? move.to - 8 : move.to + 8));
      themBB &= ~capBB;
      byType[PieceType.Pawn] &= ~capBB;
    }
    usBB = (usBB & ~fromBB) | toBB;
    byType[srcType] = (byType[srcType] & ~fromBB) | toBB;
    kingSq = srcType === PieceType.King ? move.to : ourKing;
  }

  const byColor: [bigint, bigint] = us === Color.White ? [usBB, themBB] : [themBB, usBB];
  return !isAttacked(byColor, byType, kingSq, them);
}

function typeAt(byType: readonly bigint[], b: bigint): PieceType {
  for (let pt = 0; pt < 5; pt++) {
    if (byType[pt]! & b) return pt as PieceType;
  }
  return PieceType.King;
}
