import { createSignal, createMemo } from "solid-js";
import { parseScl } from "../scl/parser";
import { autoMap } from "../mapping/autoMap";
import { computeStats } from "../mapping/deviation";
import type { Mapping } from "../mapping/types";
import type { SourceScale } from "../scl/types";
import type { Waveform } from "../audio/synth";

const EMPTY_MAPPING: Mapping = {
  assignments: Array.from({ length: 12 }, () => null),
};

export function createStore() {
  const [sourceScale, setSourceScale] = createSignal<SourceScale | null>(null);
  const [mapping, setMapping] = createSignal<Mapping>({ assignments: [...EMPTY_MAPPING.assignments] });
  const [selectedKey, setSelectedKey] = createSignal<number | null>(null);
  const [connectOrigin, setConnectOrigin] = createSignal<
    { kind: "inner"; key: number } | { kind: "outer"; degree: number } | null
  >(null);
  const [waveform, setWaveform] = createSignal<Waveform>("sine");

  // Derived: source cents array (or empty if no scale loaded)
  const sourceCents = createMemo<number[]>(() =>
    sourceScale() ? sourceScale()!.degrees.map((d) => d.cents) : [],
  );

  // Derived: mapping stats
  const stats = createMemo(() => computeStats(mapping(), sourceCents()));

  function loadScale(sclString: string): void {
    const scale = parseScl(sclString);
    setSourceScale(scale);
    setMapping({ assignments: [...EMPTY_MAPPING.assignments] });
    setSelectedKey(null);
  }

  function runAutoMap(): void {
    const cents = sourceCents();
    if (cents.length === 0) return;
    const { mapping: m } = autoMap(cents);
    setMapping(m);
  }

  function connect(destKey: number, sourceDegree: number): void {
    setMapping((prev) => {
      const assignments = [...prev.assignments];
      assignments[destKey] = { destKey, sourceDegree };
      return { assignments };
    });
  }

  function clearMapping(): void {
    setMapping({ assignments: [...EMPTY_MAPPING.assignments] });
    setSelectedKey(null);
  }

  function selectKey(key: number): void {
    setSelectedKey(key);
  }

  function clearSelection(): void {
    setSelectedKey(null);
  }

  function completeConnect(target: { kind: "inner"; key: number } | { kind: "outer"; degree: number }): void {
    const origin = connectOrigin();
    if (!origin) {
      // No origin yet: this click starts a new connect.
      setConnectOrigin(target);
      if (target.kind === "inner") setSelectedKey(target.key);
      return;
    }
    if (origin.kind === target.kind) {
      // Same ring: re-anchor to the new dot.
      setConnectOrigin(target);
      if (target.kind === "inner") setSelectedKey(target.key);
      return;
    }
    // Origin and target are on different rings: form the connection.
    const innerKey = origin.kind === "inner" ? origin.key : (target.kind === "inner" ? target.key : -1);
    const outerDegree = origin.kind === "outer" ? origin.degree : (target.kind === "outer" ? target.degree : -1);
    if (innerKey >= 0 && outerDegree >= 0) {
      connect(innerKey, outerDegree);
    }
    setConnectOrigin(null);
    setSelectedKey(null);
  }

  function cancelConnect(): void {
    setConnectOrigin(null);
    setSelectedKey(null);
  }

  return {
    sourceScale,
    sourceCents,
    mapping,
    selectedKey,
    connectOrigin,
    waveform,
    stats,
    loadScale,
    runAutoMap,
    connect,
    clearMapping,
    selectKey,
    clearSelection,
    completeConnect,
    cancelConnect,
    setWaveform,
  };
}

export type Store = ReturnType<typeof createStore>;
