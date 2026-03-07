import { describe, it, expect } from 'vitest';
import { fromFen, toFen, STARTING_FEN } from '../src/fen.ts';
import { Color, PieceType } from '../src/types.ts';
import { pieceAt } from '../src/board.ts';
import { square } from '../src/types.ts';

describe('FEN parsing', () => {
  it('should parse the starting position', () => {
    const pos = fromFen(STARTING_FEN);

    expect(pos.sideToMove).toBe(Color.White);
    expect(pos.halfmoveClock).toBe(0);
    expect(pos.fullmoveNumber).toBe(1);
    expect(pos.epSquare).toBeNull();
  });

  it('should place white rook on a1', () => {
    const pos = fromFen(STARTING_FEN);
    const piece = pieceAt(pos, square(0)); // a1
    expect(piece).not.toBeNull();
    expect(piece!.color).toBe(Color.White);
    expect(piece!.type).toBe(PieceType.Rook);
  });

  it('should place black king on e8', () => {
    const pos = fromFen(STARTING_FEN);
    const piece = pieceAt(pos, square(60)); // e8
    expect(piece).not.toBeNull();
    expect(piece!.color).toBe(Color.Black);
    expect(piece!.type).toBe(PieceType.King);
  });

  it('should place white pawns on rank 2', () => {
    const pos = fromFen(STARTING_FEN);
    for (let f = 0; f < 8; f++) {
      const piece = pieceAt(pos, square(8 + f)); // rank 2
      expect(piece).not.toBeNull();
      expect(piece!.color).toBe(Color.White);
      expect(piece!.type).toBe(PieceType.Pawn);
    }
  });

  it('should parse en passant square', () => {
    const pos = fromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    expect(pos.epSquare).toBe(square(20)); // e3
    expect(pos.sideToMove).toBe(Color.Black);
  });

  it('should throw on invalid FEN', () => {
    expect(() => fromFen('invalid')).toThrow();
  });
});

describe('FEN serialization', () => {
  it('should round-trip the starting position', () => {
    const pos = fromFen(STARTING_FEN);
    expect(toFen(pos)).toBe(STARTING_FEN);
  });

  it('should round-trip a mid-game position', () => {
    const fen = 'r1bqkb1r/pppppppp/2n2n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const pos = fromFen(fen);
    expect(toFen(pos)).toBe(fen);
  });

  it('should round-trip a position with no castling rights', () => {
    const fen = '8/8/8/8/8/8/8/4K2k w - - 0 1';
    const pos = fromFen(fen);
    expect(toFen(pos)).toBe(fen);
  });
});
