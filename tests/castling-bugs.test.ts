import { describe, it, expect } from 'vitest';
import { fromFen, toFen } from '../src/fen.ts';
import { getLegalMoves } from '../src/move-gen.ts';
import { makeMove } from '../src/make-move.ts';
import { computeHash } from '../src/zobrist.ts';
import { MoveFlag } from '../src/types.ts';

function castlingMoves(fen: string) {
  return getLegalMoves(fromFen(fen)).filter((m) => m.flag === MoveFlag.Castling);
}

describe('castling path emptiness', () => {
  it('does not castle kingside when the king destination g1 is occupied', () => {
    // Standard-like position: f1 empty, knight on g1
    expect(castlingMoves('rnbqk1nr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK1NR w KQkq - 0 1')).toEqual([]);
  });

  it('does not castle queenside in 960 when a king-path square (c1) is occupied', () => {
    // N c1, R d1 (queenside rook), K f1
    expect(castlingMoves('4k3/8/8/8/8/8/8/2NR1K2 w Q - 0 1')).toEqual([]);
  });

  it('does not castle queenside when a second rook blocks the castling rook path', () => {
    // Rooks a1 + b1, right Q belongs to the outermost rook (a1); b1 blocks a1->d1
    expect(castlingMoves('4k3/8/8/8/8/8/8/RR2K3 w Q - 0 1')).toEqual([]);
  });

  it('does not castle queenside in 960 when the vacating rook discovers an attack on the king', () => {
    // White queenside rook b1 shields the king path from the black rook on a1
    expect(castlingMoves('4k3/8/8/8/8/8/8/rR2K3 w Q - 0 1')).toEqual([]);
  });

  it('still generates both castling moves in a normal position', () => {
    const moves = castlingMoves('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(moves.length).toBe(2);
  });
});

describe('castling onto/from squares shared with the rook (960)', () => {
  it('castles kingside when the rook sits on the king destination (K f1, R g1)', () => {
    const pos = fromFen('4k3/8/8/8/8/8/8/5KR1 w K - 0 1');
    const moves = getLegalMoves(pos).filter((m) => m.flag === MoveFlag.Castling);
    expect(moves.length).toBe(1);
    const after = makeMove(pos, moves[0]!);
    expect(toFen(after)).toBe('4k3/8/8/8/8/8/8/5RK1 b - - 1 1');
    expect(after.hash).toBe(computeHash(after));
  });

  it('castles queenside when the king is already on c1 (king does not move)', () => {
    const pos = fromFen('4k3/8/8/8/8/8/8/R1K5 w Q - 0 1');
    const moves = getLegalMoves(pos).filter((m) => m.flag === MoveFlag.Castling);
    expect(moves.length).toBe(1);
    expect(moves[0]!.from).toBe(moves[0]!.to);
    const after = makeMove(pos, moves[0]!);
    expect(toFen(after)).toBe('4k3/8/8/8/8/8/8/2KR4 b - - 1 1');
    expect(after.hash).toBe(computeHash(after));
  });
});

describe('castling rights bookkeeping', () => {
  it('clears only the kingside right when the kingside rook moves', () => {
    const pos = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const rookMove = getLegalMoves(pos).find((m) => m.from === 7 && m.to === 7 + 8);
    expect(rookMove).toBeDefined();
    const after = makeMove(pos, rookMove!);
    expect(toFen(after)).toContain(' Qkq ');
  });

  it('clears the right when the castling rook is captured', () => {
    // Black rook a8 takes white rook a1
    const pos = fromFen('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');
    const capture = getLegalMoves(pos).find((m) => m.from === 56 && m.to === 0);
    expect(capture).toBeDefined();
    const after = makeMove(pos, capture!);
    expect(toFen(after)).toContain(' Kk ');
  });

  it('does not give castling to a second rook arriving on the back rank', () => {
    // White right K bound to h1. Rook a1 goes to g1 via a-file... instead craft directly:
    // rook on g1 arrived earlier, h1 rook still castles; moving g1 rook keeps the right
    const pos = fromFen('4k3/8/8/8/8/8/8/4K1RR w K - 0 1');
    const moves = getLegalMoves(pos).filter((m) => m.flag === MoveFlag.Castling);
    // g1 (the non-castling rook) blocks the king path, so no castling now
    expect(moves).toEqual([]);
    // but moving the g1 rook away must NOT clear the right of the h1 rook
    const g1Away = getLegalMoves(pos).find((m) => m.from === 6 && m.to === 6 + 16);
    const after = makeMove(pos, g1Away!);
    expect(toFen(after)).toContain(' K ');
  });
});
