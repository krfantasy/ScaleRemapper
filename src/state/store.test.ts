import { describe, test, expect } from "vitest";
import { createStore, canSaveGate } from "./store";

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

describe("store — connect() degree validation", () => {
  test("connect with aDegree -1 is silently ignored (no assignment written)", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.connect(3, -1);
    expect(s.mapping().assignments[3]).toBeNull();
    expect(s.mapping().assignments).toHaveLength(12);
  });

  test("connect with bDegree -1 is silently ignored", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.connect(-1, 5);
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
    expect(s.mapping().assignments).toHaveLength(12);
    // JS lets arr[-1] = x attach a "-1" property without touching length or
    // elements — assert nothing was written there either.
    expect(s.mapping().assignments[-1]).toBeUndefined();
  });

  test("connect with aDegree past A's last degree is silently ignored", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A"); // aCents has 13 entries; max valid aDegree is 12
    s.connect(3, 13);
    expect(s.mapping().assignments[3]).toBeNull();
  });

  test("connect with bDegree past B's mappable range is silently ignored (mapping length unchanged)", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A"); // default 12-EDO B: mapping slots 0..11
    s.connect(12, 5);
    expect(s.mapping().assignments).toHaveLength(12);
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
  });

  test("connect with non-integer degrees is silently ignored", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.connect(3, 5.5);
    s.connect(2.5, 5);
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
  });

  test("a valid connect still writes the assignment (boundary degrees included)", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.connect(3, 5);
    expect(s.mapping().assignments[3]).toEqual({ bDegree: 3, aDegree: 5 });
    // bDegree 11 is the last mapping slot; aDegree 12 is A's period degree —
    // both are in range ([0, len - 1] inclusive on the aDegree side).
    s.connect(11, 12);
    expect(s.mapping().assignments[11]).toEqual({ bDegree: 11, aDegree: 12 });
    expect(s.mapping().assignments).toHaveLength(12);
  });
});

describe("store — disconnect() degree validation", () => {
  test("disconnect with bDegree -1 is silently ignored (no stray property, length unchanged)", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.disconnect(-1);
    // arr[-1] = null would attach a "-1" property without touching length —
    // assert neither happened.
    expect(s.mapping().assignments[-1]).toBeUndefined();
    expect(s.mapping().assignments).toHaveLength(12);
  });

  test("disconnect with bDegree at bMappable() does not extend the array", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    // Default 12-EDO B: assignments has exactly 12 slots (0..11). The === null
    // check reads undefined at index 12, passes, and the write would extend the
    // array to 13 sparse slots — corrupting mappedCount/unmappedCount, which
    // deviation.ts derives from assignments.length.
    s.disconnect(12);
    expect(s.mapping().assignments).toHaveLength(12);
    expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
  });

  test("a valid disconnect still nulls the slot", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.connect(3, 5);
    s.disconnect(3);
    expect(s.mapping().assignments[3]).toBeNull();
    expect(s.mapping().assignments).toHaveLength(12);
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

describe("store — canSave gate", () => {
  test("canSave is false initially (no scale A, nothing mapped)", () => {
    expect(createStore().canSave()).toBe(false);
  });

  test("canSave is false when A is loaded but no B degree is mapped", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    expect(s.stats().mappedCount).toBe(0);
    expect(s.canSave()).toBe(false);
  });

  test("canSave is false while the mapping is incomplete", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.connect(3, 5); // 1 of 12 mappable degrees mapped
    expect(s.stats().mappedCount).toBe(1);
    expect(s.canSave()).toBe(false);
  });

  test("canSave is true once every mappable B degree is mapped", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.runAutoMap();
    expect(s.stats().mappedCount).toBe(s.bCents().length - 1);
    expect(s.canSave()).toBe(true);
  });

  test("canSave flips back to false after clearMapping", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.runAutoMap();
    expect(s.canSave()).toBe(true);
    s.clearMapping();
    expect(s.canSave()).toBe(false);
  });

  test("canSave is false for a degenerate root-only B (no mappable degrees)", () => {
    // The parser rejects note counts below 1, so no public store path produces
    // a root-only B (bCents = [root], mappedCount 0 === 0 mappable); exercise
    // the gate's degenerate branch through the exported pure predicate — the
    // same forced state TopBar.test.tsx stages via its store-override trick.
    // The > 0 guard must keep Save off despite the degenerate 0 === 0 pass.
    expect(canSaveGate(true, [0], 0)).toBe(false);
    expect(canSaveGate(false, [0], 0)).toBe(false);
  });
});

describe("store — load error handling", () => {
  test("loadScaleA is null initially", () => {
    expect(createStore().loadError()).toBeNull();
  });

  test("loadScaleA with malformed input sets loadError (source A) and does not throw", () => {
    const s = createStore();
    // "bad\n0\n" — description then count 0, but the real trigger here is the
    // too-few-meaningful-lines guard; any malformed body works. We assert it
    // does NOT throw and records a structured error.
    expect(() => s.loadScaleA("garbage", "bad.scl")).not.toThrow();
    const err = s.loadError();
    expect(err).not.toBeNull();
    expect(err!.source).toBe("A");
    expect(err!.filename).toBe("bad.scl");
    expect(typeof err!.message).toBe("string");
    expect(err!.message.length).toBeGreaterThan(0);
  });

  test("a failed loadScaleA leaves scaleA at its prior value (null if first load)", () => {
    const s = createStore();
    s.loadScaleA("garbage", "bad.scl");
    expect(s.scaleA()).toBeNull();
  });

  test("a failed loadScaleA after a successful one keeps the prior valid scale", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "Good A");
    expect(s.scaleA()?.name).toBe("Good A");
    s.loadScaleA("garbage", "bad.scl");
    // Prior valid scale is retained; only loadError is set.
    expect(s.scaleA()?.name).toBe("Good A");
    expect(s.loadError()?.filename).toBe("bad.scl");
  });

  test("a successful loadScaleA clears a prior loadError", () => {
    const s = createStore();
    s.loadScaleA("garbage", "bad.scl");
    expect(s.loadError()).not.toBeNull();
    s.loadScaleA(EDO12_A, "Good A");
    expect(s.loadError()).toBeNull();
    expect(s.scaleA()?.name).toBe("Good A");
  });

  test("loadScaleB with malformed input sets loadError (source B) and leaves scaleB intact", () => {
    const s = createStore();
    // scaleB defaults to 12-EDO; a failed load must keep it.
    expect(s.scaleB().name).toBe("12-EDO");
    expect(() => s.loadScaleB("garbage", "bad-b.scl")).not.toThrow();
    expect(s.scaleB().name).toBe("12-EDO");
    const err = s.loadError();
    expect(err).not.toBeNull();
    expect(err!.source).toBe("B");
    expect(err!.filename).toBe("bad-b.scl");
  });

  test("clearLoadError nulls the error without touching scales", () => {
    const s = createStore();
    s.loadScaleA(EDO12_A, "A");
    s.loadScaleA("garbage", "bad.scl");
    expect(s.loadError()).not.toBeNull();
    s.clearLoadError();
    expect(s.loadError()).toBeNull();
    // The valid A loaded first is still there.
    expect(s.scaleA()?.name).toBe("A");
  });

  test("a failed B load then a successful A load clears the error (success resets it)", () => {
    const s = createStore();
    s.loadScaleB("garbage", "bad-b.scl");
    expect(s.loadError()?.source).toBe("B");
    s.loadScaleA(EDO12_A, "A");
    expect(s.loadError()).toBeNull();
  });

  test("reportLoadError sets a structured error from a non-parse failure (e.g. File.text I/O rejection)", () => {
    const s = createStore();
    s.reportLoadError("A", "a.scl", new Error("read failed"));
    const err = s.loadError();
    expect(err).not.toBeNull();
    expect(err!.source).toBe("A");
    expect(err!.filename).toBe("a.scl");
    expect(err!.message).toBe("read failed");
    // Non-Error payloads fall back to String() like the parse-error path.
    s.reportLoadError("B", "b.scl", 42);
    expect(s.loadError()!.source).toBe("B");
    expect(s.loadError()!.message).toBe("42");
  });
});
