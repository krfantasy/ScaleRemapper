// Standard reference: A4 = 440 Hz. Cents are measured from the scale root (C).
export const NEAREST_NEIGHBOR_RADIUS_CENTS = 50;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Convert a just-intonation ratio to cents. */
export function ratioToCents(numerator: number, denominator: number): number {
  return 1200 * Math.log2(numerator / denominator);
}

/**
 * Convert an absolute-cents offset from a root to a frequency in Hz.
 * Default root is C4 (≈261.6256 Hz) so 0¢ → C4.
 */
export function centsToFrequency(centsFromRoot: number, rootFrequency = 261.6256): number {
  return rootFrequency * Math.pow(2, centsFromRoot / 1200);
}

/** Inverse of centsToFrequency. */
export function frequencyToCents(frequency: number, rootFrequency = 261.6256): number {
  return 1200 * Math.log2(frequency / rootFrequency);
}

/** Note name for a 12-EDO key (0-11), wrapping mod 12. */
export function noteName(key: number): string {
  return NOTE_NAMES[((key % 12) + 12) % 12];
}

/** The cents value of a 12-EDO destination key (0-11). */
export function destCents(key: number): number {
  return key * 100;
}
