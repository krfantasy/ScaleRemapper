import { destCents } from "../utils/cents";
import { findTies } from "./deviation";
import type { Assignment, Mapping, TieResult } from "./types";

export interface AutoMapResult {
  mapping: Mapping;
  ties: TieResult[];
}

/**
 * Nearest-neighbor auto-map: assign each of the 12 dest keys to the source degree
 * with cents closest to that key's 12-EDO value.
 *
 * - The final source degree (the octave at 1200¢) is excluded from candidates,
 *   since it is equivalent to the root (0¢) of the next octave.
 * - Tie-break: if two candidates are exactly equidistant, pick the LOWER degree.
 *   The losing candidate is recorded in the returned ties list.
 */
export function autoMap(sourceCents: number[]): AutoMapResult {
  // Candidate degrees: all except the last (the octave repeat).
  const last = sourceCents.length - 1;
  const candidates = sourceCents.slice(0, last);

  const assignments: (Assignment | null)[] = [];
  for (let key = 0; key < 12; key++) {
    const target = destCents(key);
    let bestDeg = 0;
    let bestDist = Infinity;
    for (let d = 0; d < candidates.length; d++) {
      const dist = Math.abs(candidates[d] - target);
      // Strict < so that on exact ties the FIRST (lower) degree wins.
      if (dist < bestDist) {
        bestDist = dist;
        bestDeg = d;
      }
    }
    assignments.push({ destKey: key, sourceDegree: bestDeg });
  }

  const mapping: Mapping = { assignments };
  const ties = findTies(mapping, sourceCents);
  return { mapping, ties };
}
