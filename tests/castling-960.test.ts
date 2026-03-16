import { describe, it, expect } from 'vitest';
import { fromFen, toFen, STARTING_FEN } from '../src/fen.ts';
import { getCastlingRooks } from '../src/castling.ts';
import { getLegalMoves } from '../src/move-gen.ts';
import { makeMove } from '../src/make-move.ts';
import { toSan, fromSan } from '../src/notation.ts';
import { Color, MoveFlag } from '../src/types.ts';
import { square } from '../src/types.ts';
import { randomChess960Fen, chess960StartingFen } from '../src/chess960.ts';

describe('getCastlingRooks', () => {
  it('returns standard squares for starting position (white)', () => {
    const pos = fromFen(STARTING_FEN);
    const { king, kingsideRook, queensideRook } = getCastlingRooks(pos, Color.White);
    expect(king).toBe(square(4));   // e1
    expect(kingsideRook).toBe(square(7));  // h1
    expect(queensideRook).toBe(square(0)); // a1
  });

  it('returns standard squares for starting position (black)', () => {
    const pos = fromFen(STARTING_FEN);
    const { king, kingsideRook, queensideRook } = getCastlingRooks(pos, Color.Black);
    expect(king).toBe(square(60));  // e8
    expect(kingsideRook).toBe(square(63)); // h8
    expect(queensideRook).toBe(square(56)); // a8
  });

  it('returns correct rooks for a Chess 960 back rank (same setup both sides)', () => {
    // Both ranks use R1B1K2R: R a, B c, K e, R h — king e1/e8, rooks a and h
    const fen = 'R1B1K2R/pppppppp/8/8/8/8/PPPPPPPP/R1B1K2R w KQkq - 0 1';
    const pos = fromFen(fen);
    const white = getCastlingRooks(pos, Color.White);
    expect(white.king).toBe(square(4)); // e1
    expect(white.kingsideRook).toBe(square(7)); // h1
    expect(white.queensideRook).toBe(square(0)); // a1
  });

  it('returns null rooks when king is not on back rank', () => {
    const fen = '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1'; // black king on e8
    const pos = fromFen(fen);
    const black = getCastlingRooks(pos, Color.Black);
    expect(black.king).toBe(square(60));
    expect(black.kingsideRook).toBe(null);
    expect(black.queensideRook).toBe(null);
  });
});

describe('Chess 960 castling', () => {
  it('generates castling moves in a 960 position', () => {
    // Position with king on f1, rooks on a1 and h1. FIDE: kingside king→g1 rook→f1, queenside king→c1 rook→d1.
    const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4K1R w KQkq - 0 1';
    const pos = fromFen(fen);
    const moves = getLegalMoves(pos);
    const castlingMoves = moves.filter((m) => m.flag === MoveFlag.Castling && m.from === square(5) && (m.to === square(6) || m.to === square(2)));
    expect(castlingMoves.length).toBe(2);
    const kingside = moves.find((m) => m.from === 5 && m.to === 6 && m.flag === MoveFlag.Castling);
    const queenside = moves.find((m) => m.from === 5 && m.to === 2 && m.flag === MoveFlag.Castling);
    expect(kingside).toBeDefined();
    expect(queenside).toBeDefined();
  });

  it('makeMove castling and toFen round-trip in 960', () => {
    const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4K1R w KQkq - 0 1';
    const pos = fromFen(fen);
    const moves = getLegalMoves(pos);
    const kingside = moves.find((m) => m.from === 5 && m.to === 6 && m.flag === MoveFlag.Castling);
    expect(kingside).toBeDefined();
    const after = makeMove(pos, kingside!);
    const fenAfter = toFen(after);
    expect(fenAfter).toContain('R4RK1'); // white back rank after O-O: rook a1, 4 empty, rook f1, king g1, 1 empty
  });

  it('toSan and fromSan for castling in 960', () => {
    const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4K1R w KQkq - 0 1';
    const pos = fromFen(fen);
    const moves = getLegalMoves(pos);
    const kingside = moves.find((m) => m.from === 5 && m.to === 6 && m.flag === MoveFlag.Castling);
    const queenside = moves.find((m) => m.from === 5 && m.to === 2 && m.flag === MoveFlag.Castling);
    expect(kingside).toBeDefined();
    expect(toSan(pos, kingside!)).toBe('O-O');
    expect(fromSan(pos, 'O-O')).toEqual(kingside);
    expect(toSan(pos, queenside!)).toBe('O-O-O');
    expect(fromSan(pos, 'O-O-O')).toEqual(queenside);
  });
});

describe('Chess 960 FEN generation', () => {
  it('randomChess960Fen produces loadable FEN with both castling rights', () => {
    const fen = randomChess960Fen();
    const pos = fromFen(fen);
    expect(pos.castlingRights).toBe(0b1111); // KQkq
    expect(pos.sideToMove).toBe(Color.White);
  });

  it('chess960StartingFen(index) returns valid FEN for indices 0 and 959', () => {
    const fen0 = chess960StartingFen(0);
    const fen959 = chess960StartingFen(959);
    expect(fromFen(fen0).castlingRights).toBe(0b1111);
    expect(fromFen(fen959).castlingRights).toBe(0b1111);
    expect(fen0).not.toBe(fen959);
  });

  it('chess960StartingFen throws for out-of-range index', () => {
    expect(() => chess960StartingFen(-1)).toThrow();
    expect(() => chess960StartingFen(960)).toThrow();
  });
});
