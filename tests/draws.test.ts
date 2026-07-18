import { describe, it, expect } from 'vitest';
import { fromFen, STARTING_FEN } from '../src/fen.ts';
import { makeMove } from '../src/make-move.ts';
import { fromSan } from '../src/notation.ts';
import { countRepetitions, isThreefoldRepetition, getGameResult } from '../src/validation.ts';
import { GameResult, DrawReason } from '../src/types.ts';
import type { Position } from '../src/types.ts';

function play(fenOrPos: string | Position, sans: string[]): { pos: Position; history: bigint[] } {
  let pos = typeof fenOrPos === 'string' ? fromFen(fenOrPos) : fenOrPos;
  const history: bigint[] = [pos.hash];
  for (const san of sans) {
    const move = fromSan(pos, san);
    if (!move) throw new Error(`illegal SAN in test: ${san}`);
    pos = makeMove(pos, move);
    history.push(pos.hash);
  }
  return { pos, history };
}

describe('repetition detection', () => {
  it('counts occurrences of a hash in a history', () => {
    expect(countRepetitions(5n, [1n, 5n, 2n, 5n])).toBe(2);
    expect(countRepetitions(9n, [])).toBe(0);
  });

  it('detects threefold repetition after knight shuffles', () => {
    const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
    const once = play(STARTING_FEN, shuffle);
    expect(isThreefoldRepetition(once.pos, once.history)).toBe(false);

    const twice = play(STARTING_FEN, [...shuffle, ...shuffle]);
    expect(isThreefoldRepetition(twice.pos, twice.history)).toBe(true);
  });

  it('distinguishes positions that differ only in castling rights', () => {
    // Moving a rook out and back loses a castling right, so it is NOT a repetition
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const { pos, history } = play(fen, ['Rb1', 'Rb8', 'Ra1', 'Ra8']);
    expect(countRepetitions(pos.hash, history)).toBe(1);
  });
});

describe('getGameResult', () => {
  it('reports checkmate for the side that delivered it', () => {
    // Fool's mate final position, white to move and mated
    const mated = fromFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(getGameResult(mated)).toEqual({ result: GameResult.BlackWins });

    const { pos } = play(STARTING_FEN, ['f3', 'e5', 'g4', 'Qh4#']);
    expect(getGameResult(pos)).toEqual({ result: GameResult.BlackWins });
  });

  it('reports stalemate', () => {
    const pos = fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(getGameResult(pos)).toEqual({ result: GameResult.Draw, drawReason: DrawReason.Stalemate });
  });

  it('reports insufficient material (K vs K)', () => {
    const pos = fromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(getGameResult(pos)).toEqual({ result: GameResult.Draw, drawReason: DrawReason.InsufficientMaterial });
  });

  it('reports the fifty-move rule', () => {
    const pos = fromFen('4k3/8/8/8/8/8/8/R3K3 w - - 100 80');
    expect(getGameResult(pos)).toEqual({ result: GameResult.Draw, drawReason: DrawReason.FiftyMoveRule });
  });

  it('reports threefold repetition when a history is provided', () => {
    const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
    const { pos, history } = play(STARTING_FEN, [...shuffle, ...shuffle]);
    expect(getGameResult(pos, history)).toEqual({ result: GameResult.Draw, drawReason: DrawReason.ThreefoldRepetition });
    expect(getGameResult(pos)).toEqual({ result: GameResult.InProgress });
  });

  it('reports an ongoing game', () => {
    expect(getGameResult(fromFen(STARTING_FEN))).toEqual({ result: GameResult.InProgress });
  });
});
