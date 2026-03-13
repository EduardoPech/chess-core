import { describe, it, expect } from 'vitest';
import { fromFen, STARTING_FEN } from '../src/fen.ts';
import { getLegalMoves } from '../src/move-gen.ts';
import { toSan, toUci, fromSan, fromUci } from '../src/notation.ts';

describe('UCI notation', () => {
  it('should format a pawn move as UCI', () => {
    const pos = fromFen(STARTING_FEN);
    const moves = getLegalMoves(pos);
    const e2e4 = moves.find((m) => m.from === 12 && m.to === 28);
    if (e2e4) {
      expect(toUci(e2e4)).toBe('e2e4');
    }
  });
});

describe('SAN notation', () => {
  describe('toSan', () => {
    it('should format pawn push e4', () => {
      const pos = fromFen(STARTING_FEN);
      const moves = getLegalMoves(pos);
      const e2e4 = moves.find((m) => m.from === 12 && m.to === 28);
      expect(e2e4).toBeDefined();
      expect(toSan(pos, e2e4!)).toBe('e4');
    });

    it('should format knight move Nf3', () => {
      const pos = fromFen(STARTING_FEN);
      const moves = getLegalMoves(pos);
      const nf3 = moves.find((m) => m.from === 6 && m.to === 21);
      expect(nf3).toBeDefined();
      expect(toSan(pos, nf3!)).toBe('Nf3');
    });

    it('should format pawn capture', () => {
      const fen = '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1';
      const pos = fromFen(fen);
      const moves = getLegalMoves(pos);
      const exd5 = moves.find((m) => m.from === 28 && m.to === 35);
      expect(exd5).toBeDefined();
      expect(toSan(pos, exd5!)).toBe('exd5');
    });

    it('should format kingside castling', () => {
      const fen = '4k3/8/8/8/8/8/8/4K2R w K - 0 1';
      const pos = fromFen(fen);
      const moves = getLegalMoves(pos);
      const castling = moves.find((m) => m.from === 4 && m.to === 6);
      expect(castling).toBeDefined();
      expect(toSan(pos, castling!)).toBe('O-O');
    });

    it('should format queenside castling', () => {
      const fen = '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1';
      const pos = fromFen(fen);
      const moves = getLegalMoves(pos);
      const castling = moves.find((m) => m.from === 4 && m.to === 2);
      expect(castling).toBeDefined();
      expect(toSan(pos, castling!)).toBe('O-O-O');
    });
  });

  describe('fromSan', () => {
    it('should parse pawn push e4', () => {
      const pos = fromFen(STARTING_FEN);
      const move = fromSan(pos, 'e4');
      expect(move).not.toBeNull();
      expect(toUci(move!)).toBe('e2e4');
    });

    it('should parse knight move Nf3', () => {
      const pos = fromFen(STARTING_FEN);
      const move = fromSan(pos, 'Nf3');
      expect(move).not.toBeNull();
      expect(toUci(move!)).toBe('g1f3');
    });

    it('should parse pawn capture exd5', () => {
      const fen = '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1';
      const pos = fromFen(fen);
      const move = fromSan(pos, 'exd5');
      expect(move).not.toBeNull();
      expect(toUci(move!)).toBe('e4d5');
    });

    it('should parse castling O-O', () => {
      const fen = '4k3/8/8/8/8/8/8/4K2R w K - 0 1';
      const pos = fromFen(fen);
      const move = fromSan(pos, 'O-O');
      expect(move).not.toBeNull();
      expect(toUci(move!)).toBe('e1g1');
    });

    it('should parse castling O-O-O', () => {
      const fen = '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1';
      const pos = fromFen(fen);
      const move = fromSan(pos, 'O-O-O');
      expect(move).not.toBeNull();
      expect(toUci(move!)).toBe('e1c1');
    });

    it('should parse check suffix', () => {
      // Rook delivers check
      const fen = '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1';
      const pos = fromFen(fen);
      const move = fromSan(pos, 'Ra8+');
      expect(move).not.toBeNull();
    });

    it('should return null for invalid SAN', () => {
      const pos = fromFen(STARTING_FEN);
      expect(fromSan(pos, 'Zz9')).toBeNull();
    });

    it('should parse pawn capture cxd5 (disambiguation by file)', () => {
      const fen = 'rnbqk1nr/pp3ppp/2p1p3/3p4/1bPPP3/8/PP1N1PPP/R1BQKBNR w KQkq - 1 6';
      const pos = fromFen(fen);
      const move = fromSan(pos, 'cxd5');
      expect(move).not.toBeNull();
      expect(toUci(move!)).toBe('c4d5');
    });
  });
});
