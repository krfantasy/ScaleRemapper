import { describe, test, expect } from "vitest";
import { computeDeviation, findCollisions, findTies, computeStats } from "./deviation";
import type { Mapping } from "./types";

const A = [0, 100, 200, 300, 1200];   // A: root + 3 notes + period
const B = [0, 100, 200, 1200];        // B: root + 2 notes + period (3 mappable degrees)

function mappingOf(...pairs: ([number, number] | null)[]): Mapping {
  return { assignments: pairs.map((p) => (p === null ? null : { bDegree: p[0], aDegree: p[1] })) };
}

describe("computeDeviation(mapping, aCents, bCents, periodA, bDegree)", () => {
  test("returns aCents[a] - bCents[b] for a mapped B-degree", () => {
    const m = mappingOf([0, 0], [1, 1], [2, 2]); // B1→A1, B2→A2
    expect(computeDeviation(m, A, B, 1200, 1)).toBeCloseTo(0, 5);
    expect(computeDeviation(m, A, B, 1200, 2)).toBeCloseTo(0, 5);
  });

  test("returns undefined for an unmapped B-degree", () => {
    const m = mappingOf([0, 0], null, [2, 2]);
    expect(computeDeviation(m, A, B, 1200, 1)).toBeUndefined();
  });

  test("signed: positive when A is sharper than B's grid", () => {
    const m = mappingOf([0, 0], [1, 2], null); // B1(100¢)→A2(200¢): dev +100
    expect(computeDeviation(m, A, B, 1200, 1)).toBeCloseTo(100, 5);
  });
});

describe("findCollisions(mapping)", () => {
  test("groups B-degrees by A-degree and returns groups with >1", () => {
    const m = mappingOf([0, 0], [1, 1], [2, 1]); // B1,B2 → A1
    const cols = findCollisions(m);
    expect(cols).toHaveLength(1);
    expect(cols[0].aDegree).toBe(1);
    expect(cols[0].bDegrees.sort()).toEqual([1, 2]);
  });

  test("returns empty when no collapses", () => {
    const m = mappingOf([0, 0], [1, 1], [2, 2]);
    expect(findCollisions(m)).toHaveLength(0);
  });

  test("sorted by aDegree ascending", () => {
    const m = mappingOf([0, 2], [1, 1], [2, 1]); // collapses on A1; A2 used once
    const cols = findCollisions(m);
    expect(cols.map((c) => c.aDegree)).toEqual([...cols.map((c) => c.aDegree)].sort((x, y) => x - y));
  });
});

describe("findTies(mapping, aCents, bCents, periodA)", () => {
  test("finds a B-degree equidistant between two A-degrees", () => {
    // A has degrees at 0, 100, 200, ...; B-degree 1 at 150¢ is equidistant from A1(100) and A2(200).
    const aCents = [0, 100, 200, 1200];
    const bCents = [0, 150, 1200];
    const m = mappingOf([0, 0], [1, 1], null); // B1 → A1 (lower wins in autoMap; here we assert tie detection)
    const ties = findTies(m, aCents, bCents, 1200);
    const t = ties.find((x) => x.bDegree === 1);
    expect(t).toBeDefined();
    expect(t?.chosenADegree).toBe(1);
    expect(t?.tieAltADegree).toBe(2);
  });

  test("never reports A's period (last degree) as a tie alternative", () => {
    // A's period (last degree) is excluded as an autoMap candidate, so findTies
    // must never report it as a tieAltADegree. Construct a case where the period
    // WOULD be equidistant under naive scanning: A2 at 600¢, A3 (period) at
    // 1200¢, B1 at 900¢ is equidistant (300¢) from both. Under the new octave-
    // wrap code, A0+1oct (1200¢) is ALSO equidistant from B1, so a cross-k tie
    // {chosen:2, alt:0} IS correctly reported — but the period index (3) must
    // never appear as the alt.
    const aCents = [0, 300, 600, 1200];
    const bCents = [0, 900, 1200];
    const m = mappingOf([0, 0], [1, 2], null); // B1 → A2 (600¢)
    const ties = findTies(m, aCents, bCents, 1200);
    const t = ties.find((x) => x.bDegree === 1);
    if (t) {
      expect(t.tieAltADegree).not.toBe(aCents.length - 1);
    }
  });
});

describe("computeStats(mapping, aCents, bCents, periodA)", () => {
  test("mappedCount counts non-null assignments; unmappedCount = bLen-1 - mapped", () => {
    // B has 4 degrees; mappable = 3 (0,1,2). Two mapped.
    const m = mappingOf([0, 0], [1, 1], null);
    const s = computeStats(m, A, B, 1200);
    expect(s.mappedCount).toBe(2);
    expect(s.unmappedCount).toBe(1);
  });

  test("collapses counts B-degrees involved in any collision", () => {
    const m = mappingOf([0, 0], [1, 1], [2, 1]); // 2 B-degrees collapse onto A1
    const s = computeStats(m, A, B, 1200);
    expect(s.collapses).toBe(2);
    expect(s.collisions).toBe(1);
  });

  test("avgError and maxError from absolute deviations", () => {
    const m = mappingOf([0, 0], [1, 2], null); // B1(100)→A2(200): dev 100
    const s = computeStats(m, A, B, 1200);
    expect(s.avgError).toBeCloseTo(50, 5);  // (0 + 100) / 2 mapped
    expect(s.maxError).toBeCloseTo(100, 5);
  });
});

describe("computeDeviation with octave wrap", () => {
  test("returns the displaced deviation when the B-degree is past A's first period", () => {
    const A = [0, 161, 346, 526, 686, 862, 1028.571, 1200];
    const B = [0, 172.905, 345.810, 518.715, 691.620, 864.525, 1037.430,
      1210.335, 1383.240, 1556.145, 1729.050, 1901.955];
    // Need assignments[10] to be the B-10 → A-3 entry. computeDeviation indexes
    // by bDegree, so build an 11-element array with the entry at index 10.
    const m = mappingOf(
      [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6],
      [7, 0], [8, 1], [9, 2], [10, 3],
    );
    const dev = computeDeviation(m, A, B, 1200, 10);
    // A-3 + 1 octave = 1726.0; B-10 = 1729.05. dev = sounded - target = 1726 - 1729.05 = -3.05.
    // (A-pitch is FLATTER than B's grid position → negative deviation.)
    expect(dev).toBeCloseTo(-3.05, 1);
  });

  test("deviation is within-period when periodA = 0", () => {
    // periodA=0 → no wrap → dev = aCents[0] - bCents[1] = 0 - 500 = -500.
    // assignments[1] must hold the B-1 → A-0 entry.
    const m = mappingOf([0, 0], [1, 0]);
    expect(computeDeviation(m, [0], [0, 500, 1200], 0, 1)).toBe(-500);
  });
});

describe("findTies with octave wrap", () => {
  test("does NOT flag a same-k cross-octave equidistance (degenerate tie)", () => {
    // A has a degree at 600¢, periodA 1200¢. B-1 at 1200¢ is exactly halfway
    // between A-1+0 (600¢) and A-1+1oct (1800¢) — same k, different n. Per spec
    // §3.4 findTies skips same-k alternatives (`if (d === a.aDegree) continue`),
    // so this equidistance is silently resolved (round picks n=1 deterministically)
    // and NOT recorded as a tie. Cross-k alternatives (A-0) are not equidistant
    // here (A-0+1oct=1200¢ is dist 0, strictly closer — but chosen is A-1 by
    // fixture, so we just confirm no alt at d ≠ 1 matches the chosen dist of 600).
    const aCents = [0, 600, 1200];
    const bCents = [0, 1200, 2400];
    const m = mappingOf([0, 0], [1, 1]); // B-1 → A-1 at assignments[1]
    const ties = findTies(m, aCents, bCents, 1200);
    expect(ties.find((t) => t.bDegree === 1)).toBeUndefined();
  });

  test("flags a cross-k cross-octave equidistance as a tie", () => {
    // A-1 at 100¢ (n=0 → 100¢), A-2 at 1000¢ (n=+1 → 2200¢). B-1 at 1150¢ is
    // 1050¢ from A-1+0 and 1050¢ from A-2+1 — different k, equidistant → tie.
    const aCents = [0, 100, 1000, 1200];
    const bCents = [0, 1150, 2400];
    const m = mappingOf([0, 0], [1, 1]); // B-1 → A-1, at assignments[1]
    const ties = findTies(m, aCents, bCents, 1200);
    const t = ties.find((x) => x.bDegree === 1);
    expect(t).toBeDefined();
    expect(t?.chosenADegree).toBe(1);
    expect(t?.tieAltADegree).toBe(2);
  });
});
