import { destCents } from "../utils/cents";
import type { Collision, Mapping, MappingStats, TieResult } from "./types";

/** Signed deviation for a dest key: sourceCents[mapping] − destCents[key]. Undefined if unmapped. */
export function computeDeviation(mapping: Mapping, sourceCents: number[], destKey: number): number | undefined {
  const a = mapping.assignments[destKey];
  if (!a) return undefined;
  return sourceCents[a.sourceDegree] - destCents(destKey);
}

/** Find all collision groups (source degrees mapped by >1 dest key). */
export function findCollisions(mapping: Mapping): Collision[] {
  const byDegree = new Map<number, number[]>();
  for (const a of mapping.assignments) {
    if (!a) continue;
    const arr = byDegree.get(a.sourceDegree) ?? [];
    arr.push(a.destKey);
    byDegree.set(a.sourceDegree, arr);
  }
  const collisions: Collision[] = [];
  for (const [sourceDegree, destKeys] of byDegree) {
    if (destKeys.length > 1) collisions.push({ sourceDegree, destKeys });
  }
  return collisions.sort((a, b) => a.sourceDegree - b.sourceDegree);
}

/**
 * Find dest keys whose chosen source degree has an equidistant alternative.
 * A tie exists when two source degrees are exactly equidistant from the dest key.
 */
export function findTies(mapping: Mapping, sourceCents: number[]): TieResult[] {
  const ties: TieResult[] = [];
  for (let key = 0; key < 12; key++) {
    const a = mapping.assignments[key];
    if (!a) continue;
    const target = destCents(key);
    const chosenDist = Math.abs(sourceCents[a.sourceDegree] - target);
    // Find another degree at equal distance
    let alt: number | null = null;
    for (let d = 0; d < sourceCents.length; d++) {
      if (d === a.sourceDegree) continue;
      if (Math.abs(Math.abs(sourceCents[d] - target) - chosenDist) < 1e-9) {
        alt = d;
        break;
      }
    }
    if (alt !== null) {
      ties.push({ destKey: key, chosenDegree: a.sourceDegree, tieAltDegree: alt });
    }
  }
  return ties;
}

/** Compute aggregate mapping stats. */
export function computeStats(mapping: Mapping, sourceCents: number[]): MappingStats {
  let mappedCount = 0;
  let totalError = 0;
  let maxError = 0;
  for (let key = 0; key < 12; key++) {
    const dev = computeDeviation(mapping, sourceCents, key);
    if (dev === undefined) continue;
    mappedCount++;
    const abs = Math.abs(dev);
    totalError += abs;
    if (abs > maxError) maxError = abs;
  }
  return {
    mappedCount,
    unmappedCount: 12 - mappedCount,
    avgError: mappedCount > 0 ? totalError / mappedCount : 0,
    maxError,
    collisions: findCollisions(mapping).length,
    ties: findTies(mapping, sourceCents).length,
  };
}
