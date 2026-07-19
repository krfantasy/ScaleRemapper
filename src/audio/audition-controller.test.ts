import { describe, test, expect, vi } from "vitest";
import { createAuditionController, DEFAULT_AUDITION_SETTINGS } from "./audition-controller";
import { createStore } from "../state/store";
import type { Envelope, Waveform } from "./synth";

const EDO12_A = `! a.scl\nA\n12\n${Array.from({ length: 11 }, (_, i) => `${(i + 1) * 100}.0.`).join("\n")}\n2/1`;

// Mock Synth: captures playNote calls without touching Web Audio.
function mockSynth() {
  const calls: { cents: number; env: Envelope; wave?: Waveform }[] = [];
  return {
    synth: {
      setWaveform: vi.fn(),
      getWaveform: vi.fn(() => "sine" as Waveform),
      playNote: vi.fn((cents: number, env: Envelope, wave?: Waveform) => {
        calls.push({ cents, env, wave });
      }),
      resume: vi.fn(async () => {}),
    } as any,
    calls,
  };
}

describe("AuditionController", () => {
  test("enabled defaults to false", () => {
    const { synth } = mockSynth();
    const c = createAuditionController(createStore(), { synth });
    expect(c.enabled()).toBe(false);
  });

  test("setEnabled toggles the signal", () => {
    const { synth } = mockSynth();
    const c = createAuditionController(createStore(), { synth });
    c.setEnabled(true);
    expect(c.enabled()).toBe(true);
    c.setEnabled(false);
    expect(c.enabled()).toBe(false);
  });

  test("settings defaults match DEFAULT_AUDITION_SETTINGS", () => {
    const { synth } = mockSynth();
    const c = createAuditionController(createStore(), { synth });
    expect(c.settings()).toEqual(DEFAULT_AUDITION_SETTINGS);
  });

  test("updateSettings patches one field, preserves the rest", () => {
    const { synth } = mockSynth();
    const c = createAuditionController(createStore(), { synth });
    c.updateSettings({ attackMs: 500 });
    expect(c.settings().attackMs).toBe(500);
    expect(c.settings().decayMs).toBe(DEFAULT_AUDITION_SETTINGS.decayMs);
  });

  test("updateSettings clamps to allowed ranges", () => {
    const { synth } = mockSynth();
    const c = createAuditionController(createStore(), { synth });
    c.updateSettings({ attackMs: 99999, decayMs: -5, sustainLevel: 2, releaseMs: 0, holdMs: 1 });
    const s = c.settings();
    expect(s.attackMs).toBe(2000);
    expect(s.decayMs).toBe(1);
    expect(s.sustainLevel).toBe(1);
    expect(s.releaseMs).toBe(1);
    expect(s.holdMs).toBe(50);
  });

  test("playDot('A', degree) plays aCents[degree] with current envelope", () => {
    const { synth, calls } = mockSynth();
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const c = createAuditionController(store, { synth });
    c.playDot("A", 3);
    expect(calls).toHaveLength(1);
    // aCents[3] for 12-EDO A is 300
    expect(calls[0].cents).toBe(300);
    expect(calls[0].env.attackMs).toBe(DEFAULT_AUDITION_SETTINGS.attackMs);
  });

  test("playDot('B', degree) mapped plays the remapped A-pitch", () => {
    const { synth, calls } = mockSynth();
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    store.runAutoMap();
    // After autoMap, B-degree 3 should be assigned some A-degree; resolve expected.
    const aDegree = store.mapping().assignments[3]!.aDegree;
    const expectedCents = store.aCents()[aDegree];
    const c = createAuditionController(store, { synth });
    c.playDot("B", 3);
    expect(calls[0].cents).toBe(expectedCents);
  });

  test("playDot('B', degree) unmapped falls back to bCents[degree]", () => {
    const { synth, calls } = mockSynth();
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    // Do NOT autoMap → B-degree 3 is unmapped.
    const c = createAuditionController(store, { synth });
    c.playDot("B", 3);
    expect(calls[0].cents).toBe(store.bCents()[3]);
  });

  test("playDot resumes the synth (autoplay gesture)", () => {
    const { synth } = mockSynth();
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const c = createAuditionController(store, { synth });
    c.playDot("A", 0);
    expect(synth.resume).toHaveBeenCalled();
  });

  test("updateSettings waveform is passed through to playNote", () => {
    const { synth, calls } = mockSynth();
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const c = createAuditionController(store, { synth });
    c.updateSettings({ waveform: "square" });
    c.playDot("A", 0);
    expect(calls[0].wave).toBe("square");
  });

  test("updateSettings waveform also calls synth.setWaveform", () => {
    const { synth } = mockSynth();
    const c = createAuditionController(createStore(), { synth });
    c.updateSettings({ waveform: "square" });
    expect(synth.setWaveform).toHaveBeenCalledWith("square");
  });
});
