/**
 * Chess 960 (Fischer Random) starting position generation using the standard
 * Scharnagl numbering: index 518 is the classical starting position.
 */

// The 10 ways to place two knights on the 5 squares left free after the
// bishops and queen, in Scharnagl order (N5N table).
const KNIGHT_PAIRS: readonly (readonly [number, number])[] = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 2], [1, 3], [1, 4],
  [2, 3], [2, 4],
  [3, 4],
];

/**
 * Returns the Chess 960 starting position FEN for a given index in [0, 959]
 * (Scharnagl numbering — index 518 is the standard starting position).
 */
export function chess960StartingFen(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 959) {
    throw new Error(`Chess 960 index must be an integer in [0, 959], got ${index}`);
  }

  const rank: string[] = new Array(8).fill('');
  let n = index;

  const lightBishop = n % 4;
  n = Math.floor(n / 4);
  rank[lightBishop * 2 + 1] = 'B'; // files b, d, f, h

  const darkBishop = n % 4;
  n = Math.floor(n / 4);
  rank[darkBishop * 2] = 'B'; // files a, c, e, g

  const freeFiles = (): number[] => {
    const files: number[] = [];
    for (let f = 0; f < 8; f++) if (rank[f] === '') files.push(f);
    return files;
  };

  const queen = n % 6;
  n = Math.floor(n / 6);
  rank[freeFiles()[queen]!] = 'Q';

  const [n1, n2] = KNIGHT_PAIRS[n]!;
  const afterQueen = freeFiles();
  rank[afterQueen[n1]!] = 'N';
  rank[afterQueen[n2]!] = 'N';

  const [r1, k, r2] = freeFiles();
  rank[r1!] = 'R';
  rank[k!] = 'K';
  rank[r2!] = 'R';

  const white = rank.join('');
  return `${white.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${white} w KQkq - 0 1`;
}

/**
 * Returns a random Chess 960 starting position FEN.
 * Uses Math.random by default; pass a custom rng for determinism.
 */
export function randomChess960Fen(rng: () => number = Math.random): string {
  return chess960StartingFen(Math.floor(rng() * 960));
}
