import { findTies } from "./deviation";
import type { Assignment, Mapping, TieResult } from "./types";

export interface AutoMapResult {
  mapping: Mapping;
  ties: TieResult[];
}

/**
 * Nearest-neighbor auto-map with octave wrapping: assign each B-degree (except
 * B's period) to the A-degree whose pitch — at any integer multiple of A's
 * period — is closest to that B-degree's cents.
 *
 * - A's final degree (the period/octave repeat) is excluded from candidates,
 *   since it is equivalent to the root of the next period.
 * - B's final degree (B's period) is not assigned.
 * - For each (b, k) the optimal octave displacement is closed-form:
 *   n_k = round((bCents[b] - aCents[k]) / periodA). When periodA is 0 (A is
 *   root-only), n_k = 0 and the search reduces to the v2 single-period case.
 * - Tie-break: on exact equidistance between two (k, n) pairs, pick the one
 *   with the lower sounded cents (aCents[k] + n*periodA). Deterministic.
 *
 * Spec: docs/superpowers/specs/2026-07-20-octave-wrap-design.md §3.2
 */
export function autoMap(aCents: number[], bCents: number[], periodA: number): AutoMapResult {
  const aLast = aCents.length - 1;
  const candidates = aCents.slice(0, aLast);   // exclude A's period
  const bLast = bCents.length - 1;

  const assignments: (Assignment | null)[] = [];
  for (let b = 0; b < bLast; b++) {
    const target = bCents[b];
    let bestDeg = 0;
    let bestSounded = Infinity;
    let bestDist = Infinity;
    for (let k = 0; k < candidates.length; k++) {
      const n = periodA === 0 ? 0 : Math.round((target - candidates[k]) / periodA);
      const sounded = candidates[k] + n * periodA;
      const dist = Math.abs(sounded - target);
      // Spec §3.2 tie-break: on exact equidistance, pick the candidate with the
      // LOWER sounded cents. sounded(k) = aCents[k] + round((target-aCents[k])/P)·P
      // is NOT monotonic in k (n_k varies per k), so we can't rely on iteration
      // order — compare sounded explicitly. Use a tiny epsilon for the dist
      // comparison so float noise doesn't defeat the tie detection.
      const EPSILON = 1e-9;
      if (dist < bestDist - EPSILON) {
        bestDist = dist;
        bestDeg = k;
        bestSounded = sounded;
      } else if (Math.abs(dist - bestDist) < EPSILON && sounded < bestSounded) {
        // Exact tie on distance — break by lowest sounded cents.
        bestDeg = k;
        bestSounded = sounded;
      }
    }
    assignments.push({ bDegree: b, aDegree: bestDeg });
  }

  const mapping: Mapping = { assignments };
  const ties = findTies(mapping, aCents, bCents, periodA);
  return { mapping, ties };
}

/**
 * Random map: assign each B-degree (except B's period) to a uniformly-random
 * A-degree (A's period excluded as a candidate, same as autoMap). Repeats are
 * allowed, so collapses are common — that's expected and valid (collapses never
 * block export).
 */
export function randomMap(aCents: number[], bCents: number[], periodA = 0): AutoMapResult {
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
  const ties = findTies(mapping, aCents, bCents, periodA);
  return { mapping, ties };
}
