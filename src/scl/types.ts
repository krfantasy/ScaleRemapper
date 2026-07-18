/** Origin of a loaded scale — drives UI labels and behaviour. */
export type ScaleOrigin = "file" | "preset" | "default";

/** A single degree of a scale. */
export interface ScaleDegree {
  degree: number; // 0-based index
  cents: number;  // absolute cents from root (>= 0; root is 0)
  raw: string;    // the original .scl entry text, verbatim (e.g. "3/2", "700.0.", "2"); root's raw is "1/1"
}

/** A parsed scale, result of parsing a .scl file or generating an EDO preset. */
export interface SourceScale {
  description: string;
  degrees: ScaleDegree[];     // includes synthetic degree 0 = root (0¢), raw = "1/1"
  periodRaw: string;          // verbatim text of the LAST entry (the period/equave); "" if scale has only root
  isOctaveClosing: boolean;   // |lastCents - 1200| < 0.01
}

/**
 * A scale paired with provenance, ready for use as Scale A or Scale B.
 * `name` is a display name: filename, "${edo}-EDO", or "12-EDO".
 */
export interface LoadedScale {
  scale: SourceScale;
  name: string;
  origin: ScaleOrigin;
}
