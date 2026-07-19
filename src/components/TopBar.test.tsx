import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { TopBar } from "./TopBar";
import { createStore } from "../state/store";

const EDO12 = `! a.scl\nA\n12\n${Array.from({ length: 11 }, (_, i) => `${(i + 1) * 100}.0.`).join("\n")}\n2/1`;

describe("TopBar", () => {
  test("Scale A group shows 'No source loaded' initially", () => {
    const store = createStore();
    render(() => <TopBar store={store} onSave={() => {}} />);
    expect(screen.getByText(/no source loaded/i)).toBeInTheDocument();
  });

  test("Scale B group shows '12-EDO' initially, no reset chip", () => {
    const store = createStore();
    render(() => <TopBar store={store} onSave={() => {}} />);
    // B name renders as "12-EDO"; scope to the B-group's .scale-name span
    // (the second one — index 0 is the A group's "No source loaded").
    const bName = document.querySelectorAll(".scale-name")[1];
    expect(bName?.textContent).toBe("12-EDO");
    expect(screen.queryByTitle(/reset to 12-edo/i)).toBeNull();
  });

  test("picking an EDO preset calls setBFromPreset and shows the reset chip", () => {
    const store = createStore();
    const spy = vi.spyOn(store, "setBFromPreset");
    render(() => <TopBar store={store} onSave={() => {}} />);
    const select = screen.getByLabelText(/edo preset/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "31" } });
    expect(spy).toHaveBeenCalledWith(31);
    expect(screen.getByTitle(/reset to 12-edo/i)).toBeInTheDocument();
  });

  test("Save is disabled until all B-degrees are mapped", () => {
    const store = createStore();
    render(() => <TopBar store={store} onSave={() => {}} />);
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();
    store.loadScaleA(EDO12, "A");
    store.runAutoMap();
    expect(saveBtn).not.toBeDisabled();
  });

  test("Load source .scl button triggers hidden file input", () => {
    const store = createStore();
    render(() => <TopBar store={store} onSave={() => {}} />);
    const input = document.querySelector('input[type="file"][accept=".scl"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  test("Auto-Map and Random-Map are disabled when no source loaded", () => {
    const store = createStore();
    render(() => <TopBar store={store} onSave={() => {}} />);
    expect(screen.getByRole("button", { name: /auto-map/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /random-map/i })).toBeDisabled();
  });

  test("Auto-Map and Random-Map enable after a source scale is loaded", () => {
    const store = createStore();
    store.loadScaleA(EDO12, "A");
    render(() => <TopBar store={store} onSave={() => {}} />);
    expect(screen.getByRole("button", { name: /auto-map/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /random-map/i })).not.toBeDisabled();
  });
});
