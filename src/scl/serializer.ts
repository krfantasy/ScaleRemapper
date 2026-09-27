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
 * Fold NEGATIVE sounded cents up into [0, period): floor-based modulo, so a
 * downward displacement like -100 folds to period-100 (e.g. 1100 for an octave
 * period). Negative entries are invalid Scala — synths reject them.
 * Non-negative values pass through UNCHANGED, including values >= period (the
 * sparse-A octave wrap legitimately sounds above periodB and spec §3.5 writes
 * displaced values verbatim; folding those would collapse degrees onto lower
 * pitches). Folding is an export-format concern only; the internal
 * displacedCents value stays raw.
 */
function foldCents(cents: number, period: number): number {
  if (cents >= 0) return cents;
  const folded = cents - period * Math.floor(cents / period);
  // Float residue can land the remainder a hair outside [0, period); normalize
  // the noise so an entry is never negative.
  return folded <= 0 ? 0 : folded;
}

/**
 * Serialize a mapping + A cents + B LoadedScale into a Scala .scl string.
 *
 * Output shape:
 *   - description comment naming A and B
 *   - count = B.degreeCount - 1 (root implicit)
 *   - interior entries (B-degrees 1 .. B.degreeCount-2) =
 *       formatCents(foldCents(displacedCents(aDegree, b, aCents, bCents, periodA), periodB))
 *     — i.e. the A-pitch at its derived octave displacement, so B-10 → A-3+1200
 *     writes "1726.0", not "526.0" — with negative sounded cents folded into
 *     [0, periodB) so downward displacements still export as valid non-negative
 *     Scala entries (e.g. -100 → 1100 for an octave period).
 *   - final entry = scaleB.scale.periodRaw verbatim (B's period/equave)
 *
 * Per the 2026-07-20 octave-wrap design.
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

  // periodB = scale B's period in cents (its last degree; the fold target).
  const periodB = scaleB.scale.degrees[bDegreeCount - 1].cents;
  const entries: string[] = [];
  for (let b = 1; b < bMappable; b++) {
    const a = mapping.assignments[b]!;
    const sounded = displacedCents(a.aDegree, b, aCents, bCents, periodA);
    entries.push(formatCents(foldCents(sounded, periodB)));
  }
  entries.push(scaleB.scale.periodRaw);

  const header = `! Remapped ${aName} onto ${scaleB.name} via Scale Remapper`;
  return [header, bMappable.toString(), ...entries].join("\n");
}
