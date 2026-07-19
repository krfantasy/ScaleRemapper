/**
 * Octave-wrap helpers for A→B mapping.
 *
 * When Scale B's period is longer than Scale A's, a B-degree may be nearest to
 * an A-pitch at an integer multiple of A's period (e.g. B at 1729¢ vs A at
 * 526¢ — A's pitch one octave up, 1726¢, is 3¢ away; A's pitch within one
 * period, 526¢, is 1203¢ away). The displacement `n` is DERIVED from the
 * assignment + cents, never stored on the Assignment itself.
 *
 * Spec: docs/superpowers/specs/2026-07-20-octave-wrap-design.md §3.1
 */

/** The integer n such that aCents[aDegree] + n·periodA is nearest to
 *  bCents[bDegree]. Returns 0 when periodA is degenerate (A is root-only). */
export function octaveDisplacement(
  aDegree: number,
  bDegree: number,
  aCents: number[],
  bCents: number[],
  periodA: number,
): number {
  if (periodA === 0) return 0;
  const n = Math.round((bCents[bDegree] - aCents[aDegree]) / periodA);
  // Math.round of a tiny negative value yields -0; normalize to canonical +0
  // so "no displacement" is always a predictable value for downstream consumers.
  return n === 0 ? 0 : n;
}

/** The sounded A-pitch for a (bDegree, aDegree) assignment, after octave wrapping.
 *  Pure; safe to call on any assignment regardless of origin (autoMap, manual, random). */
export function displacedCents(
  aDegree: number,
  bDegree: number,
  aCents: number[],
  bCents: number[],
  periodA: number,
): number {
  const n = octaveDisplacement(aDegree, bDegree, aCents, bCents, periodA);
  return aCents[aDegree] + n * periodA;
}
