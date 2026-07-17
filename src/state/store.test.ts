import { describe, test, expect } from "vitest";
import { createRoot } from "solid-js";
import { createStore } from "./store";

const EDO19_SCL = `! 19edoblend.scl
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

function withStore(fn: (s: ReturnType<typeof createStore>) => void) {
  createRoot((dispose) => {
    const s = createStore();
    fn(s);
    dispose();
  });
}

describe("store", () => {
  test("initial state is empty", () => {
    withStore((s) => {
      expect(s.sourceScale()).toBeNull();
      expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
      expect(s.selectedKey()).toBeNull();
    });
  });

  test("loadScale parses and resets mapping", () => {
    withStore((s) => {
      s.loadScale(EDO19_SCL);
      expect(s.sourceScale()).not.toBeNull();
      expect(s.sourceScale()!.degrees).toHaveLength(20); // 19 entries + synthetic root
      expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
    });
  });

  test("autoMap populates all 12 keys", () => {
    withStore((s) => {
      s.loadScale(EDO19_SCL);
      s.runAutoMap();
      expect(s.mapping().assignments.every((a) => a !== null)).toBe(true);
    });
  });

  test("connect sets a single assignment", () => {
    withStore((s) => {
      s.loadScale(EDO19_SCL);
      s.connect(3, 5);
      expect(s.mapping().assignments[3]?.sourceDegree).toBe(5);
    });
  });

  test("disconnect clears a single assignment, leaving others intact", () => {
    withStore((s) => {
      s.loadScale(EDO19_SCL);
      s.connect(3, 5);
      s.connect(7, 11);
      s.disconnect(3);
      expect(s.mapping().assignments[3]).toBeNull();
      expect(s.mapping().assignments[7]?.sourceDegree).toBe(11);
    });
  });

  test("disconnect on an already-null key is a no-op", () => {
    withStore((s) => {
      s.loadScale(EDO19_SCL);
      s.connect(3, 5);
      const before = s.mapping();
      s.disconnect(7);
      expect(s.mapping()).toBe(before);
    });
  });

  test("clearMapping resets to 12 nulls", () => {
    withStore((s) => {
      s.loadScale(EDO19_SCL);
      s.runAutoMap();
      s.clearMapping();
      expect(s.mapping().assignments.every((a) => a === null)).toBe(true);
    });
  });

  test("selection toggles", () => {
    withStore((s) => {
      s.selectKey(4);
      expect(s.selectedKey()).toBe(4);
      s.clearSelection();
      expect(s.selectedKey()).toBeNull();
    });
  });

  test("waveform is settable", () => {
    withStore((s) => {
      s.setWaveform("sawtooth");
      expect(s.waveform()).toBe("sawtooth");
    });
  });

  test("stats derive from current mapping", () => {
    withStore((s) => {
      s.loadScale(EDO19_SCL);
      s.runAutoMap();
      const stats = s.stats();
      expect(stats.mappedCount).toBe(12);
      expect(stats.ties).toBeGreaterThanOrEqual(1); // 19-EDO has the F# tie
    });
  });
});
