import { Show, type Component } from "solid-js";
import type { Store } from "../state/store";
import type { Waveform } from "../audio/synth";
import { noteName } from "../utils/cents";

interface Props {
  store: Store;
  onAudition: (kind: "remapped" | "edo12") => void;
}

export const SidePanel: Component<Props> = (props) => {
  const scale = () => props.store.sourceScale();
  const selKey = () => props.store.selectedKey();

  return (
    <div class="side-panel">
      <Show when={scale()} fallback={<div>No scale loaded</div>}>
        <section>
          <div class="label">Source Scale</div>
          <div class="scale-name">{scale()!.description}</div>
          <div class="scale-info"><strong>{scale()!.degrees.length - 1}</strong> notes</div>
        </section>
        <hr />
        <section>
          <div class="label">Selected Note</div>
          <Show when={selKey() !== null} fallback={<div>—</div>}>
            <div class="selected-note">{noteName(selKey()!)}</div>
          </Show>
        </section>
        <hr />
        <section>
          <div class="label">Audition</div>
          <div class="audition-buttons">
            <button onClick={() => props.onAudition("remapped")}>▶ Remapped</button>
            <button onClick={() => props.onAudition("edo12")}>▶ 12-EDO</button>
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
          <div>mapped: <strong>{props.store.stats().mappedCount}/12</strong></div>
          <div>avg error: <strong>{props.store.stats().avgError.toFixed(1)}¢</strong></div>
          <div>collisions: <strong>{props.store.stats().collisions}</strong></div>
        </section>
      </Show>
    </div>
  );
};
