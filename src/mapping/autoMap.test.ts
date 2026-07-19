import { describe, test, expect } from "vitest";
import { autoMap, randomMap } from "./autoMap";

// 19-EDO as Scale A (cents array). The octave degree (last, 1200¢) is excluded as a candidate.
const EDO19 = [0, 63.158, 126.316, 189.474, 252.632, 315.789, 378.947, 442.105,
  505.263, 568.421, 631.579, 694.737, 757.895, 821.053, 884.211, 947.368,
  1010.526, 1073.684, 1136.842, 1200];

// 12-EDO as Scale B.
const EDO12 = Array.from({ length: 13 }, (_, i) => i * 100); // [0,100,...,1200]

describe("autoMap(aCents, bCents, periodA)", () => {
  test("produces one assignment per B-degree (excluding B's period)", () => {
    const { mapping } = autoMap(EDO19, EDO12, 1200);
    expect(mapping.assignments).toHaveLength(12);
    expect(mapping.assignments.every((a) => a !== null)).toBe(true);
  });

  test("B-degree 0 maps to A-degree 0 (root)", () => {
    const { mapping } = autoMap(EDO19, EDO12, 1200);
    expect(mapping.assignments[0]?.aDegree).toBe(0);
  });

  test("B-degree 1 (100¢) maps to nearest A-degree (degree 2, 126.316¢)", () => {
    const { mapping } = autoMap(EDO19, EDO12, 1200);
    expect(mapping.assignments[1]?.aDegree).toBe(2);
  });

  test("B-degree 2 (200¢) maps to nearest A-degree (degree 3, 189.474¢)", () => {
    const { mapping } = autoMap(EDO19, EDO12, 1200);
    expect(mapping.assignments[2]?.aDegree).toBe(3);
  });

  test("exact tie breaks to lower A-degree", () => {
    const { mapping, ties } = autoMap(EDO19, EDO12, 1200);
    expect(mapping.assignments[6]?.aDegree).toBe(9); // lower wins
    const tie = ties.find((t) => t.bDegree === 6);
    expect(tie).toBeDefined();
    expect(tie?.tieAltADegree).toBe(10);
  });

  test("never assigns to A's period (last A-degree, 1200¢)", () => {
    const { mapping } = autoMap(EDO19, EDO12, 1200);
    for (const a of mapping.assignments) {
      expect(a?.aDegree).not.toBe(EDO19.length - 1);
    }
  });

  test("collapses: when A is sparser than B, multiple B-degrees map to the same A-degree", () => {
    const sparseA = [0, 150, 400, 800, 1200];
    const { mapping } = autoMap(sparseA, EDO12, 1200);
    expect(mapping.assignments[1]?.aDegree).toBe(1);
    expect(mapping.assignments[2]?.aDegree).toBe(1);
    const aDeg1 = mapping.assignments.filter((a) => a?.aDegree === 1);
    expect(aDeg1.length).toBe(2);
  });

  test("works with non-octave B (Bohlen-Pierce-shaped period)", () => {
    const bpB = [0, 1901.955 / 3, (1901.955 / 3) * 2, 1901.955];
    const { mapping } = autoMap(EDO19, bpB, 1200);
    expect(mapping.assignments).toHaveLength(3);
    expect(mapping.assignments.every((a) => a !== null)).toBe(true);
  });

  test("regression: same-period (A period === B period) produces n=0 everywhere", () => {
    const { mapping } = autoMap(EDO19, EDO12, 1200);
    for (let b = 0; b < EDO12.length - 1; b++) {
      const target = EDO12[b];
      let nearestK = 0;
      let nearestDist = Infinity;
      for (let k = 0; k < EDO19.length - 1; k++) {
        const d = Math.abs(EDO19[k] - target);
        if (d < nearestDist) { nearestDist = d; nearestK = k; }
      }
      expect(mapping.assignments[b]?.aDegree).toBe(nearestK);
    }
  });

  test("octave wrap: Thai Ranat → 11 ED3 finds true nearest across octaves", () => {
    const A = [0, 161, 346, 526, 686, 862, 1028.571, 1200];
    const B = [0, 172.905, 345.810, 518.715, 691.620, 864.525, 1037.430,
      1210.335, 1383.240, 1556.145, 1729.050, 1901.955];
    const { mapping } = autoMap(A, B, 1200);
    expect(mapping.assignments).toHaveLength(11);
    expect(mapping.assignments[0]?.aDegree).toBe(0);
    expect(mapping.assignments[1]?.aDegree).toBe(1);
    expect(mapping.assignments[2]?.aDegree).toBe(2);
    expect(mapping.assignments[3]?.aDegree).toBe(3);
    expect(mapping.assignments[4]?.aDegree).toBe(4);
    expect(mapping.assignments[5]?.aDegree).toBe(5);
    expect(mapping.assignments[6]?.aDegree).toBe(6);
    expect(mapping.assignments[7]?.aDegree).toBe(0);   // B-7 → A-0 + 1oct
    expect(mapping.assignments[8]?.aDegree).toBe(1);   // B-8 → A-1 + 1oct
    expect(mapping.assignments[9]?.aDegree).toBe(2);   // B-9 → A-2 + 1oct
    expect(mapping.assignments[10]?.aDegree).toBe(3);  // B-10 → A-3 + 1oct
  });

  test("octave wrap: max deviation stays small (< 25¢) for Thai Ranat → 11 ED3", () => {
    const A = [0, 161, 346, 526, 686, 862, 1028.571, 1200];
    const B = [0, 172.905, 345.810, 518.715, 691.620, 864.525, 1037.430,
      1210.335, 1383.240, 1556.145, 1729.050, 1901.955];
    const { mapping } = autoMap(A, B, 1200);
    let maxDev = 0;
    for (let b = 0; b < B.length - 1; b++) {
      const a = mapping.assignments[b]!;
      const n = Math.round((B[b] - A[a.aDegree]) / 1200);
      const dev = Math.abs(A[a.aDegree] + n * 1200 - B[b]);
      if (dev > maxDev) maxDev = dev;
    }
    expect(maxDev).toBeLessThan(25);
  });

  test("periodA = 0 (A root-only): every B-degree maps to A-0, no throw", () => {
    const { mapping } = autoMap([0], EDO12, 0);
    expect(mapping.assignments.every((a) => a?.aDegree === 0)).toBe(true);
  });

  test("tie-break: on exact equidistance, picks the candidate with the LOWER sounded cents (not the lower k)", () => {
    // Constructed so that two A-degrees are exactly equidistant from a B-degree,
    // AND the lower-sounded candidate sits at the HIGHER k. The v2 (pre-fix)
    // tie-break used strict <, which would pick the lower-k candidate by
    // iteration order; the spec §3.2 mandates lowest sounded cents.
    //
    // aCents = [0, 800, 400, 1200] (deliberately non-monotonic; periodA = 1200).
    // B-degree 1 at 600¢: A-1+0oct = 800 (dist 200); A-2+0oct = 400 (dist 200).
    // Exact tie. A-2 (400¢) has lower sounded cents than A-1 (800¢), so per
    // spec B-1 must map to A-2.
    const aCents = [0, 800, 400, 1200];
    const bCents = [0, 600, 1200];
    const { mapping } = autoMap(aCents, bCents, 1200);
    expect(mapping.assignments[1]?.aDegree).toBe(2);
  });
});

describe("randomMap(aCents, bCents)", () => {
  // Structural validity check used across the random tests: one assignment per
  // non-period B-degree, no nulls, A-degree never A's period (last index).
  const checkShape = (aCents: number[], bCents: number[]) => {
    const { mapping } = randomMap(aCents, bCents);
    expect(mapping.assignments).toHaveLength(bCents.length - 1);
    expect(mapping.assignments.every((a) => a !== null)).toBe(true);
    const aLast = aCents.length - 1;
    for (const a of mapping.assignments) {
      expect(a!.aDegree).toBeGreaterThanOrEqual(0);
      expect(a!.aDegree).toBeLessThan(aLast);
    }
    return mapping;
  };

  test("produces one assignment per B-degree (excluding B's period), all valid", () => {
    checkShape(EDO19, EDO12);
  });

  test("never assigns to A's period (last A-degree)", () => {
    // Run several times since it's random.
    for (let i = 0; i < 10; i++) checkShape(EDO19, EDO12);
  });

  test("actually varies across runs (proves it's random, not a constant)", () => {
    // Collect the A-degree chosen for B-degree 0 across many runs.
    const choicesForB0 = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const { mapping } = randomMap(EDO19, EDO12);
      choicesForB0.add(mapping.assignments[0]!.aDegree);
    }
    // With 19 candidates and 50 trials, seeing only 1 distinct value would be
    // astronomically unlikely unless the RNG were broken/constant.
    expect(choicesForB0.size).toBeGreaterThan(1);
  });

  test("works with non-octave B (Bohlen-Pierce-shaped period)", () => {
    const bpB = [0, 1901.955 / 3, (1901.955 / 3) * 2, 1901.955];
    for (let i = 0; i < 5; i++) checkShape(EDO19, bpB);
  });

  test("handles degenerate A (root-only): everything maps to root, no throw", () => {
    // A has only its root (aCents.length === 1). randomMap must not crash; it
    // maps every B-degree to A-degree 0 (the only valid index after clamping).
    const rootOnlyA = [0];
    const { mapping } = randomMap(rootOnlyA, EDO12);
    expect(mapping.assignments).toHaveLength(EDO12.length - 1);
    expect(mapping.assignments.every((a) => a?.aDegree === 0)).toBe(true);
  });
});
