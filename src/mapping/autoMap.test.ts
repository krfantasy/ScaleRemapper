import { describe, test, expect } from "vitest";
import { autoMap, randomMap } from "./autoMap";

// 19-EDO as Scale A (cents array). The octave degree (last, 1200¢) is excluded as a candidate.
const EDO19 = [0, 63.158, 126.316, 189.474, 252.632, 315.789, 378.947, 442.105,
  505.263, 568.421, 631.579, 694.737, 757.895, 821.053, 884.211, 947.368,
  1010.526, 1073.684, 1136.842, 1200];

// 12-EDO as Scale B.
const EDO12 = Array.from({ length: 13 }, (_, i) => i * 100); // [0,100,...,1200]

describe("autoMap(aCents, bCents)", () => {
  test("produces one assignment per B-degree (excluding B's period)", () => {
    // B has 13 degrees (0..12); we map degrees 0..11, not 12 (B's period).
    const { mapping } = autoMap(EDO19, EDO12);
    expect(mapping.assignments).toHaveLength(12);
    expect(mapping.assignments.every((a) => a !== null)).toBe(true);
  });

  test("B-degree 0 maps to A-degree 0 (root)", () => {
    const { mapping } = autoMap(EDO19, EDO12);
    expect(mapping.assignments[0]?.aDegree).toBe(0);
  });

  test("B-degree 1 (100¢) maps to nearest A-degree (degree 2, 126.316¢)", () => {
    const { mapping } = autoMap(EDO19, EDO12);
    expect(mapping.assignments[1]?.aDegree).toBe(2);
  });

  test("B-degree 2 (200¢) maps to nearest A-degree (degree 3, 189.474¢)", () => {
    const { mapping } = autoMap(EDO19, EDO12);
    expect(mapping.assignments[2]?.aDegree).toBe(3);
  });

  test("exact tie breaks to lower A-degree", () => {
    // B-degree 6 (600¢) is exactly between A-degree 9 (568.421¢) and 10 (631.579¢)
    const { mapping, ties } = autoMap(EDO19, EDO12);
    expect(mapping.assignments[6]?.aDegree).toBe(9); // lower wins
    const tie = ties.find((t) => t.bDegree === 6);
    expect(tie).toBeDefined();
    expect(tie?.tieAltADegree).toBe(10);
  });

  test("never assigns to A's period (last A-degree, 1200¢)", () => {
    const { mapping } = autoMap(EDO19, EDO12);
    for (const a of mapping.assignments) {
      expect(a?.aDegree).not.toBe(EDO19.length - 1);
    }
  });

  test("collapses: when A is sparser than B, multiple B-degrees map to the same A-degree", () => {
    // A = a 5-note scale (root + 3 entries + period): 0, 150, 400, 800, 1200.
    // Chosen so B-degrees 1 (100¢) and 2 (200¢) both nearest A-degree 1 (150¢) — no ties.
    const sparseA = [0, 150, 400, 800, 1200];
    // B = 12-EDO (degrees 0..11)
    const { mapping } = autoMap(sparseA, EDO12);
    // B-degree 1 (100¢): |100-0|=100, |100-150|=50 → A-degree 1.
    // B-degree 2 (200¢): |200-150|=50, |200-400|=200 → A-degree 1. Collapse.
    expect(mapping.assignments[1]?.aDegree).toBe(1);
    expect(mapping.assignments[2]?.aDegree).toBe(1);
    // Both B-degrees share A-degree 1 — this is the expected collapse, not an error.
    const aDeg1 = mapping.assignments.filter((a) => a?.aDegree === 1);
    expect(aDeg1.length).toBe(2);
  });

  test("works with non-octave B (Bohlen-Pierce-shaped period)", () => {
    // B = 3 evenly-spaced notes over 1901.955¢ (a toy BP-ish scale). period = degree 3.
    const bpB = [0, 1901.955 / 3, (1901.955 / 3) * 2, 1901.955];
    const { mapping } = autoMap(EDO19, bpB);
    expect(mapping.assignments).toHaveLength(3); // B-degrees 0,1,2 (period at 3 excluded)
    expect(mapping.assignments.every((a) => a !== null)).toBe(true);
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
