import type { Collision, Mapping, MappingStats, TieResult } from "./types";

/** Signed deviation for a B-degree: aCents[assignment.aDegree] - bCents[bDegree]. Undefined if unmapped. */
export function computeDeviation(
  mapping: Mapping,
  aCents: number[],
  bCents: number[],
  bDegree: number,
): number | undefined {
  const a = mapping.assignments[bDegree];
  if (!a) return undefined;
  return aCents[a.aDegree] - bCents[bDegree];
}

/** Find all collision groups (A-degrees mapped by >1 B-degree). For A→B this is the
 *  expected "collapse" case when A is sparser than B; flagged, not an error. */
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
 *  Only considers the same candidate set as autoMap: A's degrees EXCEPT the last
 *  (A's period), so a reported tieAltADegree is always a degree autoMap could
 *  actually have chosen. */
export function findTies(mapping: Mapping, aCents: number[], bCents: number[]): TieResult[] {
  const ties: TieResult[] = [];
  // A candidates exclude A's last degree (A's period), matching autoMap.
  const aLast = aCents.length - 1;
  for (let b = 0; b < mapping.assignments.length; b++) {
    const a = mapping.assignments[b];
    if (!a) continue;
    const target = bCents[b];
    const chosenDist = Math.abs(aCents[a.aDegree] - target);
    let alt: number | null = null;
    for (let d = 0; d < aLast; d++) {
      if (d === a.aDegree) continue;
      if (Math.abs(Math.abs(aCents[d] - target) - chosenDist) < 1e-9) {
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
export function computeStats(mapping: Mapping, aCents: number[], bCents: number[]): MappingStats {
  // B's mappable degree count = bCents.length - 1 (B's last degree is its period).
  const bMappable = Math.max(0, bCents.length - 1);
  let mappedCount = 0;
  let totalError = 0;
  let maxError = 0;
  for (let b = 0; b < mapping.assignments.length; b++) {
    const dev = computeDeviation(mapping, aCents, bCents, b);
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
    ties: findTies(mapping, aCents, bCents).length,
  };
}
