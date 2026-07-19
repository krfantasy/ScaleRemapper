import { createSignal } from "solid-js";
import type { Store } from "../state/store";
import { Synth, type Envelope, type Waveform } from "./synth";

export interface AuditionSettings {
  waveform: Waveform;       // "sine" | "square" | "triangle" | "sawtooth"
  attackMs: number;         // 1–2000
  decayMs: number;          // 1–2000
  sustainLevel: number;     // 0–1
  releaseMs: number;        // 1–3000
  holdMs: number;           // 50–5000
}

export const DEFAULT_AUDITION_SETTINGS: AuditionSettings = {
  waveform: "sine",
  attackMs: 10,
  decayMs: 100,
  sustainLevel: 0.7,
  releaseMs: 200,
  holdMs: 500,
};

// Range guards used to clamp incoming slider values.
const RANGES = {
  attackMs: { min: 1, max: 2000 },
  decayMs: { min: 1, max: 2000 },
  sustainLevel: { min: 0, max: 1 },
  releaseMs: { min: 1, max: 3000 },
  holdMs: { min: 50, max: 5000 },
} as const;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export interface AuditionController {
  readonly enabled: () => boolean;
  readonly settings: () => AuditionSettings;
  setEnabled(on: boolean): void;
  updateSettings(patch: Partial<AuditionSettings>): void;
  /** Resolve cents for a ring/degree and trigger a one-shot envelope. */
  playDot(ring: "A" | "B", degree: number): void;
  /** Resume the AudioContext after a user gesture. */
  resume(): Promise<void>;
}

export interface AuditionControllerDeps {
  /** Injected Synth (test seam). If omitted, a real one backed by a new AudioContext is built. */
  synth?: Synth;
}

export function createAuditionController(
  store: Store,
  deps: AuditionControllerDeps = {},
): AuditionController {
  const [enabled, setEnabled] = createSignal(false);
  const [settings, setSettings] = createSignal<AuditionSettings>({ ...DEFAULT_AUDITION_SETTINGS });

  const synth: Synth =
    deps.synth ??
    new Synth(new (window.AudioContext || (window as any).webkitAudioContext)());

  function updateSettings(patch: Partial<AuditionSettings>): void {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      next.attackMs = clamp(next.attackMs, RANGES.attackMs.min, RANGES.attackMs.max);
      next.decayMs = clamp(next.decayMs, RANGES.decayMs.min, RANGES.decayMs.max);
      next.sustainLevel = clamp(next.sustainLevel, RANGES.sustainLevel.min, RANGES.sustainLevel.max);
      next.releaseMs = clamp(next.releaseMs, RANGES.releaseMs.min, RANGES.releaseMs.max);
      next.holdMs = clamp(next.holdMs, RANGES.holdMs.min, RANGES.holdMs.max);
      if (patch.waveform !== undefined) synth.setWaveform(patch.waveform);
      return next;
    });
  }

  function envFromSettings(s: AuditionSettings): Envelope {
    return {
      attackMs: s.attackMs,
      decayMs: s.decayMs,
      sustainLevel: s.sustainLevel,
      releaseMs: s.releaseMs,
      holdMs: s.holdMs,
    };
  }

  function playDot(ring: "A" | "B", degree: number): void {
    void synth.resume();
    const s = settings();
    if (ring === "A") {
      const cents = store.aCents()[degree];
      if (cents === undefined) return;
      synth.playNote(cents, envFromSettings(s), s.waveform);
      return;
    }
    // ring === "B": remapped A-pitch if mapped, else pure B pitch.
    const assignment = store.mapping().assignments[degree];
    const aCents = store.aCents();
    const bCents = store.bCents();
    const cents = assignment && aCents[assignment.aDegree] !== undefined
      ? aCents[assignment.aDegree]
      : bCents[degree];
    if (cents === undefined) return;
    synth.playNote(cents, envFromSettings(s), s.waveform);
  }

  return {
    enabled,
    settings,
    setEnabled,
    updateSettings,
    playDot,
    resume: () => synth.resume(),
  };
}
