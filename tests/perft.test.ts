import { describe, it, expect } from 'vitest';
import { fromFen, STARTING_FEN } from '../src/fen.ts';
import { perft } from '../src/perft.ts';

describe('Perft - starting position', () => {
  it('depth 1 should return 20', () => {
    const pos = fromFen(STARTING_FEN);
    expect(perft(pos, 1)).toBe(20);
  });

  it('depth 2 should return 400', () => {
    const pos = fromFen(STARTING_FEN);
    expect(perft(pos, 2)).toBe(400);
  });

  // These are slower -- enable when move gen is complete
  it.skip('depth 3 should return 8902', () => {
    const pos = fromFen(STARTING_FEN);
    expect(perft(pos, 3)).toBe(8902);
  });

  it.skip('depth 4 should return 197281', () => {
    const pos = fromFen(STARTING_FEN);
    expect(perft(pos, 4)).toBe(197281);
  });
});

describe('Perft - Kiwipete', () => {
  const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';

  it.skip('depth 1 should return 48', () => {
    const pos = fromFen(KIWIPETE);
    expect(perft(pos, 1)).toBe(48);
  });

  it.skip('depth 2 should return 2039', () => {
    const pos = fromFen(KIWIPETE);
    expect(perft(pos, 2)).toBe(2039);
  });
});
