import { For, Show, type Component } from "solid-js";
import type { Store } from "../state/store";
import type { AuditionController, AuditionSettings } from "../audio/audition-controller";
import type { LoadedScale } from "../scl/types";
import type { Waveform } from "../audio/synth";
import { posToValue, valueToPos } from "../utils/log-scale";

interface Props {
  store: Store;
  audition: AuditionController;
}

function ScaleBlock(props: { loaded: LoadedScale | null; fallback: string }) {
  return (
    <Show when={props.loaded} fallback={<div>{props.fallback}</div>}>
      <div class="scale-name">{props.loaded!.name}</div>
      <div class="scale-info"><strong>{props.loaded!.scale.degrees.length - 1}</strong> notes</div>
      <div class="scale-info">period: <strong>{props.loaded!.scale.periodRaw}</strong></div>
      <div class="scale-info">{props.loaded!.scale.isOctaveClosing ? "octave-closing" : "non-octave"}</div>
    </Show>
  );
}

// Range metadata per slider. Sustain is a level (0–1, linear); the others are
// log-scale time sliders.
const TIME_RANGES = {
  attackMs: { min: 1, max: 2000 },
  decayMs: { min: 1, max: 2000 },
  releaseMs: { min: 1, max: 3000 },
  holdMs: { min: 50, max: 5000 },
} as const;

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export const SidePanel: Component<Props> = (props) => {
  const sel = () => props.store.selected();
  const s = () => props.audition.settings();
  const enabled = () => props.audition.enabled();

  // Slider value is a 0..1000 integer; converted to/from the actual time via log-scale.
  const SLIDER_MAX = 1000;

  function timeSliderField<K extends keyof typeof TIME_RANGES>(
    key: K,
    label: string,
  ) {
    const range = TIME_RANGES[key];
    const value = () => s()[key];
    const pos = () => valueToPos(value(), range.min, range.max) * SLIDER_MAX;
    const onInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const pos01 = Number(target.value) / SLIDER_MAX;
      const v = posToValue(pos01, range.min, range.max);
      props.audition.updateSettings({ [key]: v } as Partial<AuditionSettings>);
    };
    return (
      <label class="slider-row">
        <span class="slider-label">{label}</span>
        <input
          type="range" min={0} max={SLIDER_MAX} step={1}
          aria-label={label}
          value={pos()}
          onInput={onInput}
        />
        <span class="slider-value">{formatMs(value())}</span>
      </label>
    );
  }

  return (
    <div class="side-panel">
      <Show when={props.store.scaleA()} fallback={<div>No scale loaded</div>}>
        <section>
          <div class="label">Scale A (source)</div>
          <ScaleBlock loaded={props.store.scaleA()} fallback="No source loaded" />
        </section>
        <hr />
        <section>
          <div class="label">Scale B (dest)</div>
          <ScaleBlock loaded={props.store.scaleB()} fallback="" />
        </section>
        <hr />
        <section>
          <div class="label">Selected</div>
          <Show when={sel()} fallback={<div>—</div>}>
            <div class="selected-note">{sel()!.ring} degree {sel()!.degree}</div>
          </Show>
        </section>
        <hr />
        <section>
          <div class="label">Audition</div>
          <button
            class="audition-toggle"
            classList={{ on: enabled() }}
            onClick={() => props.audition.setEnabled(!enabled())}
          >
            🎧 Audition: {enabled() ? "On" : "Off"}
          </button>
          <div class="audition-sliders">
            <label class="slider-row">
              <span class="slider-label">wave</span>
              <select
                aria-label="wave"
                value={s().waveform}
                onChange={(e) =>
                  props.audition.updateSettings({
                    waveform: (e.target as HTMLSelectElement).value as Waveform,
                  })
                }
              >
                <option value="sine">sine</option>
                <option value="square">square</option>
                <option value="triangle">triangle</option>
                <option value="sawtooth">saw</option>
              </select>
            </label>
            {timeSliderField("attackMs", "Attack")}
            {timeSliderField("decayMs", "Decay")}
            <label class="slider-row">
              <span class="slider-label">Sustain</span>
              <input
                type="range" min={0} max={1} step={0.01}
                aria-label="Sustain"
                value={s().sustainLevel}
                onInput={(e) =>
                  props.audition.updateSettings({
                    sustainLevel: Number((e.target as HTMLInputElement).value),
                  })
                }
              />
              <span class="slider-value">{s().sustainLevel.toFixed(2)}</span>
            </label>
            {timeSliderField("holdMs", "Hold")}
            {timeSliderField("releaseMs", "Release")}
          </div>
        </section>
        <hr />
        <section>
          <div class="label">Mapping Stats</div>
          <div>mapped: <strong>{props.store.stats().mappedCount}/{props.store.bCents().length - 1}</strong></div>
          <div>avg error: <strong>{props.store.stats().avgError.toFixed(1)}¢</strong></div>
          <div>max error: <strong>{props.store.stats().maxError.toFixed(1)}¢</strong></div>
          <div>collapses: <strong>{props.store.stats().collapses}</strong></div>
          <div>collisions: <strong>{props.store.stats().collisions}</strong></div>
          <div>ties: <strong>{props.store.stats().ties}</strong></div>
        </section>
      </Show>
    </div>
  );
};
