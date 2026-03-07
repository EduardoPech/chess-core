import { describe, it, expect } from 'vitest';
import { fromFen, STARTING_FEN } from '../src/fen.ts';
import { getLegalMoves } from '../src/move-gen.ts';
import { MoveFlag, PieceType } from '../src/types.ts';
import { toUci } from '../src/notation.ts';

function legalUcis(fen: string): string[] {
  return getLegalMoves(fromFen(fen)).map(toUci).sort();
}

function hasUci(fen: string, uci: string): boolean {
  return legalUcis(fen).includes(uci);
}

describe('Move generation', () => {
  it('should generate 20 moves from the starting position', () => {
    const pos = fromFen(STARTING_FEN);
    const moves = getLegalMoves(pos);
    expect(moves.length).toBe(20);
  });

  describe('captures', () => {
    it('should generate pawn captures', () => {
      // White pawn on e4 can capture black pawns on d5 and f5
      const fen = '4k3/8/8/3p1p2/4P3/8/8/4K3 w - - 0 1';
      expect(hasUci(fen, 'e4d5')).toBe(true);
      expect(hasUci(fen, 'e4f5')).toBe(true);
    });

    it('should generate knight captures', () => {
      // White knight on d4 can capture black pawn on e6
      const fen = '4k3/8/4p3/8/3N4/8/8/4K3 w - - 0 1';
      expect(hasUci(fen, 'd4e6')).toBe(true);
    });

    it('should not capture own pieces', () => {
      const fen = '4k3/8/4P3/8/3N4/8/8/4K3 w - - 0 1';
      expect(hasUci(fen, 'd4e6')).toBe(false);
    });
  });

  describe('en passant', () => {
    it('should generate en passant capture for white', () => {
      // White pawn on e5, black just played d7-d5
      const fen = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1';
      const moves = getLegalMoves(fromFen(fen));
      const ep = moves.find((m) => m.flag === MoveFlag.EnPassant);
      expect(ep).toBeDefined();
      expect(toUci(ep!)).toBe('e5d6');
    });

    it('should generate en passant capture for black', () => {
      // Black pawn on d4, white just played e2-e4
      const fen = '4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1';
      const moves = getLegalMoves(fromFen(fen));
      const ep = moves.find((m) => m.flag === MoveFlag.EnPassant);
      expect(ep).toBeDefined();
      expect(toUci(ep!)).toBe('d4e3');
    });
  });

  describe('castling', () => {
    it('should generate white kingside castling', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      expect(hasUci(fen, 'e1g1')).toBe(true);
    });

    it('should generate white queenside castling', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      expect(hasUci(fen, 'e1c1')).toBe(true);
    });

    it('should generate black kingside castling', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1';
      expect(hasUci(fen, 'e8g8')).toBe(true);
    });

    it('should generate black queenside castling', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1';
      expect(hasUci(fen, 'e8c8')).toBe(true);
    });

    it('should not castle through check', () => {
      // Rook on f8 attacks f1, blocking white kingside castling
      const fen = '5r2/8/8/8/8/8/8/R3K2R w KQ - 0 1';
      expect(hasUci(fen, 'e1g1')).toBe(false);
    });

    it('should not castle when in check', () => {
      // Black rook gives check on e-file
      const fen = '4r3/8/8/8/8/8/8/R3K2R w KQ - 0 1';
      expect(hasUci(fen, 'e1g1')).toBe(false);
      expect(hasUci(fen, 'e1c1')).toBe(false);
    });

    it('should not castle when path is blocked', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R2QKB1R w KQkq - 0 1';
      // f1 bishop blocks kingside, d1 queen blocks queenside path is clear
      expect(hasUci(fen, 'e1g1')).toBe(false);
    });
  });

  describe('promotion', () => {
    it('should generate all four promotion types', () => {
      const fen = 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1';
      const moves = getLegalMoves(fromFen(fen));
      const promos = moves.filter((m) => m.flag === MoveFlag.Promotion);
      expect(promos.length).toBe(4);
      const promoTypes = promos.map((m) => m.promotion).sort();
      expect(promoTypes).toEqual([
        PieceType.Knight,
        PieceType.Bishop,
        PieceType.Rook,
        PieceType.Queen,
      ].sort());
    });

    it('should generate capture-promotions', () => {
      // White pawn on e7, black rook on d8
      const fen = '3rk3/4P3/8/8/8/8/8/4K3 w - - 0 1';
      const moves = getLegalMoves(fromFen(fen));
      const capturePromos = moves.filter(
        (m) => m.flag === MoveFlag.Promotion && (m.from & 7) !== (m.to & 7),
      );
      expect(capturePromos.length).toBe(4);
    });
  });

  describe('check evasion', () => {
    it('should only generate legal moves when in check', () => {
      // White king on e1, black rook on e8 gives check
      const fen = '4r3/8/8/8/8/8/8/4K3 w - - 0 1';
      const moves = getLegalMoves(fromFen(fen));
      // King must move off the e-file
      for (const m of moves) {
        expect(m.to & 7).not.toBe(4); // not on e-file
      }
      expect(moves.length).toBeGreaterThan(0);
    });

    it('should allow blocking a check', () => {
      // White king e1, white rook a2, black rook e8 gives check
      const fen = '4r3/8/8/8/8/8/R7/4K3 w - - 0 1';
      const moves = getLegalMoves(fromFen(fen));
      expect(hasUci(fen, 'a2e2')).toBe(true);
    });
  });

  describe('pinned pieces', () => {
    it('should not allow pinned piece to move off pin line', () => {
      // White king e1, white bishop e2, black rook e8 — bishop pinned on e-file
      const fen = '4r3/8/8/8/8/8/4B3/4K3 w - - 0 1';
      const moves = getLegalMoves(fromFen(fen));
      const bishopMoves = moves.filter((m) => m.from === 12); // e2 = square 12
      expect(bishopMoves.length).toBe(0);
    });

    it('should allow pinned piece to move along pin line', () => {
      // White king e1, white rook e4, black rook e8 — rook pinned but can slide on e-file
      const fen = '4r3/8/8/8/4R3/8/8/4K3 w - - 0 1';
      const moves = getLegalMoves(fromFen(fen));
      const rookMoves = moves.filter((m) => m.from === 28); // e4 = square 28
      expect(rookMoves.length).toBeGreaterThan(0);
      for (const m of rookMoves) {
        expect(m.to & 7).toBe(4); // stays on e-file
      }
    });
  });

  describe('double check', () => {
    it('should only allow king moves in double check', () => {
      // Double check: knight on f6 and bishop on b4 both check the king on e8
      const fen = '4k3/8/5N2/8/1B6/8/8/4K3 b - - 0 1';
      const moves = getLegalMoves(fromFen(fen));
      // In double check only the king can move
      for (const m of moves) {
        expect(m.from).toBe(60); // e8 = square 60
      }
      expect(moves.length).toBeGreaterThan(0);
    });
  });
});
