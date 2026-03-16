import { type Position, type Square, Color, PieceType, square } from './types.ts';
import { pieceAt, kingSquare } from './board.ts';

export interface CastlingRooks {
  king: Square;
  kingsideRook: Square | null;
  queensideRook: Square | null;
}

/**
 * Returns the king square and the kingside/queenside rook squares on the back rank
 * for the given color. Works for standard chess and Chess 960.
 * - Kingside rook: rook with smallest file > king file (right of king).
 * - Queenside rook: rook with largest file < king file (left of king).
 * When the king is not on the back rank, rook squares are null (cannot infer K/Q).
 */
export function getCastlingRooks(pos: Position, color: Color): CastlingRooks {
  const backRank = color === Color.White ? 0 : 7;
  const base = backRank * 8;

  let kingOnBackRank: Square | null = null;
  const rookFiles: number[] = [];

  for (let f = 0; f < 8; f++) {
    const sq = square(base + f);
    const piece = pieceAt(pos, sq);
    if (!piece || piece.color !== color) continue;
    if (piece.type === PieceType.King) {
      kingOnBackRank = sq;
    } else if (piece.type === PieceType.Rook) {
      rookFiles.push(f);
    }
  }

  const kingSq = kingOnBackRank ?? kingSquare(pos, color);

  if (kingOnBackRank === null) {
    return {
      king: kingSq,
      kingsideRook: null,
      queensideRook: null,
    };
  }

  const kingFile = kingOnBackRank & 7;
  const rooksRight = rookFiles.filter((rf) => rf > kingFile).sort((a, b) => a - b);
  const rooksLeft = rookFiles.filter((rf) => rf < kingFile).sort((a, b) => b - a);

  return {
    king: kingSq,
    kingsideRook: rooksRight.length > 0 ? square(base + rooksRight[0]!) : null,
    queensideRook: rooksLeft.length > 0 ? square(base + rooksLeft[0]!) : null,
  };
}
