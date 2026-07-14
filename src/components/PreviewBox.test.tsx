import { describe, test, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { createRoot } from "solid-js";
import { PreviewBox } from "./PreviewBox";
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

describe("PreviewBox", () => {
  test("renders a read-only pre element", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    store.runAutoMap();
    const { container } = render(() => <PreviewBox store={store} />);
    const pre = container.querySelector("pre");
    expect(pre).toBeTruthy();
  });

  test("readable view shows 12 note lines when fully mapped", () => {
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    store.runAutoMap();
    const { container } = render(() => <PreviewBox store={store} />);
    const pre = container.querySelector("pre")!;
    const lines = pre.textContent!.split("\n").filter((l) => l.trim() !== "");
    expect(lines.length).toBe(12);
  });

  test("raw view shows .scl format", async () => {
    const user = userEvent.setup();
    const store = setupStore();
    store.loadScale(EDO19_SCL);
    store.runAutoMap();
    const { container, getByText } = render(() => <PreviewBox store={store} />);
    await user.click(getByText("Raw .scl"));
    const pre = container.querySelector("pre")!;
    expect(pre.textContent).toContain("12");
    expect(pre.textContent).toContain("2/1");
  });
});
