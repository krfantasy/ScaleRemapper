import { describe, test, expect } from "vitest";
import { computeDeviation, findCollisions, findTies, computeStats } from "./deviation";
import type { Mapping } from "./types";

function makeMapping(degrees: (number | null)[]): Mapping {
  return {
    assignments: degrees.map((deg, i) =>
      deg === null ? null : { destKey: i, sourceDegree: deg },
    ),
  };
}

describe("computeDeviation", () => {
  test("exact match has 0 deviation", () => {
    const mapping = makeMapping([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const sourceCents = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100];
    expect(computeDeviation(mapping, sourceCents, 5)).toBe(0);
  });

  test("positive deviation (source sharper)", () => {
    // key 1 (100¢) -> degree 2 at 126.316¢ → +26.316
    const mapping = makeMapping([0, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const sourceCents = [0, 63, 126, 189, 252, 315, 378, 442, 505, 568, 631, 694];
    expect(computeDeviation(mapping, sourceCents, 1)).toBeCloseTo(26, 0);
  });

  test("negative deviation (source flatter)", () => {
    // key 2 (200¢) -> degree 3 at 189¢ → -11
    const mapping = makeMapping([0, 1, 3, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const sourceCents = [0, 63, 126, 189, 252, 315, 378, 442, 505, 568, 631, 694];
    expect(computeDeviation(mapping, sourceCents, 2)).toBeCloseTo(-11, 0);
  });

  test("null assignment returns undefined", () => {
    const mapping = makeMapping([null, null, null, null, null, null, null, null, null, null, null, null]);
    expect(computeDeviation(mapping, [0, 100], 0)).toBeUndefined();
  });
});

describe("findCollisions", () => {
  test("no collisions when all distinct", () => {
    expect(findCollisions(makeMapping([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))).toEqual([]);
  });

  test("detects two keys on same degree", () => {
    const collisions = findCollisions(makeMapping([0, 5, 5, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
    expect(collisions).toHaveLength(1);
    expect(collisions[0].sourceDegree).toBe(5);
    expect(collisions[0].destKeys).toEqual(expect.arrayContaining([1, 2, 5]));
  });

  test("detects multiple collision groups", () => {
    expect(findCollisions(makeMapping([0, 1, 1, 3, 4, 5, 6, 7, 7, 9, 10, 11]))).toHaveLength(2);
  });
});

describe("findTies", () => {
  test("no ties when no exact ties exist", () => {
    const mapping = makeMapping([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const sourceCents = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100];
    expect(findTies(mapping, sourceCents)).toEqual([]);
  });

  test("flags an exact tie (equidistant candidates)", () => {
    // key 6 (600¢) between degree 1 (575¢) and degree 2 (625¢): both 25 away
    const mapping = makeMapping([0, null, null, null, null, null, 1, null, null, null, null, null]);
    const sourceCents = [0, 575, 625];
    const ties = findTies(mapping, sourceCents);
    expect(ties.length).toBeGreaterThanOrEqual(1);
    expect(ties[0].destKey).toBe(6);
  });
});

describe("computeStats", () => {
  test("full mapping, zero deviation", () => {
    const mapping = makeMapping([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const sourceCents = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100];
    const stats = computeStats(mapping, sourceCents);
    expect(stats.avgError).toBeCloseTo(0, 5);
    expect(stats.maxError).toBeCloseTo(0, 5);
    expect(stats.collisions).toBe(0);
    expect(stats.mappedCount).toBe(12);
  });

  test("counts unmapped keys", () => {
    const mapping = makeMapping([0, null, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const stats = computeStats(mapping, [0, 100, 200]);
    expect(stats.unmappedCount).toBe(1);
    expect(stats.mappedCount).toBe(11);
  });
});
