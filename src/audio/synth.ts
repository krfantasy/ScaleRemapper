import { centsToFrequency } from "../utils/cents";

export type Waveform = "sine" | "square" | "triangle" | "sawtooth";

/**
 * Thin wrapper around Web Audio for click-to-audition.
 * One oscillator + gain envelope per note; lightweight and disposable.
 */
export class Synth {
  private waveform: Waveform = "sine";

  constructor(private ctx: AudioContext) {}

  setWaveform(w: Waveform): void {
    this.waveform = w;
  }

  getWaveform(): Waveform {
    return this.waveform;
  }

  /** Play a note at `centsFromRoot` cents above C4, for `duration` seconds. */
  playNote(centsFromRoot: number, waveform?: Waveform): void {
    const type = waveform ?? this.waveform;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(centsToFrequency(centsFromRoot), now);

    // Simple ADSR-ish envelope: quick attack, exponential-ish decay, release.
    const duration = 1.2;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }
}
