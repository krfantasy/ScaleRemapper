import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { SidePanel } from "./SidePanel";
import { createStore } from "../state/store";
import { createAuditionController, DEFAULT_AUDITION_SETTINGS } from "../audio/audition-controller";

const EDO12_A = `! a.scl\nA Scale\n12\n${Array.from({ length: 11 }, (_, i) => `${(i + 1) * 100}.0.`).join("\n")}\n2/1`;

// Mock Synth: avoids constructing a real AudioContext (jsdom doesn't have one).
function mockSynth(): any {
  return {
    setWaveform: vi.fn(),
    getWaveform: vi.fn(() => "sine"),
    playNote: vi.fn(),
    resume: vi.fn(async () => {}),
  };
}

// Build a real controller backed by the mock synth. The controller's logic
// (toggle, settings clamping, dot→cents resolution) is what we're testing here.
function makeAudition() {
  return createAuditionController(createStore(), { synth: mockSynth() });
}

describe("SidePanel", () => {
  test("shows 'No scale loaded' when A is null", () => {
    const store = createStore();
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    expect(screen.getByText(/no scale loaded/i)).toBeInTheDocument();
  });

  test("after loading A, shows Scale A section with note count and period", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    const aSection = document.querySelectorAll("section")[0];
    expect(aSection?.querySelector(".scale-name")?.textContent).toBe("A Scale");
    expect(aSection?.textContent).toMatch(/12 notes/);
    expect(aSection?.textContent).toMatch(/2\/1/);
  });

  test("Scale B section shows '12-EDO' by default", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    expect(screen.getAllByText("12-EDO").length).toBeGreaterThan(0);
  });

  test("stats show mapped count (12/12 after autoMap)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    store.runAutoMap();
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    expect(screen.getByText(/12\/12/i)).toBeInTheDocument();
  });

  test("▶ Remapped and ▶ Pure buttons are absent", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    expect(screen.queryByRole("button", { name: /remapped/i })).toBeNull();
    // The ▶ {scaleB.name} button is gone too — only the toggle should reference audition.
    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => b.textContent ?? "");
    expect(labels.some((l) => /^▶/.test(l))).toBe(false);
  });

  test("audition toggle button renders and reflects OFF state initially", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    const toggle = screen.getByRole("button", { name: /audition/i });
    expect(toggle.textContent).toMatch(/off/i);
  });

  test("clicking the toggle flips the controller's enabled state", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    const toggle = screen.getByRole("button", { name: /audition/i });
    fireEvent.click(toggle);
    expect(audition.enabled()).toBe(true);
  });

  test("toggle gains the 'on' class when enabled (sole ON affordance per spec §5.2)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    const toggle = screen.getByRole("button", { name: /audition/i });
    expect(toggle.classList.contains("on")).toBe(false);
    fireEvent.click(toggle);
    expect(toggle.classList.contains("on")).toBe(true);
  });

  test("five sliders render (attack, decay, sustain, hold, release)", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    for (const name of [/attack/i, /decay/i, /sustain/i, /hold/i, /release/i]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  test("sliders reflect current settings values", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    const attack = screen.getByLabelText(/attack/i) as HTMLInputElement;
    // The slider position is log-scaled; just assert it's a finite number string.
    expect(attack.value).toMatch(/^-?\d+(\.\d+)?$/);
  });

  test("moving a slider calls updateSettings with the resolved value", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    const spy = vi.spyOn(audition, "updateSettings");
    render(() => <SidePanel store={store} audition={audition} />);
    const attack = screen.getByLabelText(/attack/i) as HTMLInputElement;
    fireEvent.input(attack, { target: { value: "500" } });
    expect(spy).toHaveBeenCalled();
    const patch = spy.mock.calls[spy.mock.calls.length - 1][0] as Partial<{ attackMs: number }>;
    expect(typeof patch.attackMs).toBe("number");
    expect(patch.attackMs).toBeGreaterThanOrEqual(1);
    expect(patch.attackMs).toBeLessThanOrEqual(2000);
  });

  test("waveform select binds to settings.waveform", () => {
    const store = createStore();
    store.loadScaleA(EDO12_A, "A Scale");
    const audition = makeAudition();
    render(() => <SidePanel store={store} audition={audition} />);
    const select = screen.getByLabelText(/wave/i) as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_AUDITION_SETTINGS.waveform);
    fireEvent.change(select, { target: { value: "square" } });
    expect(audition.settings().waveform).toBe("square");
  });
});
