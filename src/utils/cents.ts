// Standard reference: A4 = 440 Hz. Cents are measured from the scale root (C).
export const NEAREST_NEIGHBOR_RADIUS_CENTS = 50;

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
