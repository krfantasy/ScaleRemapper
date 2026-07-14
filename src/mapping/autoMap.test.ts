import { describe, test, expect } from "vitest";
import { autoMap } from "./autoMap";

// 19-EDO source cents (degrees 0-18, step ≈ 63.158). NOTE: the parser prepends
// a synthetic root at degree 0 (0¢), so a 19-entry .scl file yields 20 degrees.
// But for auto-map we pass just the cents array. Here we simulate the source
// cents array as it would come from the store: 20 entries (0 through 1200¢).
const EDO19 = [0, 63.158, 126.316, 189.474, 252.632, 315.789, 378.947, 442.105,
  505.263, 568.421, 631.579, 694.737, 757.895, 821.053, 884.211, 947.368,
  1010.526, 1073.684, 1136.842, 1200];

describe("autoMap", () => {
  test("maps all 12 keys", () => {
    const { mapping } = autoMap(EDO19);
    expect(mapping.assignments).toHaveLength(12);
    expect(mapping.assignments.every((a) => a !== null)).toBe(true);
  });

  test("key 0 maps to degree 0 (root)", () => {
    const { mapping } = autoMap(EDO19);
    expect(mapping.assignments[0]?.sourceDegree).toBe(0);
  });

  test("key 1 (100¢) maps to nearest degree (degree 2, 126.316¢)", () => {
    const { mapping } = autoMap(EDO19);
    expect(mapping.assignments[1]?.sourceDegree).toBe(2);
  });

  test("key 2 (200¢) maps to nearest degree (degree 3, 189.474¢)", () => {
    const { mapping } = autoMap(EDO19);
    expect(mapping.assignments[2]?.sourceDegree).toBe(3);
  });

  test("exact tie (key 6 / 600¢ in 19-EDO) breaks to lower degree", () => {
    // 600¢ is exactly between degree 9 (568.421¢) and degree 10 (631.579¢)
    const { mapping, ties } = autoMap(EDO19);
    expect(mapping.assignments[6]?.sourceDegree).toBe(9); // lower degree wins
    const tie = ties.find((t) => t.destKey === 6);
    expect(tie).toBeDefined();
    expect(tie?.tieAltDegree).toBe(10);
  });

  test("ignores the final octave degree (1200¢) when mapping keys 0-11", () => {
    // The octave (1200¢) is equivalent to root (0¢) of next octave; don't map any key to it
    const { mapping } = autoMap(EDO19);
    for (const a of mapping.assignments) {
      expect(a?.sourceDegree).not.toBe(EDO19.length - 1);
    }
  });
});
