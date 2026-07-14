/** A single degree of a source scale. */
export interface ScaleDegree {
  degree: number; // 0-based index
  cents: number;  // absolute cents from root, in [0, 1200]
}

/** A parsed source scale, result of parsing a .scl file. */
export interface SourceScale {
  description: string;
  degrees: ScaleDegree[];       // includes synthetic degree 0 = root (0¢)
  isOctaveClosing: boolean;     // true if last degree ≈ 1200¢
}
