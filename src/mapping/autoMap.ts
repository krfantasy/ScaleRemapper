import { findTies } from "./deviation";
import type { Assignment, Mapping, TieResult } from "./types";

export interface AutoMapResult {
  mapping: Mapping;
  ties: TieResult[];
}

/**
 * Nearest-neighbor auto-map: assign each B-degree (except B's period) to the
 * A-degree with cents closest to that B-degree's cents.
 *
 * - A's final degree (the period/octave repeat) is excluded from candidates,
 *   since it is equivalent to the root of the next period.
 * - B's final degree (B's period) is not assigned (it is the structural period
 *   of the output, handled by the serializer, not a degree to map).
 * - Tie-break: on exact equidistance, pick the LOWER A-degree. The losing
 *   candidate is recorded in the returned ties list.
 */
export function autoMap(aCents: number[], bCents: number[]): AutoMapResult {
  // A candidates: all except A's last degree (A's period).
  const aLast = aCents.length - 1;
  const candidates = aCents.slice(0, aLast);

  // B-degrees to map: all except B's last degree (B's period).
  const bLast = bCents.length - 1;

  const assignments: (Assignment | null)[] = [];
  for (let b = 0; b < bLast; b++) {
    const target = bCents[b];
    let bestDeg = 0;
    let bestDist = Infinity;
    for (let d = 0; d < candidates.length; d++) {
      const dist = Math.abs(candidates[d] - target);
      // Strict < so that on exact ties the FIRST (lower) A-degree wins.
      if (dist < bestDist) {
        bestDist = dist;
        bestDeg = d;
      }
    }
    assignments.push({ bDegree: b, aDegree: bestDeg });
  }

  const mapping: Mapping = { assignments };
  const ties = findTies(mapping, aCents, bCents);
  return { mapping, ties };
}

/**
 * Random map: assign each B-degree (except B's period) to a uniformly-random
 * A-degree (A's period excluded as a candidate, same as autoMap). Repeats are
 * allowed, so collapses are common — that's expected and valid (collapses never
 * block export).
 */
export function randomMap(aCents: number[], bCents: number[]): AutoMapResult {
  // Valid A-degrees are 0 .. aCents.length-2 (A's period at the last index is
  // excluded). If A has only its root (length 1) there are no real candidates;
  // clamp to 1 so Math.floor(Math.random() * n) is well-defined — it returns 0,
  // mapping everything to root, matching the "A with only root" degenerate case.
  const aCandidateCount = Math.max(1, aCents.length - 1);
  const bLast = bCents.length - 1;

  const assignments: (Assignment | null)[] = [];
  for (let b = 0; b < bLast; b++) {
    const aDegree = Math.floor(Math.random() * aCandidateCount);
    assignments.push({ bDegree: b, aDegree });
  }

  const mapping: Mapping = { assignments };
  // Ties are coincidental in a random map, but findTies correctly detects any
  // exact equidistance; keep the call for a consistent AutoMapResult shape.
  const ties = findTies(mapping, aCents, bCents);
  return { mapping, ties };
}
