import type { LoadedScale, ScaleDegree, SourceScale } from "./types";

/** Built-in EDO preset values, shown in the TopBar dropdown. */
export const EDO_PRESETS = [12, 19, 22, 31, 41, 53] as const;
const OCTAVE_CENTS = 1200;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Note name for a 12-EDO key (0-11), wrapping mod 12. */
export function noteName(key: number): string {
  return NOTE_NAMES[((key % 12) + 12) % 12];
}

/**
 * Build an octave-closing equal-division-of-octave LoadedScale.
 * Degrees are i * (1200/edo) for i = 0..edo; the final entry's raw is "2/1"
 * (ratio form, since octave EDOs close exactly on 1200¢).
 */
export function edoScale(edo: number): LoadedScale {
  const step = OCTAVE_CENTS / edo;
  const degrees: ScaleDegree[] = [];
  for (let i = 0; i <= edo; i++) {
    const cents = i * step;
    const raw = i === 0 ? "1/1" : i === edo ? "2/1" : formatCentsEntry(cents);
    degrees.push({ degree: i, cents, raw });
  }
  const scale: SourceScale = {
    description: `Equal division of the octave into ${edo} equal parts`,
    degrees,
    periodRaw: "2/1",
    isOctaveClosing: true,
  };
  return { scale, name: `${edo}-EDO`, origin: "preset" };
}

/** Format a cents value for use as an .scl entry text: 6 decimals, trailing zeros stripped, always has a ".". */
function formatCentsEntry(cents: number): string {
  const rounded = Math.round(cents * 1e6) / 1e6;
  let str = rounded.toFixed(6);
  str = str.replace(/0+$/, "").replace(/\.$/, ".0");
  return str;
}

/**
 * Sanitize a scale name for use in an output filename: lowercase, collapse
 * non-alphanumeric runs to a single hyphen, trim leading/trailing hyphens.
 */
export function sanitizeScaleName(name: string): string {
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return cleaned.replace(/^-+|-+$/g, "");
}
