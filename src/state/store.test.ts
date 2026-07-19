import { describe, test, expect } from "vitest";
import { createStore } from "./store";

const EDO12_A = `! a.scl
A Scale
12
100.0.
200.0.
300.0.
400.0.
500.0.
600.0.
700.0.
800.0.
900.0.
1000.0.
1100.0.
2/1`;

describe("store — initial state", () => {
  test("scaleA is null initially; scaleB defaults to 12-EDO", () => {
    const s = createStore();
    expect(s.scaleA()).toBeNull();
    expect(s.scaleB().name).toBe("12-EDO");
    expect(s.scaleB().origin).toBe("default");
    expect(s.scaleB().scale.degrees).toHaveLength(13);
  });

  test("mapping length matches B's mappable degree count (12 for default B)", () => {
    const s = createStore();
    expect(s.mapping().assignments).toHaveLength(12);
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
  });

  test("selected is null initially", () => {
    expect(createStore().selected()).toBeNull();
  });
});

describe("store — loading scales", () => {
  test("loadScaleA sets scaleA and resets mapping to all-null of B's length", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A Scale");
    expect(s.scaleA()).not.toBeNull();
    expect(s.scaleA()!.name).toBe("A Scale");
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
  });

  test("loadScaleB sets scaleB with origin 'file' and resets mapping", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.runAutoMap();
    expect(s.mapping().assignments.some((a) => a !== null)).toBe(true);
    s.loadScaleB(EDO12_A, "B from file");
    expect(s.scaleB().origin).toBe("file");
    expect(s.scaleB().name).toBe("B from file");
    // mapping reset
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
    // and length matches new B (still 12 here)
    expect(s.mapping().assignments).toHaveLength(12);
  });

  test("loadScaleB with a 19-EDO file produces mapping length 19", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    const edo19 = `! 19.scl\n19-EDO\n19\n${Array.from({ length: 18 }, (_, i) => (1200 / 19) * (i + 1)).join("\n")}\n2/1`;
    s.loadScaleB(edo19, "19-EDO");
    expect(s.scaleB().scale.degrees).toHaveLength(20);
    expect(s.mapping().assignments).toHaveLength(19);
  });

  test("setBFromPreset sets scaleB with origin 'preset'", () => {
    const s = createStore();
    s.setBFromPreset(31);
    expect(s.scaleB().name).toBe("31-EDO");
    expect(s.scaleB().origin).toBe("preset");
    expect(s.mapping().assignments).toHaveLength(31);
  });

  test("resetBToDefault restores 12-EDO default", () => {
    const s = createStore();
    s.setBFromPreset(31);
    s.resetBToDefault();
    expect(s.scaleB().name).toBe("12-EDO");
    expect(s.scaleB().origin).toBe("default");
    expect(s.mapping().assignments).toHaveLength(12);
  });
});

describe("store — mapping ops", () => {
  test("runAutoMap fills all B-degrees", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.runAutoMap();
    expect(s.mapping().assignments.every((a) => a !== null)).toBe(true);
  });

  test("runAutoMap is a no-op when A is not loaded", () => {
    const s = createStore();
    s.runAutoMap();
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
  });

  test("runRandomMap fills all B-degrees with valid A-degree assignments", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.runRandomMap();
    const m = s.mapping().assignments;
    expect(m.every((a) => a !== null)).toBe(true);
    expect(m.length).toBe(s.bCents().length - 1);
    // A-degree must be a valid index (not A's period).
    const aLast = s.aCents().length - 1;
    for (const a of m) expect(a!.aDegree).toBeLessThan(aLast);
  });

  test("runRandomMap is a no-op when A is not loaded", () => {
    const s = createStore();
    s.runRandomMap();
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
  });

  test("connect writes assignments[bDegree]", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.connect(3, 5);
    expect(s.mapping().assignments[3]?.aDegree).toBe(5);
    expect(s.mapping().assignments[3]?.bDegree).toBe(3);
  });

  test("disconnect sets assignments[bDegree] to null", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.connect(3, 5);
    s.disconnect(3);
    expect(s.mapping().assignments[3]).toBeNull();
  });

  test("clearMapping sets all assignments to null (keeps both scales)", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.runAutoMap();
    s.clearMapping();
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
    expect(s.scaleA()).not.toBeNull();
    expect(s.scaleB().origin).toBe("default");
  });
});

describe("store — selection", () => {
  test("select sets {ring, degree}; clearSelection nulls it", () => {
    const s = createStore();
    s.select("B", 4);
    expect(s.selected()).toEqual({ ring: "B", degree: 4 });
    s.clearSelection();
    expect(s.selected()).toBeNull();
  });

  test("loading a scale clears selection", () => {
    const s = createStore();
    s.select("B", 4);
    s.loadScaleA(EDO12_A, "A");
    expect(s.selected()).toBeNull();
  });
});

describe("store — derived", () => {
  test("aCents is empty when A is null; populated after load", () => {
    const s = createStore();
    expect(s.aCents()).toEqual([]);
    s.loadScaleA(EDO12_A, "A");
    expect(s.aCents().length).toBe(13);
  });

  test("bCents tracks scaleB", () => {
    const s = createStore();
    expect(s.bCents().length).toBe(13);
    s.setBFromPreset(19);
    expect(s.bCents().length).toBe(20);
  });
});

describe("store — periodA memo", () => {
  test("periodA is 0 when A is null", () => {
    expect(createStore().periodA()).toBe(0);
  });

  test("periodA is the last degree's cents when A is loaded", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    expect(s.periodA()).toBe(1200);
  });
});
