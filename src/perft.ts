import type { Position } from './types.ts';
import { getLegalMoves } from './move-gen.ts';
import { makeMove } from './make-move.ts';

// ---------------------------------------------------------------------------
// Perft: count leaf nodes at a given depth
// ---------------------------------------------------------------------------

export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;

  const moves = getLegalMoves(pos);

  if (depth === 1) return moves.length;

  let nodes = 0;
  for (const move of moves) {
    const newPos = makeMove(pos, move);
    nodes += perft(newPos, depth - 1);
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Divide: perft broken down by first move (useful for debugging)
// ---------------------------------------------------------------------------

export interface DivideResult {
  move: string;
  nodes: number;
}

export function divide(pos: Position, depth: number): DivideResult[] {
  const moves = getLegalMoves(pos);
  const results: DivideResult[] = [];

  for (const move of moves) {
    const newPos = makeMove(pos, move);
    const nodes = depth <= 1 ? 1 : perft(newPos, depth - 1);
    const f = move.from & 7;
    const r = move.from >> 3;
    const tf = move.to & 7;
    const tr = move.to >> 3;
    const moveStr =
      String.fromCharCode(97 + f) +
      (r + 1).toString() +
      String.fromCharCode(97 + tf) +
      (tr + 1).toString();
    results.push({ move: moveStr, nodes });
  }

  return results.sort((a, b) => a.move.localeCompare(b.move));
}
