/** A single mapping assignment: dest key k → source degree. */
export interface Assignment {
  destKey: number; // 0-11
  sourceDegree: number; // index into source scale's degrees array
}

/** Mapping from 12-EDO keys to source degrees. assignments[k] is null if unmapped. */
export interface Mapping {
  assignments: (Assignment | null)[];
}

/** Result of auto-mapping a single key: chosen degree + any tie alternative. */
export interface TieResult {
  destKey: number;
  chosenDegree: number;
  tieAltDegree: number | null;
}

/** A collision: multiple dest keys mapped to the same source degree. */
export interface Collision {
  sourceDegree: number;
  destKeys: number[];
}

/** Aggregate mapping quality stats. */
export interface MappingStats {
  mappedCount: number;
  unmappedCount: number;
  avgError: number;
  maxError: number;
  collisions: number;
  ties: number;
}
