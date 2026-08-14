import { describe, test, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { CircleViz } from "./CircleViz";
import { createStore } from "../state/store";
import type { AuditionController } from "../audio/audition-controller";

const EDO12_A = `! a.scl\nA\n12\n${Array.from({ length: 11 }, (_, i) => `${(i + 1) * 100}.0.`).join("\n")}\n2/1`;

// Minimal audition stub for tests. Tests that don't care about audition pass
// this OFF stub; the interaction tests override `enabled`/`playDot`.
function stubAudition(overrides: Partial<AuditionController> = {}): AuditionController {
  return {
    enabled: () => false,
    settings: () => ({
      waveform: "sine", attackMs: 10, decayMs: 100,
      sustainLevel: 0.7, releaseMs: 200, holdMs: 500,
    }),
    setEnabled: () => {},
    updateSettings: () => {},
    playDot: () => {},
    resume: async () => {},
    dispose: () => {},
    ...overrides,
  } as AuditionController;
}

describe("CircleViz", () => {
  test("shows placeholder when no source loaded", () => {
    const store = createStore();
    const { getByText } = render(() => <CircleViz store={store} audition={stubAudition()} />);
    expect(getByText(/load a scale to begin/i)).toBeInTheDocument();
  });

  test("renders one outer dot per A-degree (minus A's period)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const { container } = render(() => <CircleViz store={store} audition={stubAudition()} />);
    const outerDots = container.querySelectorAll('[data-ring="outer"]');
    // A has 13 degrees; the period (last) is skipped → 12 outer dots.
    expect(outerDots.length).toBe(12);
  });

  test("renders one inner dot per B-degree (minus B's period)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const { container } = render(() => <CircleViz store={store} audition={stubAudition()} />);
    const innerDots = container.querySelectorAll('[data-ring="inner"]');
    // default B = 12-EDO, 13 degrees, period skipped → 12 inner dots.
    expect(innerDots.length).toBe(12);
  });

  test("inner dots show note-name labels when B is the 12-EDO default", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const { container } = render(() => <CircleViz store={store} audition={stubAudition()} />);
    const labels = Array.from(container.querySelectorAll("g > text")).map((n) => n.textContent);
    expect(labels).toContain("C");
    expect(labels).toContain("B");
  });

  test("inner dots show only short degree indices (no cents) when B is a non-default preset", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    store.setBFromPreset(19); // origin 'preset', not 'default'
    const { container } = render(() => <CircleViz store={store} audition={stubAudition()} />);
    const labels = Array.from(container.querySelectorAll("g > text")).map((n) => n.textContent);
    // Cents are intentionally NOT rendered on the circle (kept in the hover
    // tooltip only). Each in-dot label is just the degree index.
    expect(labels.every((t) => !t.includes("·"))).toBe(true);
    expect(labels.every((t) => !t.includes("¢"))).toBe(true);
    expect(labels).not.toContain("C");
    // Degree indices 0..18 should all be present as short numeric strings.
    expect(labels).toContain("0");
    expect(labels).toContain("18");
  });

  test("renders B-degree gridlines (count = B mappable degree count)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const { container } = render(() => <CircleViz store={store} audition={stubAudition()} />);
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
    const { container } = render(() => <CircleViz store={store} audition={stubAudition()} />);
    const badges = container.querySelectorAll('[data-role="collapse-badge"]');
    expect(badges.length).toBeGreaterThan(0);
    const firstBadge = badges[0].textContent ?? "";
    expect(firstBadge).toMatch(/×\d+/);
  });

  test("audition ON: tapping an inner dot calls playDot('B', degree) and does not select", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const playDot = vi.fn();
    const audition = stubAudition({ enabled: () => true, playDot });
    const { container } = render(() => <CircleViz store={store} audition={audition} />);
    const innerDot = container.querySelector('[data-ring="inner"][data-bdegree="3"]') as Element;
    fireEvent.pointerDown(innerDot, { clientX: 0, clientY: 0 });
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 0, clientY: 0 }));
    expect(playDot).toHaveBeenCalledWith("B", 3);
    expect(store.selected()).toBeNull();
  });

  test("audition ON: tapping an outer dot calls playDot('A', degree)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const playDot = vi.fn();
    const audition = stubAudition({ enabled: () => true, playDot });
    const { container } = render(() => <CircleViz store={store} audition={audition} />);
    const outerDot = container.querySelector('[data-ring="outer"][data-degree="4"]') as Element;
    fireEvent.pointerDown(outerDot, { clientX: 0, clientY: 0 });
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 0, clientY: 0 }));
    expect(playDot).toHaveBeenCalledWith("A", 4);
  });

  test("audition ON: drag beyond threshold does NOT connect", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const playDot = vi.fn();
    const audition = stubAudition({ enabled: () => true, playDot });
    const { container } = render(() => <CircleViz store={store} audition={audition} />);
    const innerDot = container.querySelector('[data-ring="inner"][data-bdegree="3"]') as Element;
    fireEvent.pointerDown(innerDot, { clientX: 100, clientY: 100 });
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 500, clientY: 500 }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 500, clientY: 500 }));
    // No assignment written, no selection made, no playDot on a drag.
    expect(store.mapping().assignments[3]).toBeNull();
    expect(store.selected()).toBeNull();
    // NOTE: the onMove early-return (no rubber-band / drop-target while ON) is
    // not directly testable in jsdom — getScreenCTM() returns null, so the
    // rubber-band <Show when={drag() && cursor()}> never mounts regardless of
    // the early-return. Coverage of the early-return comes from spec review and
    // manual Playwright testing (plan §7.3).
  });

  test("selecting a B dot clears the previously selected A-dot highlight", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A");
    const { container } = render(() => <CircleViz store={store} audition={stubAudition()} />);
    const outerDot = container.querySelector('[data-ring="outer"][data-degree="3"]') as Element;
    // Select A-3: local A-highlight applies the selected styling (r=6).
    fireEvent.pointerDown(outerDot, { clientX: 0, clientY: 0 });
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 0, clientY: 0 }));
    expect(store.selected()).toEqual({ ring: "A", degree: 3 });
    expect(outerDot.getAttribute("r")).toBe("6");
    // Then select B-4: the store selection moves to ring B, so the stale
    // A-highlight must clear (unmapped A-3 drops back to r=3.5).
    const innerDot = container.querySelector('[data-ring="inner"][data-bdegree="4"]') as Element;
    fireEvent.pointerDown(innerDot, { clientX: 0, clientY: 0 });
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 0, clientY: 0 }));
    expect(store.selected()).toEqual({ ring: "B", degree: 4 });
    expect(outerDot.getAttribute("r")).toBe("3.5");
  });

  test("octave-wrapped assignment renders a connector and an octave label", () => {
    const store = createStore();
    // Thai Ranat A (period 1200¢), hand-rolled non-octave B extending past 1200¢.
    const thaiA = `! thai.scl\nThai\n7\n!\n161.0\n346.0\n526.0\n686.0\n862.0\n1028.571\n1200.0`;
    store.loadScaleA(thaiA, "Thai");
    const longB = `! long.scl\nLong\n3\n!\n800.0\n1400.0\n2400.0`;
    store.loadScaleB(longB, "Long");
    // B-degrees: 0 (0¢), 1 (800¢), 2 (1400¢), 3 (2400¢ period). Mappable: 0, 1, 2.
    // Connect B-2 (1400¢) → A-1 (161¢). n = round((1400-161)/1200) = 1.
    // Sounded = 1361¢. Dev = -39¢ (red band). The test only asserts existence
    // of the connector and the +1 label, not the colour — colour is covered by
    // the deviation tests in mapping/deviation.test.ts.
    store.connect(2, 1);
    const { container } = render(() => <CircleViz store={store} audition={stubAudition()} />);
    const connector = container.querySelector('line[data-role="connector"][data-bdegree="2"]');
    expect(connector).not.toBeNull();
    const label = container.querySelector('[data-role="octave-label"][data-bdegree="2"]');
    expect(label).not.toBeNull();
    expect(label?.textContent).toMatch(/\+1/);
  });
});
