import { describe, test, expect } from "vitest";
import { parseScl } from "./parser";

const EDO19 = `! 19edoblend.scl
!
19
!
63.1578947368421
126.315789473684
189.473684210526
252.631578947368
315.789473684211
378.947368421053
442.105263157895
505.263157894737
568.421052631579
631.578947368421
694.736842105263
757.894736842105
821.052631578947
884.210526315789
947.368421052632
1010.52631578947
1073.68421052632
1136.84210526316
2/1`;

describe("parseScl - structure", () => {
  test("parses 19-EDO with correct count and degrees", () => {
    const scale = parseScl(EDO19);
    // degrees = synthetic root (0¢) + all 19 file entries = 20 total.
    expect(scale.degrees).toHaveLength(20);
    expect(scale.degrees[0]).toEqual({ degree: 0, cents: 0, raw: "1/1" });
    expect(scale.degrees[1].cents).toBeCloseTo(63.158, 2);
    expect(scale.degrees[18].cents).toBeCloseTo(1136.842, 3);
    expect(scale.degrees[19].cents).toBeCloseTo(1200, 5);
    expect(scale.isOctaveClosing).toBe(true);
  });

  test("parses cents with trailing dot", () => {
    const scale = parseScl(`t\n2\n100.0.\n200.0.`);
    expect(scale.degrees[1].cents).toBeCloseTo(100, 5);
    expect(scale.degrees[2].cents).toBeCloseTo(200, 5);
  });

  test("parses cents without trailing dot", () => {
    const scale = parseScl(`t\n2\n100.0\n200.0`);
    expect(scale.degrees[1].cents).toBeCloseTo(100, 5);
  });

  test("parses ratios", () => {
    const scale = parseScl(`t\n2\n3/2\n2/1`);
    expect(scale.degrees[1].cents).toBeCloseTo(701.955, 2);
    expect(scale.degrees[2].cents).toBeCloseTo(1200, 5);
  });

  test("parses bare integer as ratio (2 → 2/1)", () => {
    const scale = parseScl(`t\n1\n2`);
    expect(scale.degrees[1].cents).toBeCloseTo(1200, 5);
  });

  test("mixes cents and ratios", () => {
    const scale = parseScl(`t\n2\n3/2\n1200.0.`);
    expect(scale.degrees[1].cents).toBeCloseTo(701.955, 2);
    expect(scale.degrees[2].cents).toBeCloseTo(1200, 5);
  });
});

describe("parseScl - comments and whitespace", () => {
  test("first non-comment line is description", () => {
    const scale = parseScl(`! comment\nMy Scale\n1\n2/1`);
    expect(scale.description).toBe("My Scale");
  });

  test("skips blank lines", () => {
    const scale = parseScl(`t\n\n1\n\n2/1`);
    // count = 1, one entry "2/1" survives past the blank line.
    // degrees = synthetic root + 1 entry = 2.
    expect(scale.degrees).toHaveLength(2);
    expect(scale.degrees[1].cents).toBeCloseTo(1200, 5);
  });
});

describe("parseScl - edge cases", () => {
  test("detects non-octave scale", () => {
    const scale = parseScl(`t\n2\n100.0.\n1100.0.`);
    expect(scale.isOctaveClosing).toBe(false);
  });

  test("throws on unparseable entry", () => {
    expect(() => parseScl(`t\n1\nnot-a-pitch`)).toThrow(/parse/i);
  });

  test("throws on too few entries", () => {
    expect(() => parseScl(`t\n5\n100.0.`)).toThrow();
  });

  test("preserves raw entry text on each degree", () => {
    const scale = parseScl(`! file.scl\nMy Scale\n2\n3/2\n2/1`);
    expect(scale.degrees[0].raw).toBe("1/1");          // synthetic root
    expect(scale.degrees[1].raw).toBe("3/2");
    expect(scale.degrees[2].raw).toBe("2/1");
  });

  test("preserves raw text for cents entries including trailing dot", () => {
    const scale = parseScl(`t\n2\n100.0.\n200.0.`);
    expect(scale.degrees[1].raw).toBe("100.0.");
    expect(scale.degrees[2].raw).toBe("200.0.");
  });

  test("periodRaw is the verbatim last entry", () => {
    const scale = parseScl(`t\n2\n3/2\n2/1`);
    expect(scale.periodRaw).toBe("2/1");
  });

  test("periodRaw is non-octave value for Bohlen-Pierce-style period", () => {
    const scale = parseScl(`t\n1\n3/1`);
    expect(scale.periodRaw).toBe("3/1");
    expect(scale.degrees[1].cents).toBeCloseTo(1901.955, 2);
    expect(scale.isOctaveClosing).toBe(false);
  });

  test("periodRaw is empty string for a root-only scale (count 0)", () => {
    // count = 0 is permitted by the spec's lower limit; produces a root-only scale.
    const scale = parseScl(`t\n0\n`);
    expect(scale.degrees).toHaveLength(1);
    expect(scale.periodRaw).toBe("");
  });
});
