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

describe('FEN validation', () => {
  it('rejects a rank with more than 8 files', () => {
    expect(() => fromFen('ppppppppp/8/8/8/8/8/8/4K2k w - - 0 1')).toThrow(/rank/i);
  });

  it('rejects a rank with fewer than 8 files', () => {
    expect(() => fromFen('ppppppp/8/8/8/8/8/8/4K2k w - - 0 1')).toThrow(/rank/i);
  });

  it('rejects an off-board en passant square', () => {
    expect(() => fromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e9 0 1')).toThrow(/en passant/i);
  });

  it('rejects an en passant square on the wrong rank', () => {
    expect(() => fromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e4 0 1')).toThrow(/en passant/i);
  });

  it('rejects a board without kings', () => {
    expect(() => fromFen('8/8/8/8/8/8/8/8 w - - 0 1')).toThrow(/king/i);
  });

  it('rejects two kings of the same color', () => {
    expect(() => fromFen('4k3/8/8/8/8/8/8/2K1K3 w - - 0 1')).toThrow(/king/i);
  });

  it('rejects pawns on the back ranks', () => {
    expect(() => fromFen('P3k3/8/8/8/8/8/8/4K3 w - - 0 1')).toThrow(/pawn/i);
  });

  it('rejects an invalid side to move', () => {
    expect(() => fromFen('4k3/8/8/8/8/8/8/4K3 x - - 0 1')).toThrow(/side/i);
  });

  it('rejects non-numeric clocks', () => {
    expect(() => fromFen('4k3/8/8/8/8/8/8/4K3 w - - abc 1')).toThrow(/clock|move/i);
  });

  it('rejects an invalid castling field', () => {
    expect(() => fromFen('4k3/8/8/8/8/8/8/4K3 w XY - 0 1')).toThrow(/castling/i);
  });
});

describe('Zobrist hash from FEN', () => {
  it('fromFen computes a hash consistent with computeHash', async () => {
    const { computeHash } = await import('../src/zobrist.ts');
    const pos = fromFen(STARTING_FEN);
    expect(pos.hash).toBe(computeHash(pos));
    expect(pos.hash).not.toBe(0n);
  });
});

describe('X-FEN / Shredder-FEN castling', () => {
  it('parses partial Shredder rights (Hh = kingside only)', () => {
    const pos = fromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Hh - 0 1');
    expect(pos.castlingRights).toBe(0b0101); // WhiteKingside | BlackKingside
  });

  it('drops rights that reference a missing rook', () => {
    const pos = fromFen('4k3/8/8/8/8/8/8/4K2R w KQkq - 0 1');
    expect(pos.castlingRights).toBe(0b0001); // only WhiteKingside survives
  });

  it('round-trips Shredder rights for non-classical rook files', () => {
    const fen = '1rk1r3/8/8/8/8/8/8/1RK1R3 w EBeb - 0 1';
    expect(toFen(fromFen(fen))).toBe(fen);
  });

  it('round-trips an X-FEN file letter for a single 960 right', () => {
    const fen = '4k3/8/8/8/8/8/8/2NR1K2 w D - 0 1';
    expect(toFen(fromFen(fen))).toBe(fen);
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
