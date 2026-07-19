import { centsToFrequency } from "../utils/cents";

export type Waveform = "sine" | "square" | "triangle" | "sawtooth";

/** User-tunable envelope shape. Gain is scaled relative to PEAK_GAIN. */
export interface Envelope {
  attackMs: number;
  decayMs: number;
  sustainLevel: number;   // 0–1, fraction of peak
  releaseMs: number;
  holdMs: number;
}

/** Internal peak gain (not user-tunable). Matches the previous hardcoded amplitude. */
export const PEAK_GAIN = 0.3;

type Voice = { osc: OscillatorNode; gain: GainNode };

/**
 * Thin wrapper around Web Audio for click-to-audition.
 * One oscillator + gain envelope per note; monophonic (a new note cuts the previous).
 */
export class Synth {
  private waveform: Waveform = "sine";
  private voice: Voice | null = null;

  constructor(private ctx: AudioContext) {}

  setWaveform(w: Waveform): void {
    this.waveform = w;
  }

  getWaveform(): Waveform {
    return this.waveform;
  }

  /** One-shot: A→D→S(hold)→R. Monophonic — cuts any in-flight voice first. */
  playNote(centsFromRoot: number, env: Envelope, waveform?: Waveform): void {
    const type = waveform ?? this.waveform;
    const now = this.ctx.currentTime;

    // Cut the previous voice (monophonic retrigger). A short 5ms click-free ramp
    // down before stop keeps the discontinuity inaudible.
    if (this.voice) {
      const v = this.voice;
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(0, now + 0.005);
      v.osc.stop(now + 0.006);
      this.voice = null;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(centsToFrequency(centsFromRoot), now);

    const peak = PEAK_GAIN;
    const sustain = peak * env.sustainLevel;
    const tAttack = now + env.attackMs / 1000;
    const tDecay = tAttack + env.decayMs / 1000;
    const tReleaseStart = tDecay + env.holdMs / 1000;
    const tReleaseEnd = tReleaseStart + env.releaseMs / 1000;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, tAttack);
    gain.gain.linearRampToValueAtTime(sustain, tDecay);
    gain.gain.setValueAtTime(sustain, tReleaseStart);
    gain.gain.linearRampToValueAtTime(0, tReleaseEnd);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(tReleaseEnd + 0.05);

    this.voice = { osc, gain };
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }
}
