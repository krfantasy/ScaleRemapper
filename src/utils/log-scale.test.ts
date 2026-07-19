import { describe, test, expect } from "vitest";
import { posToValue, valueToPos } from "./log-scale";

describe("log-scale", () => {
  test("posToValue at 0 returns min; at 1 returns max", () => {
    expect(posToValue(0, 1, 2000)).toBe(1);
    expect(posToValue(1, 1, 2000)).toBe(2000);
  });

  test("posToValue is logarithmic (midpoint is geometric mean, not arithmetic)", () => {
    // geometric mean of 1 and 2000 = sqrt(2000) ≈ 44.72
    expect(posToValue(0.5, 1, 2000)).toBeCloseTo(Math.sqrt(2000), 2);
  });

  test("posToValue clamps out-of-range pos", () => {
    expect(posToValue(-0.5, 1, 2000)).toBe(1);
    expect(posToValue(1.5, 1, 2000)).toBe(2000);
  });

  test("valueToPos is the inverse of posToValue", () => {
    const v = posToValue(0.3, 1, 2000);
    expect(valueToPos(v, 1, 2000)).toBeCloseTo(0.3, 4);
  });

  test("valueToPos clamps out-of-range value", () => {
    expect(valueToPos(0, 1, 2000)).toBe(0);
    expect(valueToPos(5000, 1, 2000)).toBe(1);
  });

  test("min equals max collapses to a constant (no NaN)", () => {
    expect(posToValue(0.5, 5, 5)).toBe(5);
    expect(valueToPos(5, 5, 5)).toBe(0);
  });
});
