import { describe, test, expect } from "vitest";
import { serializeMappingToScl, formatCents } from "./serializer";
import { edoScale } from "./edo";
import { parseScl } from "./parser";
import type { Mapping } from "../mapping/types";

const B_12 = edoScale(12);
const A_CENTS_12 = Array.from({ length: 13 }, (_, i) => i * 100); // 12-EDO as A too

function mappingOf(...pairs: ([number, number] | null)[]): Mapping {
  return { assignments: pairs.map((p) => (p === null ? null : { bDegree: p[0], aDegree: p[1] })) };
}

describe("serializeMappingToScl", () => {
  test("header names A and B", () => {
    const m = mappingOf(...Array.from({ length: 12 }, (_, b) => [b, b] as [number, number]));
    const out = serializeMappingToScl(m, A_CENTS_12, B_12, "My A Scale");
    expect(out.split("\n")[0]).toBe("! Remapped My A Scale onto 12-EDO via Scale Remapper");
  });

  test("count line = B degree count - 1 (root implicit)", () => {
    const m = mappingOf(...Array.from({ length: 12 }, (_, b) => [b, b] as [number, number]));
    const out = serializeMappingToScl(m, A_CENTS_12, B_12, "A");
    const lines = out.split("\n");
    // Serializer output = [header, count, ...entries]. lines[0]=header, lines[1]=count.
    expect(lines[1]).toBe("12");
  });

  test("final line is B's periodRaw verbatim (2/1 for 12-EDO)", () => {
    const m = mappingOf(...Array.from({ length: 12 }, (_, b) => [b, b] as [number, number]));
    const out = serializeMappingToScl(m, A_CENTS_12, B_12, "A");
    const lines = out.split("\n");
    expect(lines[lines.length - 1]).toBe("2/1");
  });

  test("final line is B's periodRaw verbatim for non-octave B (3/1)", () => {
    const bpBig = parseScl(`! bp.scl\nBP\n2\n950.978\n3/1`);
    const aCents = [0, 950.978, 1901.955];
    const m = mappingOf([0, 0], [1, 1]); // B0→A0, B1→A1; B2 is period
    const out = serializeMappingToScl(m, aCents, { scale: bpBig, name: "BP", origin: "file" }, "A");
    const lines = out.split("\n");
    expect(lines[lines.length - 1]).toBe("3/1");
  });

  test("interior entries are the A-pitch cents of each B-degree's assignment", () => {
    // A = [0, 150, 300, 1200]; B = 12-EDO. B0→A0(0, implicit), B1→A1(150), others→A2(300).
    const aCents = [0, 150, 300, 1200];
    const pairs: ([number, number])[] = [
      [0, 0], [1, 1], [2, 2], [3, 2], [4, 2], [5, 2],
      [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],
    ];
    const m = mappingOf(...pairs);
    const out = serializeMappingToScl(m, aCents, B_12, "A");
    const lines = out.split("\n");
    // Serializer output = [header, count, ...entries]. So:
    //   lines[0] = header, lines[1] = "12",
    //   lines[2] = B-degree 1 entry (A1 = 150¢), lines[3] = B-degree 2 (A2 = 300¢), ...
    //   lines[12] = B-degree 11 (A2 = 300¢), lines[13] = period "2/1".
    expect(lines[1]).toBe("12");
    expect(lines[2]).toBe(formatCents(150));   // B-degree 1 → A1
    expect(lines[3]).toBe(formatCents(300));   // B-degree 2 → A2
    expect(lines[12]).toBe(formatCents(300));  // B-degree 11 → A2
    expect(lines[13]).toBe("2/1");             // period
    expect(lines).toHaveLength(14);            // 1 header + 1 count + 12 entries
  });

  test("collapses produce duplicate cents lines (valid .scl)", () => {
    // Two B-degrees both → A-degree 1 (150¢). Output contains 150.0 twice consecutively.
    const aCents = [0, 150, 300, 1200];
    const pairs: ([number, number])[] = [
      [0, 0], [1, 1], [2, 1], [3, 2], [4, 2], [5, 2],
      [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],
    ];
    const m = mappingOf(...pairs);
    const out = serializeMappingToScl(m, aCents, B_12, "A");
    const lines = out.split("\n");
    // lines[2] = B1 → A1 (150¢), lines[3] = B2 → A1 (150¢, collapse duplicate).
    expect(lines[2]).toBe(formatCents(150));
    expect(lines[3]).toBe(formatCents(150));
  });

  test("throws if any B-degree is unmapped", () => {
    const pairs: ([number, number] | null)[] = [
      [0, 0], null, [2, 2], [3, 3], [4, 4], [5, 5],
      [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11],
    ];
    const m = mappingOf(...pairs);
    expect(() => serializeMappingToScl(m, A_CENTS_12, B_12, "A")).toThrow(/mapped/i);
  });

  test("throws if assignment count does not match B mappable degree count", () => {
    const m = mappingOf([0, 0], [1, 1]); // length 2, but B_12 mappable = 12
    expect(() => serializeMappingToScl(m, A_CENTS_12, B_12, "A")).toThrow(/length/i);
  });
});

describe("formatCents", () => {
  test("6 decimals, trailing zeros stripped, always has a dot", () => {
    expect(formatCents(100)).toBe("100.0");
    expect(formatCents(701.955)).toBe("701.955");
    expect(formatCents(701.9550001)).toBe("701.955"); // rounds to 6 dp
  });
});
