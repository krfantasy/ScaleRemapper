import { ratioToCents } from "../utils/cents";
import type { ScaleDegree, SourceScale } from "./types";

/**
 * Parse a Scala .scl file string into a SourceScale.
 *
 * Per the Huygens-Fokker Scala .scl spec:
 *   - Lines starting with "!" are comments; blank lines are ignored.
 *   - The first non-comment line is the description; the second is the note
 *     count n; the next n lines are pitch entries.
 *   - An entry is a ratio (e.g. "3/2"), a cents value containing a period
 *     (e.g. "100.0." or "100.0"), or a bare integer (interpreted as a ratio,
 *     so "2" means "2/1"). Entries are cumulative from the root.
 *
 * The returned `degrees` always begins with a synthetic degree 0 = root (0¢),
 * followed by one degree per parsed entry. For an octave-closing scale the
 * final degree is therefore 1200¢ (the octave repeat).
 */
export function parseScl(scl: string): SourceScale {
  const meaningful = scl
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("!"));

  if (meaningful.length < 2) {
    throw new Error("Invalid .scl file: need a description and a note count.");
  }

  // The description may be omitted when the description slot is itself a
  // comment (common in real .scl files that begin with "! filename.scl").
  // In that case the first meaningful line is the count (a bare integer) and
  // there is no description text.
  let description: string;
  let count: number;
  let entryStart: number;

  if (/^\d+$/.test(meaningful[0])) {
    description = "";
    count = parseInt(meaningful[0], 10);
    entryStart = 1;
  } else {
    description = meaningful[0];
    count = parseInt(meaningful[1], 10);
    entryStart = 2;
  }

  if (Number.isNaN(count) || count < 0) {
    throw new Error(`Invalid .scl note count.`);
  }

  const entryLines = meaningful.slice(entryStart, entryStart + count);
  if (entryLines.length < count) {
    throw new Error(
      `Invalid .scl file: expected ${count} entries, found ${entryLines.length}.`,
    );
  }

  const degrees: ScaleDegree[] = [{ degree: 0, cents: 0, raw: "1/1" }];
  for (let i = 0; i < entryLines.length; i++) {
    degrees.push({ degree: i + 1, cents: parseEntry(entryLines[i]), raw: entryLines[i] });
  }

  const lastCents = degrees[degrees.length - 1].cents;
  // periodRaw = verbatim text of the last entry; "" for a root-only scale.
  const periodRaw = degrees.length > 1 ? degrees[degrees.length - 1].raw : "";
  return {
    description,
    degrees,
    periodRaw,
    isOctaveClosing: Math.abs(lastCents - 1200) < 0.01,
  };
}

/** Parse a single .scl pitch entry (ratio, cents, or bare integer) to cents. */
function parseEntry(entry: string): number {
  const t = entry.trim();
  if (t.includes(".")) {
    // Cents value, possibly with the conventional trailing dot(s).
    const v = parseFloat(t.replace(/\.+$/, ""));
    if (Number.isNaN(v)) throw new Error(`Cannot parse cents entry: "${entry}"`);
    return v;
  }
  if (t.includes("/")) {
    const parts = t.split("/");
    if (parts.length !== 2) throw new Error(`Cannot parse ratio entry: "${entry}"`);
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (Number.isNaN(num) || Number.isNaN(den) || den === 0) {
      throw new Error(`Cannot parse ratio entry: "${entry}"`);
    }
    return ratioToCents(num, den);
  }
  // Bare integer → ratio n/1.
  const v = parseFloat(t);
  if (Number.isNaN(v)) throw new Error(`Cannot parse entry: "${entry}"`);
  return ratioToCents(v, 1);
}
