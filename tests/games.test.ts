import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fromFen, STARTING_FEN } from '../src/fen.ts';
import { fromSan } from '../src/notation.ts';
import { makeMove } from '../src/make-move.ts';
import { parsePgn } from './helpers/parse-pgn.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PGN_PATH = join(__dirname, 'fixtures', 'games.pgn');

describe('fixtures/games.pgn', () => {
  const pgnContent = readFileSync(PGN_PATH, 'utf-8');
  const games = parsePgn(pgnContent);

  it('parses all games from PGN', () => {
    expect(games.length).toBe(6);
  });

  it('replays every move correctly for each game', () => {
    for (let gameIndex = 0; gameIndex < games.length; gameIndex++) {
      const game = games[gameIndex]!;
      const fen = game.fen ?? STARTING_FEN;
      let pos = fromFen(fen);

      for (let moveIndex = 0; moveIndex < game.moves.length; moveIndex++) {
        const san = game.moves[moveIndex]!;
        const move = fromSan(pos, san);
        expect(
          move,
          `Game ${gameIndex + 1}, move ${moveIndex + 1}: fromSan(pos, "${san}") returned null`
        ).not.toBeNull();
        pos = makeMove(pos, move!);
      }
    }
  });
});
