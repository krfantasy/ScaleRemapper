import { describe, test, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createRoot } from "solid-js";
import { SidePanel } from "./SidePanel";
import { createStore } from "../state/store";

function setupStore() {
  let store!: ReturnType<typeof createStore>;
  createRoot(() => { store = createStore(); });
  return store;
}

const EDO19_SCL = `19edo
19
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

describe("SidePanel", () => {
  test("shows placeholder when no scale", () => {
    const store = setupStore();
    const { getByText } = render(() => <SidePanel store={store} onAudition={() => {}} />);
    expect(getByText(/no scale/i)).toBeTruthy();
  });

  test("shows source scale info when loaded", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    const { getByText } = render(() => <SidePanel store={store} onAudition={() => {}} />);
    expect(getByText("19")).toBeTruthy();
  });

  test("shows audition buttons and waveform select", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    const { getByText, container } = render(() => <SidePanel store={store} onAudition={() => {}} />);
    expect(getByText(/remapped/i)).toBeTruthy();
    expect(getByText(/12-edo/i)).toBeTruthy();
    const select = container.querySelector("select");
    expect(select).toBeTruthy();
    expect(select!.options.length).toBe(4);
  });

  test("shows stats section", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    store.runAutoMap();
    const { getByText } = render(() => <SidePanel store={store} onAudition={() => {}} />);
    expect(getByText(/mapped:/i)).toBeTruthy();
    expect(getByText(/collision/i)).toBeTruthy();
  });
});
