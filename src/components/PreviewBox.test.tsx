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

  test("readable view deviation uses displaced cents for wrapped assignments", () => {
    // Regression for the integration bug where the readable view bypassed
    // displacedCents and showed the within-period deviation. Thai Ranat A
    // (period 1200¢), 11 ED3 B (period 1901.955¢); B-10 → A-3 +1oct should
    // show ~-3¢ (green), not ~-1203¢ (red, the pre-fix within-period value).
    const store = setupStore();
    const thaiA = `! thai.scl\nThai\n7\n!\n161.0\n346.0\n526.0\n686.0\n862.0\n1028.571\n1200.0`;
    const ed3B = `! 11.scl\n11 ED3\n11\n!\n172.905\n345.810\n518.715\n691.620\n864.525\n1037.430\n1210.335\n1383.240\n1556.145\n1729.050\n3/1`;
    store.loadScaleA(thaiA, "Thai");
    store.loadScaleB(ed3B, "11 ED3");
    store.runAutoMap();
    const { container } = render(() => <PreviewBox store={store} />);
    const pre = container.querySelector("pre");
    // B-10's readable line is the last non-empty line (B-degree 10, the highest
    // mappable). Find the line containing the B-10 label fragment.
    const text = pre?.textContent ?? "";
    // The last line corresponds to B-10. Its deviation must be ~-3.0¢, NOT ~-1203.0¢.
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toMatch(/−3\.0¢/); // unicode minus from fmtSigned
    expect(lastLine).not.toMatch(/1203/);
  });
});
