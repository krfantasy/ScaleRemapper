import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { SidePanel } from "./SidePanel";
import { createStore } from "../state/store";

const EDO12_A = `! a.scl\nA Scale\n12\n${Array.from({ length: 11 }, (_, i) => `${(i + 1) * 100}.0.`).join("\n")}\n2/1`;

describe("SidePanel", () => {
  test("shows 'No scale loaded' when A is null", () => {
    const store = createStore();
    render(() => <SidePanel store={store} onAudition={() => {}} />);
    expect(screen.getByText(/no scale loaded/i)).toBeInTheDocument();
  });

  test("after loading A, shows Scale A section with note count and period", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    render(() => <SidePanel store={store} onAudition={() => {}} />);
    expect(screen.getByText("A Scale")).toBeInTheDocument();
    // Note count and period each appear twice (Scale A is 12-EDO; Scale B defaults
    // to 12-EDO), and the number is wrapped in <strong>, so match against each
    // candidate node's normalized textContent rather than a plain regex.
    const matches = (re: RegExp) =>
      screen.getAllByText((_, node) => !!node?.textContent && re.test(node.textContent));
    expect(matches(/12 notes/i).length).toBeGreaterThanOrEqual(1);
    expect(matches(/2\/1/i).length).toBeGreaterThanOrEqual(1);
  });

  test("Scale B section shows '12-EDO' with 12 notes by default", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    render(() => <SidePanel store={store} onAudition={() => {}} />);
    expect(screen.getAllByText("12-EDO").length).toBeGreaterThan(0);
  });

  test("audition B button label uses scaleB.name", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    render(() => <SidePanel store={store} onAudition={() => {}} />);
    expect(screen.getByRole("button", { name: /▶ 12-edo/i })).toBeInTheDocument();
  });

  test("stats show mapped count out of B mappable degrees (12/12 after autoMap)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    store.runAutoMap();
    render(() => <SidePanel store={store} onAudition={() => {}} />);
    expect(screen.getByText(/12\/12/i)).toBeInTheDocument();
  });

  test("clicking Remapped fires onAudition('remapped')", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    store.select("B", 0);
    const spy = vi.fn();
    render(() => <SidePanel store={store} onAudition={spy} />);
    fireEvent.click(screen.getByRole("button", { name: /remapped/i }));
    expect(spy).toHaveBeenCalledWith("remapped");
  });
});
