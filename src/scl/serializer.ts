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
 *   - interior entries (B-degrees 1 .. B.degreeCount-2) = formatCents(aCents[assignment.aDegree])
 *   - final entry = scaleB.scale.periodRaw verbatim (B's period/equave)
 *
 * Duplicate entries from collapses are valid and preserved.
 */
export function serializeMappingToScl(
  mapping: Mapping,
  aCents: number[],
  scaleB: LoadedScale,
  aName: string,
): string {
  const bDegreeCount = scaleB.scale.degrees.length;
  // Mappable B-degrees = bDegreeCount - 1 (exclude B's period, the last degree).
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
  // Interior entries: B-degrees 1 .. bMappable-1 (B-degree 0 is the implicit root).
  for (let b = 1; b < bMappable; b++) {
    const a = mapping.assignments[b]!;
    entries.push(formatCents(aCents[a.aDegree]));
  }
  // Final entry: B's period, verbatim.
  entries.push(scaleB.scale.periodRaw);

  const header = `! Remapped ${aName} onto ${scaleB.name} via Scale Remapper`;
  return [header, bMappable.toString(), ...entries].join("\n");
}
