/** A single mapping assignment: B-degree b → A-degree a. */
export interface Assignment {
  bDegree: number;  // index into Scale B's degrees array
  aDegree: number;  // index into Scale A's degrees array
}

/** Mapping from B-degrees to A-degrees. assignments[b] is null if unmapped.
 *  Length === Scale B's degree count. */
export interface Mapping {
  assignments: (Assignment | null)[];
}

/** Result of auto-mapping a single B-degree: chosen A-degree + any tie alternative. */
export interface TieResult {
  bDegree: number;
  chosenADegree: number;
  tieAltADegree: number | null;
}

/** A collision (a.k.a. collapse): multiple B-degrees mapped to the same A-degree.
 *  For A→B this is expected when A is sparser than B; flagged, never blocks export. */
export interface Collision {
  aDegree: number;
  bDegrees: number[];
}

/** Aggregate mapping quality stats. `collapses` counts B-degrees involved in any collision. */
export interface MappingStats {
  mappedCount: number;
  unmappedCount: number;
  collapses: number;
  avgError: number;
  maxError: number;
  collisions: number;
  ties: number;
}
