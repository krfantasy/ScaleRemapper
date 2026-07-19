import { displacedCents } from "../mapping/displacement";
import type { Mapping } from "../mapping/types";
import type { LoadedScale } from "./types";

/** Format a cents value as an .scl entry: 6 decimals, trailing zeros stripped, always has a ".". */
export function formatCents(cents: number): string {
  const rounded = Math.round(cents * 1e6) / 1e6;
  let str = rounded.toFixed(6);
  str = str.replace(/0+$/, "").replace(/\.$/, ".0");
  return str;
}

/**
 * Serialize a mapping + A cents + B LoadedScale into a Scala .scl string.
 *
 * Output shape:
 *   - description comment naming A and B
 *   - count = B.degreeCount - 1 (root implicit)
 *   - interior entries (B-degrees 1 .. B.degreeCount-2) =
 *       formatCents(displacedCents(aDegree, b, aCents, bCents, periodA))
 *     — i.e. the A-pitch at its derived octave displacement, so B-10 → A-3+1200
 *     writes "1726.0", not "526.0".
 *   - final entry = scaleB.scale.periodRaw verbatim (B's period/equave)
 *
 * Spec: docs/superpowers/specs/2026-07-20-octave-wrap-design.md §3.5
 */
export function serializeMappingToScl(
  mapping: Mapping,
  aCents: number[],
  bCents: number[],
  periodA: number,
  scaleB: LoadedScale,
  aName: string,
): string {
  const bDegreeCount = scaleB.scale.degrees.length;
  const bMappable = bDegreeCount - 1;
  if (mapping.assignments.length !== bMappable) {
    throw new Error(
      `Mapping length ${mapping.assignments.length} does not match B mappable degree count ${bMappable}.`,
    );
  }
  if (mapping.assignments.some((a) => a === null)) {
    throw new Error("Cannot serialize: not all B-degrees are mapped.");
  }

  const entries: string[] = [];
  for (let b = 1; b < bMappable; b++) {
    const a = mapping.assignments[b]!;
    const sounded = displacedCents(a.aDegree, b, aCents, bCents, periodA);
    entries.push(formatCents(sounded));
  }
  entries.push(scaleB.scale.periodRaw);

  const header = `! Remapped ${aName} onto ${scaleB.name} via Scale Remapper`;
  return [header, bMappable.toString(), ...entries].join("\n");
}
