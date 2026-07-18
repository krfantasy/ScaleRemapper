import { describe, test, expect } from "vitest";
import { computeDeviation, findCollisions, findTies, computeStats } from "./deviation";
import type { Mapping } from "./types";

const A = [0, 100, 200, 300, 1200];   // A: root + 3 notes + period
const B = [0, 100, 200, 1200];        // B: root + 2 notes + period (3 mappable degrees)

function mappingOf(...pairs: ([number, number] | null)[]): Mapping {
  return { assignments: pairs.map((p) => (p === null ? null : { bDegree: p[0], aDegree: p[1] })) };
}

describe("computeDeviation(mapping, aCents, bCents, bDegree)", () => {
  test("returns aCents[a] - bCents[b] for a mapped B-degree", () => {
    const m = mappingOf([0, 0], [1, 1], [2, 2]); // B1→A1, B2→A2
    expect(computeDeviation(m, A, B, 1)).toBeCloseTo(0, 5);
    expect(computeDeviation(m, A, B, 2)).toBeCloseTo(0, 5);
  });

  test("returns undefined for an unmapped B-degree", () => {
    const m = mappingOf([0, 0], null, [2, 2]);
    expect(computeDeviation(m, A, B, 1)).toBeUndefined();
  });

  test("signed: positive when A is sharper than B's grid", () => {
    const m = mappingOf([0, 0], [1, 2], null); // B1(100¢)→A2(200¢): dev +100
    expect(computeDeviation(m, A, B, 1)).toBeCloseTo(100, 5);
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

describe("findTies(mapping, aCents, bCents)", () => {
  test("finds a B-degree equidistant between two A-degrees", () => {
    // A has degrees at 0, 100, 200, ...; B-degree 1 at 150¢ is equidistant from A1(100) and A2(200).
    const aCents = [0, 100, 200, 1200];
    const bCents = [0, 150, 1200];
    const m = mappingOf([0, 0], [1, 1], null); // B1 → A1 (lower wins in autoMap; here we assert tie detection)
    const ties = findTies(m, aCents, bCents);
    const t = ties.find((x) => x.bDegree === 1);
    expect(t).toBeDefined();
    expect(t?.chosenADegree).toBe(1);
    expect(t?.tieAltADegree).toBe(2);
  });

  test("never reports A's period (last degree) as a tie alternative", () => {
    // A's period (last degree) is excluded as an autoMap candidate, so findTies
    // must not report it as a tieAltADegree — that would reference a degree
    // autoMap could never have chosen.
    // A = [0, 300, 600, 1200] (period = A3 = 1200¢). B-degree 1 at 900¢ is
    // equidistant from A2 (600¢, dist 300) and A3 the period (1200¢, dist 300),
    // but NOT from any other real candidate (A0=0 dist 900, A1=300 dist 600).
    // The OLD code (scanning all degrees) would have reported a tie with alt=A3.
    // The fixed code (excluding the period) correctly reports NO tie, because
    // among real candidates A2 is the unique nearest.
    const aCents = [0, 300, 600, 1200];
    const bCents = [0, 900, 1200];
    const m = mappingOf([0, 0], [1, 2], null); // B1 → A2 (600¢)
    const ties = findTies(m, aCents, bCents);
    const t = ties.find((x) => x.bDegree === 1);
    expect(t).toBeUndefined(); // no tie among real candidates
  });
});

describe("computeStats(mapping, aCents, bCents)", () => {
  test("mappedCount counts non-null assignments; unmappedCount = bLen-1 - mapped", () => {
    // B has 4 degrees; mappable = 3 (0,1,2). Two mapped.
    const m = mappingOf([0, 0], [1, 1], null);
    const s = computeStats(m, A, B);
    expect(s.mappedCount).toBe(2);
    expect(s.unmappedCount).toBe(1);
  });

  test("collapses counts B-degrees involved in any collision", () => {
    const m = mappingOf([0, 0], [1, 1], [2, 1]); // 2 B-degrees collapse onto A1
    const s = computeStats(m, A, B);
    expect(s.collapses).toBe(2);
    expect(s.collisions).toBe(1);
  });

  test("avgError and maxError from absolute deviations", () => {
    const m = mappingOf([0, 0], [1, 2], null); // B1(100)→A2(200): dev 100
    const s = computeStats(m, A, B);
    expect(s.avgError).toBeCloseTo(50, 5);  // (0 + 100) / 2 mapped
    expect(s.maxError).toBeCloseTo(100, 5);
  });
});
