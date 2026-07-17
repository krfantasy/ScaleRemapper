import type { Mapping } from "../mapping/types";

/**
 * Serialize a mapping + source cents into a 12-note Scala .scl string.
 * Output: description, "12", 11 cents entries (keys 1-11), "2/1".
 */
export function serializeMappingToScl(
  mapping: Mapping,
  sourceCents: number[],
  sourceName: string,
): string {
  if (mapping.assignments.length !== 12) {
    throw new Error(`Expected 12 assignments, got ${mapping.assignments.length}`);
  }
  if (mapping.assignments.some((a) => a === null)) {
    throw new Error("Cannot serialize: not all 12 keys are mapped.");
  }

  const entries: string[] = [];
  for (let key = 1; key <= 11; key++) {
    const a = mapping.assignments[key]!;
    entries.push(formatCents(sourceCents[a.sourceDegree]));
  }
  entries.push("2/1");

  return [
    `! Remapped from ${sourceName} to 12-EDO via Scale Remapper`,
    `!`,
    `Remapped from ${sourceName} to 12-EDO via Scale Remapper`,
    `12`,
    ...entries,
  ].join("\n");
}

function formatCents(cents: number): string {
  const rounded = Math.round(cents * 1e6) / 1e6;
  let str = rounded.toFixed(6);
  str = str.replace(/0+$/, "").replace(/\.$/, ".0");
  return `${str}`;
}
