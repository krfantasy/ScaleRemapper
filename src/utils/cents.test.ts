import { describe, test, expect } from "vitest";
import {
  ratioToCents, centsToFrequency, frequencyToCents,
  NEAREST_NEIGHBOR_RADIUS_CENTS,
} from "./cents";

describe("ratioToCents", () => {
  test("2/1 is 1200 cents", () => expect(ratioToCents(2, 1)).toBeCloseTo(1200, 5));
  test("3/2 is ~701.955 cents", () => expect(ratioToCents(3, 2)).toBeCloseTo(701.955, 3));
  test("1/1 is 0 cents", () => expect(ratioToCents(1, 1)).toBeCloseTo(0, 5));
});

describe("centsToFrequency", () => {
  test("0 cents at 440 ref is 440 Hz", () => expect(centsToFrequency(0, 440)).toBeCloseTo(440, 5));
  test("1200 cents doubles frequency", () => expect(centsToFrequency(1200, 440)).toBeCloseTo(880, 5));
  test("100 cents at 440 ref ~466.16 Hz", () => expect(centsToFrequency(100, 440)).toBeCloseTo(466.164, 3));
});

describe("frequencyToCents", () => {
  test("880 Hz at 440 ref is 1200 cents", () => expect(frequencyToCents(880, 440)).toBeCloseTo(1200, 5));
  test("440 Hz at 440 ref is 0 cents", () => expect(frequencyToCents(440, 440)).toBeCloseTo(0, 5));
});

describe("NEAREST_NEIGHBOR_RADIUS_CENTS", () => {
  test("is 50 cents", () => expect(NEAREST_NEIGHBOR_RADIUS_CENTS).toBe(50));
});
