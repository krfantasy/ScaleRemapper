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
