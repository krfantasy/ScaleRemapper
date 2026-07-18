// Task 15 integration check: runs the end-to-end A→B scenarios through the
// REAL store + engine + serializer paths (under vitest, the app's environment).
import { describe, test, expect } from "vitest";
import { createStore } from "./state/store";
import { serializeMappingToScl } from "./scl/serializer";
import { sanitizeScaleName } from "./scl/edo";
import { readFileSync } from "node:fs";
import { createRoot } from "solid-js";

const EDO19_FIXTURE = readFileSync("test-fixtures/19edo.scl", "utf-8");

describe("Task 15 integration: v1 regression (19-EDO A -> 12-EDO B default)", () => {
  test("full flow produces a valid 12-note .scl with B's period", () => {
    createRoot(() => {
      const store = createStore();
      store.loadScaleA(EDO19_FIXTURE, "19EDO");
      store.runAutoMap();
      const out = serializeMappingToScl(store.mapping(), store.aCents(), store.scaleB(), store.scaleA()!.name);
      const lines = out.split("\n");
      expect(lines[0]).toBe("! Remapped 19EDO onto 12-EDO via Scale Remapper");
      expect(lines[1]).toBe("12");
      expect(lines[lines.length - 1]).toBe("2/1");
      expect(store.stats().mappedCount).toBe(12);
      const filename = `${sanitizeScaleName(store.scaleA()!.name)}-onto-${sanitizeScaleName(store.scaleB().name)}.scl`;
      expect(filename).toBe("19edo-onto-12-edo.scl");
    });
  });
});

describe("Task 15 integration: EDO->EDO with collapses", () => {
  test("19-EDO A onto 31-EDO B: 31 mapped, collapses > 0, not blocked", () => {
    createRoot(() => {
      const store = createStore();
      store.loadScaleA(EDO19_FIXTURE, "19EDO");
      store.setBFromPreset(31);
      store.runAutoMap();
      const stats = store.stats();
      expect(stats.mappedCount).toBe(31);
      expect(stats.collapses).toBeGreaterThan(0);
      const out = serializeMappingToScl(store.mapping(), store.aCents(), store.scaleB(), store.scaleA()!.name);
      expect(out.split("\n")[1]).toBe("31");
      expect(out).not.toContain("Cannot");
    });
  });
});

describe("Task 15 integration: non-octave B (Bohlen-Pierce period 3/1)", () => {
  test("final line echoes B's periodRaw verbatim (3/1)", () => {
    createRoot(() => {
      const store = createStore();
      store.loadScaleA(EDO19_FIXTURE, "19EDO");
      const bp = `! bp.scl\nBohlen-Pierce\n2\n950.978\n3/1`;
      store.loadScaleB(bp, "BP");
      store.runAutoMap();
      const out = serializeMappingToScl(store.mapping(), store.aCents(), store.scaleB(), store.scaleA()!.name);
      expect(out.split("\n").pop()).toBe("3/1");
    });
  });
});

describe("Task 15 integration: collapse does not block export", () => {
  test("sparse A onto 31-EDO B produces output with duplicate cents lines", () => {
    createRoot(() => {
      const store = createStore();
      const sparseA = `! ji.scl\nSparse JI\n3\n200.0.\n400.0.\n2/1`;
      store.loadScaleA(sparseA, "SparseJI");
      store.setBFromPreset(31);
      store.runAutoMap();
      expect(store.stats().collapses).toBeGreaterThan(0);
      const out = serializeMappingToScl(store.mapping(), store.aCents(), store.scaleB(), store.scaleA()!.name);
      const interior = out.split("\n").slice(2, -1);
      const hasDuplicates = interior.some((l, i) => i > 0 && l === interior[i - 1]);
      expect(hasDuplicates).toBe(true);
    });
  });
});
