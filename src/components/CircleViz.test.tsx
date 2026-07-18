import { describe, test, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CircleViz } from "./CircleViz";
import { createStore } from "../state/store";

const EDO12_A = `! a.scl\nA\n12\n${Array.from({ length: 11 }, (_, i) => `${(i + 1) * 100}.0.`).join("\n")}\n2/1`;

describe("CircleViz", () => {
  test("shows placeholder when no source loaded", () => {
    const store = createStore();
    const { getByText } = render(() => <CircleViz store={store} />);
    expect(getByText(/load a scale to begin/i)).toBeInTheDocument();
  });

  test("renders one outer dot per A-degree (minus A's period)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const { container } = render(() => <CircleViz store={store} />);
    const outerDots = container.querySelectorAll('[data-ring="outer"]');
    // A has 13 degrees; the period (last) is skipped → 12 outer dots.
    expect(outerDots.length).toBe(12);
  });

  test("renders one inner dot per B-degree (minus B's period)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const { container } = render(() => <CircleViz store={store} />);
    const innerDots = container.querySelectorAll('[data-ring="inner"]');
    // default B = 12-EDO, 13 degrees, period skipped → 12 inner dots.
    expect(innerDots.length).toBe(12);
  });

  test("inner dots show note-name labels when B is the 12-EDO default", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const { container } = render(() => <CircleViz store={store} />);
    const labels = Array.from(container.querySelectorAll("g > text")).map((n) => n.textContent);
    expect(labels).toContain("C");
    expect(labels).toContain("B");
  });

  test("inner dots show degree·cents labels when B is a non-default preset", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    store.setBFromPreset(19); // origin 'preset', not 'default'
    const { container } = render(() => <CircleViz store={store} />);
    const labels = Array.from(container.querySelectorAll("g > text")).map((n) => n.textContent);
    // No "C" note names; instead degree·cents labels.
    expect(labels.some((t) => t?.includes("·"))).toBe(true);
    expect(labels).not.toContain("C");
  });

  test("renders B-degree gridlines (count = B mappable degree count)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const { container } = render(() => <CircleViz store={store} />);
    const gridlines = container.querySelectorAll('line[data-role="gridline"]');
    // default B = 12-EDO → 12 gridlines.
    expect(gridlines.length).toBe(12);
  });

  test("renders a ×N collapse badge on an A-degree with multiple B-degrees collapsed onto it", () => {
    const store = createStore();
    // A with 3 mappable notes: 0, 200, 400 (+ period 1200)
    const sparseA = `! a.scl\nA\n3\n200.0.\n400.0.\n2/1`;
    store.loadScaleA(sparseA, "A");
    store.runAutoMap(); // multiple B-degrees will collapse onto sparse A-degrees
    const { container } = render(() => <CircleViz store={store} />);
    const badges = container.querySelectorAll('[data-role="collapse-badge"]');
    expect(badges.length).toBeGreaterThan(0);
    const firstBadge = badges[0].textContent ?? "";
    expect(firstBadge).toMatch(/×\d+/);
  });
});
