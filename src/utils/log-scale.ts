/**
 * Log-scale mapping for time sliders. Slider position p ∈ [0, 1] maps to a value
 * in [min, max] such that the value is geometric (multiplicative) in p — giving
 * fine control at short values and fast ramp at long values.
 *
 *   value = min * (max / min) ^ p
 *   p     = log(value / min) / log(max / min)
 *
 * Both functions clamp their primary argument to range. If min === max, returns
 * the constant (min for posToValue, 0 for valueToPos) — never NaN.
 */

export function posToValue(pos: number, min: number, max: number): number {
  if (min === max) return min;
  const p = Math.min(1, Math.max(0, pos));
  return min * Math.pow(max / min, p);
}

export function valueToPos(value: number, min: number, max: number): number {
  if (min === max) return 0;
  const v = Math.min(max, Math.max(min, value));
  return Math.log(v / min) / Math.log(max / min);
}
