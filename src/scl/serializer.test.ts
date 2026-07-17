import { describe, test, expect } from "vitest";
import { serializeMappingToScl } from "./serializer";
import type { Mapping } from "../mapping/types";

function makeMapping(degrees: (number | null)[]): Mapping {
  return {
    assignments: degrees.map((deg, i) =>
      deg === null ? null : { destKey: i, sourceDegree: deg },
    ),
  };
}

describe("serializeMappingToScl", () => {
  test("produces valid .scl structure", () => {
    const mapping = makeMapping([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const sourceCents = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100];
    const scl = serializeMappingToScl(mapping, sourceCents, "12-EDO");
    const lines = scl.split("\n");
    // Per Scala spec: comments, then description (first non-comment), then count.
    expect(lines[0]).toContain("12-EDO");
    expect(lines[1]).toBe("!");
    expect(lines[2]).toBe("Remapped from 12-EDO to 12-EDO via Scale Remapper");
    expect(lines[3]).toBe("12");
    expect(scl).toContain("2/1");
  });

  test("writes cents entries with a decimal point", () => {
    const mapping = makeMapping([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const sourceCents = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100];
    const scl = serializeMappingToScl(mapping, sourceCents, "test");
    // A cents value is identified by containing a period (Scala spec).
    const entryLines = scl.split("\n").filter((l) => /^\d+\.\d+$/.test(l.trim()));
    expect(entryLines).toHaveLength(11);
  });

  test("uses exact mapped cents (non-integer for 19-EDO)", () => {
    const mapping = makeMapping([0, 2, 3, 5, 6, 8, 10, 11, 13, 14, 16, 17]);
    const sourceCents = [0, 63.158, 126.316, 189.474, 252.632, 315.789, 378.947,
      442.105, 505.263, 568.421, 631.579, 694.737, 757.895, 821.053, 884.211,
      947.368, 1010.526, 1073.684, 1136.842, 1200];
    const scl = serializeMappingToScl(mapping, sourceCents, "19-EDO");
    expect(scl).toContain("126.316");
  });

  test("rejects unmapped keys", () => {
    const mapping = makeMapping([0, null, null, null, null, null, null, null, null, null, null, null]);
    expect(() => serializeMappingToScl(mapping, [0, 100], "test")).toThrow(/mapped/i);
  });

  test("produces exactly 12 entries (11 cents + 2/1)", () => {
    const mapping = makeMapping([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const sourceCents = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100];
    const scl = serializeMappingToScl(mapping, sourceCents, "test");
    const entryLines = scl.split("\n").filter((l) => /^\d+\.\d+$|^2\/1$/.test(l.trim()));
    expect(entryLines).toHaveLength(12);
  });
});
