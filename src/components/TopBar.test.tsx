import { describe, test, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { createRoot } from "solid-js";
import { TopBar } from "./TopBar";
import { createStore } from "../state/store";

function setupStore(withMapping = false) {
  let store!: ReturnType<typeof createStore>;
  createRoot((dispose) => {
    store = createStore();
    if (withMapping) {
      store.loadScale(`t\n12\n100.0.\n200.0.\n300.0.\n400.0.\n500.0.\n600.0.\n700.0.\n800.0.\n900.0.\n1000.0.\n1100.0.\n2/1`);
      store.runAutoMap();
    }
  });
  return store;
}

describe("TopBar", () => {
  test("renders all four buttons", () => {
    const store = setupStore();
    const { getByText } = render(() => <TopBar store={store} onSave={() => {}} />);
    expect(getByText("Load .scl")).toBeTruthy();
    expect(getByText("Auto-Map")).toBeTruthy();
    expect(getByText("Clear")).toBeTruthy();
    expect(getByText("Save .scl")).toBeTruthy();
  });

  test("Save is disabled when not all keys mapped", () => {
    const store = setupStore();
    const { getByText } = render(() => <TopBar store={store} onSave={() => {}} />);
    expect((getByText("Save .scl") as HTMLButtonElement).disabled).toBe(true);
  });

  test("Save is enabled when all keys mapped", () => {
    const store = setupStore(true);
    const { getByText } = render(() => <TopBar store={store} onSave={() => {}} />);
    expect((getByText("Save .scl") as HTMLButtonElement).disabled).toBe(false);
  });

  test("clicking Auto-Map calls runAutoMap", () => {
    const store = setupStore(true);
    const spy = vi.spyOn(store, "runAutoMap");
    const { getByText } = render(() => <TopBar store={store} onSave={() => {}} />);
    getByText("Auto-Map").click();
    expect(spy).toHaveBeenCalled();
  });
});
