import { describe, test, expect, vi } from "vitest";
import { Synth } from "./synth";

// Minimal mock of the Web Audio nodes the Synth uses.
function mockAudioContext() {
  const calls: { type: string; freq: number; start: number; stop: number }[] = [];
  const osc = {
    type: "sine",
    frequency: { setValueAtTime: vi.fn((f: number) => { calls.push({ type: osc.type, freq: f, start: 0, stop: 0 }); }) },
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
  const ctx = {
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => gain),
    destination: {},
    currentTime: 0,
    resume: vi.fn(),
  };
  return { ctx, osc, gain, calls };
}

describe("Synth", () => {
  test("playNote sets frequency from cents and oscillator type", () => {
    const { ctx, osc } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.playNote(100, "square"); // 100¢ above C4 root
    expect(osc.type).toBe("square");
    expect(osc.frequency.setValueAtTime).toHaveBeenCalled();
  });

  test("default waveform is sine", () => {
    const { ctx, osc } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.playNote(0);
    expect(osc.type).toBe("sine");
  });

  test("setWaveform changes the type for subsequent notes", () => {
    const { ctx, osc } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.setWaveform("sawtooth");
    synth.playNote(0);
    expect(osc.type).toBe("sawtooth");
  });

  test("playNote calls start and stop (envelope)", () => {
    const { ctx, osc } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.playNote(0);
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).toHaveBeenCalled();
  });
});
