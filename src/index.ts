// Types
export type {
  Square,
  File,
  Rank,
  Move,
  Position,
  PieceBitboards,
  CastlingRights,
} from './types.ts';

export {
  Color,
  PieceType,
  MoveFlag,
  CastlingRight,
  GameResult,
  DrawReason,
  square,
  file,
  rank,
  fileOf,
  rankOf,
  squareFromFileRank,
  oppositeColor,
} from './types.ts';

// Board
export {
  EMPTY_POSITION,
  occupied,
  colorBB,
  typeBB,
  pieceAt,
  kingSquare,
  setPiece,
  removePiece,
} from './board.ts';

// FEN
export { fromFen, toFen, squareToAlgebraic, STARTING_FEN } from './fen.ts';

// Move generation
export { getLegalMoves, getPseudoLegalMoves } from './move-gen.ts';

// Make move
export { makeMove } from './make-move.ts';

// Validation
export {
  isSquareAttacked,
  isCheck,
  isCheckmate,
  isStalemate,
  isInsufficientMaterial,
  isFiftyMoveRule,
} from './validation.ts';

// Notation
export { toSan, toUci, fromUci, fromSan } from './notation.ts';

// Perft
export { perft, divide } from './perft.ts';
export type { DivideResult } from './perft.ts';

// Zobrist
export { computeHash } from './zobrist.ts';
