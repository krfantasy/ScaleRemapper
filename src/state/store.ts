import { createSignal, createMemo } from "solid-js";
import { parseScl } from "../scl/parser";
import { autoMap, randomMap } from "../mapping/autoMap";
import { computeStats } from "../mapping/deviation";
import { edoScale } from "../scl/edo";
import type { Mapping, Assignment } from "../mapping/types";
import type { LoadedScale } from "../scl/types";

type Selection = { ring: "A" | "B"; degree: number } | null;

/** A failed scale load. `source` names which slot ('A' or 'B') and `filename`
 *  is the display name passed to loadScaleA/B so the banner can say which file. */
export interface LoadError {
  source: "A" | "B";
  filename: string;
  message: string;
}

function emptyMapping(length: number): Mapping {
  return { assignments: Array.from({ length }, () => null) };
}

/** Safe error-message extraction; falls back to a generic string for non-Errors. */
function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createStore() {
  const [scaleA, setScaleA] = createSignal<LoadedScale | null>(null);
  // Default 12-EDO is tagged 'default' (not 'preset') so the UI shows note names.
  // edoScale() returns origin 'preset'; override on initialization.
  const initialB = edoScale(12);
  initialB.origin = "default";
  const [scaleB, setScaleB] = createSignal<LoadedScale>(initialB);

  const bMappable = () => Math.max(0, scaleB().scale.degrees.length - 1);
  const [mapping, setMapping] = createSignal<Mapping>(emptyMapping(bMappable()));
  const [selected, setSelected] = createSignal<Selection>(null);
  // Last load failure (A or B), surfaced as a dismissible banner in the UI.
  // Null on a successful load or after clearLoadError(). parseScl throws before
  // any scale signal is mutated, so on failure the prior scale stays intact.
  const [loadError, setLoadError] = createSignal<LoadError | null>(null);

  const aCents = createMemo<number[]>(() =>
    scaleA() ? scaleA()!.scale.degrees.map((d) => d.cents) : [],
  );
  const bCents = createMemo<number[]>(() => scaleB().scale.degrees.map((d) => d.cents));
  // A's period: the cents of its last degree (A's period/equave). 0 when A is null
  // (no wrap possible — playDot and autoMap treat this as "no wrap").
  const periodA = createMemo<number>(() => {
    const a = aCents();
    return a.length > 0 ? a[a.length - 1] : 0;
  });
  const stats = createMemo(() => computeStats(mapping(), aCents(), bCents(), periodA()));

  function resetMapping(): void {
    setMapping(emptyMapping(bMappable()));
    setSelected(null);
  }

  function loadScaleA(sclString: string, name: string): void {
    try {
      const scale = parseScl(sclString);
      setScaleA({ scale, name, origin: "file" });
      resetMapping();
      setLoadError(null);
    } catch (err) {
      setLoadError({ source: "A", filename: name, message: errMsg(err) });
    }
  }

  function loadScaleB(sclString: string, name: string): void {
    try {
      const scale = parseScl(sclString);
      setScaleB({ scale, name, origin: "file" });
      resetMapping();
      setLoadError(null);
    } catch (err) {
      setLoadError({ source: "B", filename: name, message: errMsg(err) });
    }
  }

  function clearLoadError(): void {
    setLoadError(null);
  }

  /** Surface a load failure raised outside parseScl (e.g. a File.text() I/O rejection). */
  function reportLoadError(source: "A" | "B", filename: string, message: unknown): void {
    setLoadError({ source, filename, message: errMsg(message) });
  }

  function setBFromPreset(edo: number): void {
    setScaleB(edoScale(edo));
    resetMapping();
  }

  function resetBToDefault(): void {
    const d = edoScale(12);
    d.origin = "default";
    setScaleB(d);
    resetMapping();
  }

  function runAutoMap(): void {
    const a = aCents();
    const b = bCents();
    if (a.length === 0 || b.length === 0) return;
    const { mapping: m } = autoMap(a, b, periodA());
    setMapping(m);
  }

  function runRandomMap(): void {
    const a = aCents();
    const b = bCents();
    if (a.length === 0 || b.length === 0) return;
    const { mapping: m } = randomMap(a, b, periodA());
    setMapping(m);
  }

  function connect(bDegree: number, aDegree: number): void {
    setMapping((prev) => {
      const assignments = [...prev.assignments];
      const a: Assignment = { bDegree, aDegree };
      assignments[bDegree] = a;
      return { assignments };
    });
  }

  function disconnect(bDegree: number): void {
    setMapping((prev) => {
      if (prev.assignments[bDegree] === null) return prev;
      const assignments = [...prev.assignments];
      assignments[bDegree] = null;
      return { assignments };
    });
  }

  function clearMapping(): void {
    resetMapping();
  }

  function select(ring: "A" | "B", degree: number): void {
    setSelected({ ring, degree });
  }

  function clearSelection(): void {
    setSelected(null);
  }

  return {
    scaleA,
    scaleB,
    mapping,
    selected,
    loadError,
    aCents,
    periodA,
    bCents,
    stats,
    loadScaleA,
    loadScaleB,
    setBFromPreset,
    resetBToDefault,
    runAutoMap,
    runRandomMap,
    connect,
    disconnect,
    clearMapping,
    select,
    clearSelection,
    clearLoadError,
    reportLoadError,
  };
}

export type Store = ReturnType<typeof createStore>;
