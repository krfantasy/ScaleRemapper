import { describe, test, expect } from "vitest";
import { octaveDisplacement, displacedCents } from "./displacement";

// Thai Ranat-like A (period 1200¢) and 11-ED3-like B (period 1901.955¢) used in
// the spec's motivating example.
const A = [0, 161, 346, 526, 686, 862, 1028.571, 1200];
const B = [0, 172.905, 345.810, 518.715, 691.620, 864.525, 1037.430,
  1210.335, 1383.240, 1556.145, 1729.050, 1901.955];
const PERIOD_A = 1200;

describe("octaveDisplacement(aDegree, bDegree, aCents, bCents, periodA)", () => {
  test("returns 0 when the B-degree is within one period of the A-degree", () => {
    // B-3 (518.7¢) vs A-3 (526¢): same octave.
    expect(octaveDisplacement(3, 3, A, B, PERIOD_A)).toBe(0);
  });

  test("returns +1 when the B-degree is one octave above the A-degree", () => {
    // B-7 (1210.3¢) vs A-0 (0¢): (1210.3 − 0) / 1200 = 1.0086 → rounds to 1.
    expect(octaveDisplacement(0, 7, A, B, PERIOD_A)).toBe(1);
    // B-10 (1729.05¢) vs A-3 (526¢): (1729.05 − 526) / 1200 = 1.0025 → 1.
    expect(octaveDisplacement(3, 10, A, B, PERIOD_A)).toBe(1);
  });

  test("returns -1 when the B-degree is one octave below the A-degree", () => {
    // Construct: B-degree at 100¢, A-degree at 1100¢. (100 − 1100)/1200 = -0.833 → -1.
    const aCents = [0, 1100, 1200];
    const bCents = [0, 100, 1200];
    expect(octaveDisplacement(1, 1, aCents, bCents, 1200)).toBe(-1);
  });

  test("returns 0 when periodA is 0 (A is root-only, no wrap possible)", () => {
    // Guards against division by zero. A = [0], so periodA = 0.
    expect(octaveDisplacement(0, 5, [0], B, 0)).toBe(0);
  });
});

describe("displacedCents(aDegree, bDegree, aCents, bCents, periodA)", () => {
  test("returns aCents[aDegree] when displacement is 0", () => {
    expect(displacedCents(3, 3, A, B, PERIOD_A)).toBe(526);
  });

  test("returns aCents[aDegree] + n*periodA when displaced up", () => {
    // B-10 → A-3 + 1 octave = 526 + 1200 = 1726.
    expect(displacedCents(3, 10, A, B, PERIOD_A)).toBe(1726);
    // B-7 → A-0 + 1 octave = 0 + 1200 = 1200.
    expect(displacedCents(0, 7, A, B, PERIOD_A)).toBe(1200);
  });

  test("returns aCents[aDegree] + n*periodA when displaced down", () => {
    const aCents = [0, 1100, 1200];
    const bCents = [0, 100, 1200];
    // B-1 → A-1 - 1 octave = 1100 - 1200 = -100.
    expect(displacedCents(1, 1, aCents, bCents, 1200)).toBe(-100);
  });

  test("periodA = 0 returns aCents[aDegree] unchanged", () => {
    expect(displacedCents(0, 5, [0], B, 0)).toBe(0);
  });
});
