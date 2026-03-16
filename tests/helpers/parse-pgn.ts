/**
 * Minimal PGN parser for database replay tests.
 * Parses games into start FEN (when SetUp 1 + FEN) and a list of SAN moves.
 */

export interface ParsedGame {
  /** FEN to start from; undefined means use standard starting position */
  fen: string | undefined;
  /** SAN moves in order */
  moves: string[];
}

const RESULT_TOKENS = new Set(['0-1', '1-0', '1/2-1/2', '*']);
const MOVE_NUMBER_REGEX = /^\d+\.$/;

function isMoveNumber(token: string): boolean {
  return MOVE_NUMBER_REGEX.test(token) || token === '...';
}

/**
 * Parse PGN content into an array of games.
 */
export function parsePgn(pgnContent: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  const blocks = pgnContent.split(/\n(?=\[Event\s)/).filter((b) => b.trim().length > 0);

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim());
    let headerEnd = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.startsWith('[')) headerEnd = i;
      else break;
    }

    const headers: Record<string, string> = {};
    for (let i = 0; i <= headerEnd; i++) {
      const m = lines[i]!.match(/^\[(\w+)\s+"([^"]*)"\]$/);
      if (m) headers[m[1]!] = m[2]!;
    }

    const setUp = headers['SetUp'];
    const fenHeader = headers['FEN'];
    const fen = setUp === '1' && fenHeader ? fenHeader : undefined;

    const moveLines = lines.slice(headerEnd + 1).join(' ');
    const tokens = moveLines.split(/\s+/).filter(Boolean);
    const moves = tokens.filter(
      (t) => !isMoveNumber(t) && !RESULT_TOKENS.has(t)
    );

    games.push({ fen, moves });
  }

  return games;
}
