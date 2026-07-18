import { describe, it, expect } from 'vitest';
import { fromFen, STARTING_FEN } from '../src/fen.ts';
import { perft, divide } from '../src/perft.ts';

// Standard suite: positions and node counts from the chessprogramming wiki.
const STANDARD_CASES: [name: string, fen: string, counts: number[]][] = [
  ['starting position', STARTING_FEN, [20, 400, 8902, 197281]],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['position 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['position 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ['position 6', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]],
];

// Chess 960: node counts generated with Stockfish 18 (UCI_Chess960), 2026-07-17.
const CHESS960_CASES: [name: string, fen: string, counts: number[]][] = [
  ['960 start bqnrkbrn', 'bqnrkbrn/pppppppp/8/8/8/8/PPPPPPPP/BQNRKBRN w DGdg - 0 1', [19, 361, 7822, 168643]],
  ['960 start rknnbbqr', 'rknnbbqr/pppppppp/8/8/8/8/PPPPPPPP/RKNNBBQR w AHah - 0 1', [20, 400, 8992, 200559]],
  ['960 start nrkbbnqr', 'nrkbbnqr/pppppppp/8/8/8/8/PPPPPPPP/NRKBBNQR w BHbh - 0 1', [19, 361, 7788, 167387]],
  ['960 rook endgame (castling-rich)', '1rk1r3/8/8/8/8/8/8/1RK1R3 w EBeb - 0 1', [23, 442, 9697, 203452]],
];

for (const [group, cases] of [['Perft - standard', STANDARD_CASES], ['Perft - Chess 960', CHESS960_CASES]] as const) {
  describe(group, () => {
    for (const [name, fen, counts] of cases) {
      for (let depth = 1; depth <= counts.length; depth++) {
        it(`${name} depth ${depth} = ${counts[depth - 1]}`, () => {
          expect(perft(fromFen(fen), depth)).toBe(counts[depth - 1]);
        });
      }
    }
  });
}

describe('divide', () => {
  it('includes the promotion piece in move strings', () => {
    const results = divide(fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1'), 1);
    const promos = results.filter((r) => /^a7a8[qrbn]$/.test(r.move));
    expect(promos.length).toBe(4);
  });
});
