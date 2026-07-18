import { Show, type Component } from "solid-js";
import type { Store } from "../state/store";
import type { Waveform } from "../audio/synth";
import type { LoadedScale } from "../scl/types";

interface Props {
  store: Store;
  onAudition: (kind: "remapped" | "b") => void;
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

export const SidePanel: Component<Props> = (props) => {
  const sel = () => props.store.selected();

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
          <div class="audition-buttons">
            <button onClick={() => props.onAudition("remapped")}>▶ Remapped</button>
            <button onClick={() => props.onAudition("b")}>▶ {props.store.scaleB().name}</button>
          </div>
          <div class="waveform-select">
            <span>wave</span>
            <select onChange={(e) => props.store.setWaveform((e.target as HTMLSelectElement).value as Waveform)}>
              <option value="sine">sine</option>
              <option value="square">square</option>
              <option value="triangle">triangle</option>
              <option value="sawtooth">saw</option>
            </select>
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
