import { describe, test, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createRoot } from "solid-js";
import { CircleViz } from "./CircleViz";
import { createStore } from "../state/store";

const EDO19_SCL = `! 19edoblend.scl
!
19
!
63.1578947368421
126.315789473684
189.473684210526
252.631578947368
315.789473684211
378.947368421053
442.105263157895
505.263157894737
568.421052631579
631.578947368421
694.736842105263
757.894736842105
821.052631578947
884.210526315789
947.368421052632
1010.52631578947
1073.68421052632
1136.84210526316
2/1`;

function setupStore() {
  let store!: ReturnType<typeof createStore>;
  createRoot(() => { store = createStore(); });
  return store;
}

describe("CircleViz", () => {
  test("renders placeholder when no scale loaded", () => {
    const store = setupStore();
    const { getByText } = render(() => <CircleViz store={store} />);
    expect(getByText(/load a scale/i)).toBeTruthy();
  });

  test("renders outer dots for 19-EDO (octave repeat skipped)", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    const { container } = render(() => <CircleViz store={store} />);
    const outerDots = container.querySelectorAll('[data-ring="outer"]');
    // 19 entries + synthetic root = 20, minus the 2/1 octave repeat (same
    // pitch class as the root, overlaps it at the top) = 19 shown.
    expect(outerDots.length).toBe(19);
  });

  test("renders 12 inner dots", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    const { container } = render(() => <CircleViz store={store} />);
    const innerDots = container.querySelectorAll('[data-ring="inner"]');
    expect(innerDots.length).toBe(12);
  });

  test("renders 12 connectors after auto-map", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    store.runAutoMap();
    const { container } = render(() => <CircleViz store={store} />);
    const connectors = container.querySelectorAll('[data-role="connector"]');
    expect(connectors.length).toBe(12);
  });

  test("clicking (pointer down+up without moving) an inner dot selects it", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    const { container } = render(() => <CircleViz store={store} />);
    const innerDots = container.querySelectorAll('[data-ring="inner"]');
    fireEvent.pointerDown(innerDots[0], { clientX: 0, clientY: 0 });
    fireEvent.pointerUp(window, { clientX: 0, clientY: 0 });
    expect(store.selectedKey()).toBe(0);
  });

  test("connectors carry data-key and a double-click hit area", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    store.runAutoMap();
    const { container } = render(() => <CircleViz store={store} />);
    const hits = container.querySelectorAll('[data-role="connector-hit"]');
    expect(hits.length).toBe(12);
    // Every hit line carries the dest key it would disconnect.
    expect(hits[0].getAttribute("data-key")).not.toBeNull();
  });

  test("double-clicking a connector hit line disconnects that key", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    store.runAutoMap();
    const { container } = render(() => <CircleViz store={store} />);
    const hits = container.querySelectorAll('[data-role="connector-hit"]');
    const key = Number(hits[0].getAttribute("data-key"));
    expect(store.mapping().assignments[key]).not.toBeNull();
    fireEvent.dblClick(hits[0]);
    expect(store.mapping().assignments[key]).toBeNull();
  });

  test("renders zoom toolbar with three controls once a scale is loaded", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    const { getByLabelText } = render(() => <CircleViz store={store} />);
    expect(getByLabelText(/zoom out/i)).toBeTruthy();
    expect(getByLabelText(/reset to fit/i)).toBeTruthy();
    expect(getByLabelText(/zoom in/i)).toBeTruthy();
  });

  test("placeholder view has no zoom toolbar", () => {
    const store = setupStore();
    const { queryByLabelText } = render(() => <CircleViz store={store} />);
    expect(queryByLabelText(/zoom/i)).toBeNull();
  });
});
