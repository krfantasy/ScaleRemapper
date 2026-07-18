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

const EDO12_A = `! a.scl\nA Scale\n12\n${Array.from({ length: 11 }, (_, i) => `${(i + 1) * 100}.0.`).join("\n")}\n2/1`;

describe("PreviewBox", () => {
  test("raw view shows the new header naming A and B", async () => {
    const user = userEvent.setup();
    const store = setupStore();
    store.loadScaleA(EDO12_A, "A Scale");
    store.runAutoMap();
    const { container, getByText } = render(() => <PreviewBox store={store} />);
    await user.click(getByText("Raw .scl"));
    const pre = container.querySelector("pre");
    expect(pre?.textContent ?? "").toContain("Remapped A Scale onto 12-EDO");
  });

  test("raw view ends with B's period (2/1 for default B)", async () => {
    const user = userEvent.setup();
    const store = setupStore();
    store.loadScaleA(EDO12_A, "A Scale");
    store.runAutoMap();
    const { container, getByText } = render(() => <PreviewBox store={store} />);
    await user.click(getByText("Raw .scl"));
    const pre = container.querySelector("pre");
    expect(pre?.textContent ?? "").toMatch(/2\/1\s*$/);
  });

  test("raw view line count matches B (count + entries for 12-EDO = 13 non-comment lines)", async () => {
    const user = userEvent.setup();
    const store = setupStore();
    store.loadScaleA(EDO12_A, "A Scale");
    store.runAutoMap();
    const { container, getByText } = render(() => <PreviewBox store={store} />);
    await user.click(getByText("Raw .scl"));
    const pre = container.querySelector("pre");
    // Output = [header, count, ...entries]. Header starts with "! Remapped..." → filtered as comment.
    // Remaining = count line "12" + 12 entries = 13 lines.
    const lines = (pre?.textContent ?? "").split("\n").filter((l) => l.trim() !== "" && !l.startsWith("!"));
    expect(lines.length).toBe(13);
  });

  test("B=19-EDO produces 19-entry output (count + 19 entries = 20 lines)", async () => {
    const user = userEvent.setup();
    const store = setupStore();
    store.loadScaleA(EDO12_A, "A");
    store.setBFromPreset(19);
    store.runAutoMap();
    const { container, getByText } = render(() => <PreviewBox store={store} />);
    await user.click(getByText("Raw .scl"));
    const pre = container.querySelector("pre");
    const lines = (pre?.textContent ?? "").split("\n").filter((l) => l.trim() !== "" && !l.startsWith("!"));
    expect(lines.length).toBe(20);
  });

  test("readable view shows one line per B-degree", async () => {
    const store = setupStore();
    store.loadScaleA(EDO12_A, "A Scale");
    store.runAutoMap();
    const { container } = render(() => <PreviewBox store={store} />);
    // default view is readable; one <span> per B-degree = 12 lines
    const pre = container.querySelector("pre");
    const lines = (pre?.textContent ?? "").split("\n").filter((l) => l.trim() !== "");
    expect(lines.length).toBe(12);
  });
});
