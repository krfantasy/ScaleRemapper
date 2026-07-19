import { displacedCents, TIE_EPSILON } from "./displacement";
import type { Collision, Mapping, MappingStats, TieResult } from "./types";

/** Signed deviation for a B-degree: (aCents[aDegree] + n·periodA) − bCents[bDegree],
 *  where n is the derived octave displacement. Undefined if unmapped.
 *  Spec: docs/superpowers/specs/2026-07-20-octave-wrap-design.md §3.3 */
export function computeDeviation(
  mapping: Mapping,
  aCents: number[],
  bCents: number[],
  periodA: number,
  bDegree: number,
): number | undefined {
  const a = mapping.assignments[bDegree];
  if (!a) return undefined;
  return displacedCents(a.aDegree, bDegree, aCents, bCents, periodA) - bCents[bDegree];
}

/** Find all collision groups (A-degrees mapped by >1 B-degree). For A→B this is the
 *  expected "collapse" case when A is sparser than B; flagged, not an error.
 *  NOTE: collisions are by A-degree INDEX, regardless of octave displacement —
 *  two B-degrees mapping to A-3 at different octaves still count as a collapse
 *  on A-3. */
export function findCollisions(mapping: Mapping): Collision[] {
  const byDegree = new Map<number, number[]>();
  for (const a of mapping.assignments) {
    if (!a) continue;
    const arr = byDegree.get(a.aDegree) ?? [];
    arr.push(a.bDegree);
    byDegree.set(a.aDegree, arr);
  }
  const collisions: Collision[] = [];
  for (const [aDegree, bDegrees] of byDegree) {
    if (bDegrees.length > 1) collisions.push({ aDegree, bDegrees });
  }
  return collisions.sort((a, b) => a.aDegree - b.aDegree);
}

/** Find B-degrees whose chosen A-degree has an equidistant alternative in A.
 *  Considers octave-displaced candidates (aCents[k_alt] + n_alt·periodA) and
 *  flags any exact-equidistant alternative where k_alt ≠ k_chosen. Same-k
 *  cross-octave equidistance is silently resolved (per spec §3.4). */
export function findTies(
  mapping: Mapping,
  aCents: number[],
  bCents: number[],
  periodA: number,
): TieResult[] {
  const ties: TieResult[] = [];
  const aLast = aCents.length - 1;
  for (let b = 0; b < mapping.assignments.length; b++) {
    const a = mapping.assignments[b];
    if (!a) continue;
    const target = bCents[b];
    const chosenSounded = displacedCents(a.aDegree, b, aCents, bCents, periodA);
    const chosenDist = Math.abs(chosenSounded - target);
    let alt: number | null = null;
    for (let d = 0; d < aLast; d++) {
      if (d === a.aDegree) continue;   // same-k cross-octave ties are silently dropped
      const altSounded = displacedCents(d, b, aCents, bCents, periodA);
      if (Math.abs(Math.abs(altSounded - target) - chosenDist) < TIE_EPSILON) {
        alt = d;
        break;
      }
    }
    if (alt !== null) {
      ties.push({ bDegree: b, chosenADegree: a.aDegree, tieAltADegree: alt });
    }
  }
  return ties;
}

/** Compute aggregate mapping stats. `collapses` = B-degrees involved in any collision. */
export function computeStats(
  mapping: Mapping,
  aCents: number[],
  bCents: number[],
  periodA: number,
): MappingStats {
  const bMappable = Math.max(0, bCents.length - 1);
  let mappedCount = 0;
  let totalError = 0;
  let maxError = 0;
  for (let b = 0; b < mapping.assignments.length; b++) {
    const dev = computeDeviation(mapping, aCents, bCents, periodA, b);
    if (dev === undefined) continue;
    mappedCount++;
    const abs = Math.abs(dev);
    totalError += abs;
    if (abs > maxError) maxError = abs;
  }
  const collisions = findCollisions(mapping);
  const collapses = collisions.reduce((sum, c) => sum + c.bDegrees.length, 0);
  return {
    mappedCount,
    unmappedCount: bMappable - mappedCount,
    collapses,
    avgError: mappedCount > 0 ? totalError / mappedCount : 0,
    maxError,
    collisions: collisions.length,
    ties: findTies(mapping, aCents, bCents, periodA).length,
  };
}
