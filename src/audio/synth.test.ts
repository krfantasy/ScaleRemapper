import { describe, test, expect, vi } from "vitest";
import { Synth, type Envelope, PEAK_GAIN } from "./synth";

const DEFAULT_ENV: Envelope = {
  attackMs: 10,
  decayMs: 100,
  sustainLevel: 0.7,
  releaseMs: 200,
  holdMs: 500,
};

// Minimal mock of the Web Audio nodes the Synth uses. createOscillator/createGain
// return fresh nodes each call so we can observe monophonic retrigger (stop on prev).
function mockAudioContext() {
  const oscs: any[] = [];
  const gains: any[] = [];
  const makeOsc = () => {
    const osc = {
      type: "sine",
      frequency: { setValueAtTime: vi.fn() },
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    oscs.push(osc);
    return osc;
  };
  const makeGain = () => {
    const gain = {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    gains.push(gain);
    return gain;
  };
  const ctx = {
    createOscillator: vi.fn(makeOsc),
    createGain: vi.fn(makeGain),
    destination: {},
    currentTime: 0,
    state: "suspended",
    resume: vi.fn(),
  };
  return { ctx, oscs, gains };
}

describe("Synth", () => {
  test("playNote sets frequency from cents", () => {
    const { ctx, oscs } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.playNote(100, DEFAULT_ENV);
    expect(oscs[0].frequency.setValueAtTime).toHaveBeenCalled();
  });

  test("default waveform is sine", () => {
    const { ctx, oscs } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.playNote(0, DEFAULT_ENV);
    expect(oscs[0].type).toBe("sine");
  });

  test("setWaveform changes the type for subsequent notes", () => {
    const { ctx, oscs } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.setWaveform("sawtooth");
    synth.playNote(0, DEFAULT_ENV);
    expect(oscs[0].type).toBe("sawtooth");
  });

  test("playNote waveform arg overrides setWaveform", () => {
    const { ctx, oscs } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.setWaveform("sine");
    synth.playNote(0, DEFAULT_ENV, "square");
    expect(oscs[0].type).toBe("square");
  });

  test("playNote calls start and stop", () => {
    const { ctx, oscs } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.playNote(0, DEFAULT_ENV);
    expect(oscs[0].start).toHaveBeenCalled();
    expect(oscs[0].stop).toHaveBeenCalled();
  });

  test("envelope ramps to PEAK_GAIN over attack, then sustainLevel*PEAK_GAIN over decay", () => {
    const { ctx, gains } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.playNote(0, { ...DEFAULT_ENV, attackMs: 10, decayMs: 100, sustainLevel: 0.7 });
    const g = gains[0].gain;
    // attack: 0 → PEAK_GAIN
    expect(g.linearRampToValueAtTime).toHaveBeenCalledWith(PEAK_GAIN, 0.01);
    // decay: PEAK_GAIN → 0.7*PEAK_GAIN
    expect(g.linearRampToValueAtTime).toHaveBeenCalledWith(0.7 * PEAK_GAIN, 0.11);
  });

  test("release ramps to 0 after hold", () => {
    const { ctx, gains } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.playNote(0, { ...DEFAULT_ENV, attackMs: 10, decayMs: 100, sustainLevel: 0.7, holdMs: 500, releaseMs: 200 });
    const g = gains[0].gain;
    // hold ends at attack+decay+hold = 10+100+500 = 610ms; release ends +200ms = 810ms
    expect(g.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.81);
  });

  test("monophonic retrigger: a second playNote stops the previous osc", () => {
    const { ctx, oscs } = mockAudioContext();
    const synth = new Synth(ctx as any);
    synth.playNote(0, DEFAULT_ENV);
    synth.playNote(100, DEFAULT_ENV);
    // The first oscillator must be stopped when the second note fires.
    expect(oscs[0].stop).toHaveBeenCalled();
    expect(oscs.length).toBe(2);
  });

  test("resume delegates to ctx.resume", async () => {
    const { ctx } = mockAudioContext();
    const synth = new Synth(ctx as any);
    await synth.resume();
    expect(ctx.resume).toHaveBeenCalled();
  });
});
