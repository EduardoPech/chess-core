/**
 * Chess 960 (Fischer Random) starting position generation.
 * Back rank: bishops on opposite colors, king between the two rooks.
 */

const DARK_SQUARES = [0, 2, 4, 6]; // files a, c, e, g
const LIGHT_SQUARES = [1, 3, 5, 7]; // files b, d, f, h

function shuffle<T>(array: T[], rng: () => number): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function pick<T>(array: T[], rng: () => number): T {
  return array[Math.floor(rng() * array.length)]!;
}

/**
 * Returns a random valid Chess 960 back rank (first rank for white).
 * Bishops on opposite colors, king between the two rooks.
 */
function randomBackRank(rng: () => number = Math.random): string {
  const darkBishop = pick(DARK_SQUARES, rng);
  const lightBishop = pick(LIGHT_SQUARES, rng);

  const remaining = [0, 1, 2, 3, 4, 5, 6, 7].filter(
    (f) => f !== darkBishop && f !== lightBishop,
  );
  const shuffled = shuffle(remaining, rng);

  const queenPos = shuffled[0]!;
  const knightPositions = [shuffled[1]!, shuffled[2]!];
  const rest = [shuffled[3]!, shuffled[4]!, shuffled[5]!].sort((a, b) => a - b);
  const rook1 = rest[0]!;
  const kingPos = rest[1]!;
  const rook2 = rest[2]!;

  const rank: (string | null)[] = new Array(8).fill(null);
  rank[darkBishop] = 'B';
  rank[lightBishop] = 'B';
  rank[queenPos] = 'Q';
  rank[knightPositions[0]!] = 'N';
  rank[knightPositions[1]!] = 'N';
  rank[rook1] = 'R';
  rank[kingPos] = 'K';
  rank[rook2] = 'R';

  return rank.join('');
}

/**
 * Returns a random Chess 960 starting position FEN.
 * Uses Math.random by default; pass a custom rng for determinism.
 */
export function randomChess960Fen(rng: () => number = Math.random): string {
  const backRank = randomBackRank(rng);
  const blackRank = backRank.toLowerCase();
  return `${backRank}/pppppppp/8/8/8/8/PPPPPPPP/${blackRank} w KQkq - 0 1`;
}

/**
 * Returns the Chess 960 starting position FEN for a given index in [0, 959].
 * Canonical order: positions are enumerated in a fixed order so the same index
 * always yields the same position.
 */
export function chess960StartingFen(index: number): string {
  if (index < 0 || index > 959) {
    throw new Error(`Chess 960 index must be in [0, 959], got ${index}`);
  }
  // Deterministic enumeration: iterate all valid back ranks in a fixed order.
  const backRanks = enumerateChess960BackRanks();
  const backRank = backRanks[index]!;
  const blackRank = backRank.toLowerCase();
  return `${backRank}/pppppppp/8/8/8/8/PPPPPPPP/${blackRank} w KQkq - 0 1`;
}

function enumerateChess960BackRanks(): string[] {
  const result: string[] = [];
  for (const darkBishop of DARK_SQUARES) {
    for (const lightBishop of LIGHT_SQUARES) {
      const rest = [0, 1, 2, 3, 4, 5, 6, 7].filter(
        (f) => f !== darkBishop && f !== lightBishop,
      );
      for (let qi = 0; qi < rest.length; qi++) {
        const queenPos = rest[qi]!;
        const withoutQueen = rest.filter((_, i) => i !== qi);
        for (let ni = 0; ni < withoutQueen.length; ni++) {
          for (let nj = ni + 1; nj < withoutQueen.length; nj++) {
            const knight1 = withoutQueen[ni]!;
            const knight2 = withoutQueen[nj]!;
            const withoutKnights = withoutQueen.filter(
              (_, i) => i !== ni && i !== nj,
            );
            const [r1, k, r2] = withoutKnights.sort((a, b) => a - b);
            const rank: (string | null)[] = new Array(8).fill(null);
            rank[darkBishop] = 'B';
            rank[lightBishop] = 'B';
            rank[queenPos] = 'Q';
            rank[knight1] = 'N';
            rank[knight2] = 'N';
            rank[r1!] = 'R';
            rank[k!] = 'K';
            rank[r2!] = 'R';
            result.push(rank.join(''));
          }
        }
      }
    }
  }
  return result;
}
