import { For, type Component } from "solid-js";
import type { Store } from "../state/store";
import { EDO_PRESETS } from "../scl/edo";

interface Props {
  store: Store;
  onSave: () => void;
}

export const TopBar: Component<Props> = (props) => {
  let aInput: HTMLInputElement | undefined;
  let bInput: HTMLInputElement | undefined;

  const handleAFile = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((text) => props.store.loadScaleA(text, file.name.replace(/\.scl$/i, "")));
    input.value = "";
  };
  const handleBFile = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((text) => props.store.loadScaleB(text, file.name.replace(/\.scl$/i, "")));
    input.value = "";
  };

  const canSave = () =>
    props.store.scaleA() !== null &&
    props.store.stats().mappedCount === props.store.bCents().length - 1;

  return (
    <div class="topbar">
      <div class="topbar-title">🎵 Scale Remapper</div>
      <div class="topbar-actions">
        <div class="scale-group">
          <span class="scale-label">A:</span>
          <input ref={aInput} type="file" accept=".scl" style={{ display: "none" }} onChange={handleAFile} />
          <button onClick={() => aInput?.click()}>📂 Load source .scl</button>
          <span class="scale-name">{props.store.scaleA()?.name ?? "No source loaded"}</span>
        </div>
        <div class="scale-group">
          <span class="scale-label">B:</span>
          <input ref={bInput} type="file" accept=".scl" style={{ display: "none" }} onChange={handleBFile} />
          <button onClick={() => bInput?.click()}>📂 Load dest .scl</button>
          <select
            aria-label="EDO preset"
            value={props.store.scaleB().origin === "preset" ? props.store.scaleB().name.replace("-EDO", "") : ""}
            onChange={(e) => props.store.setBFromPreset(Number((e.target as HTMLSelectElement).value))}
          >
            <option value="" disabled>EDO…</option>
            <For each={[...EDO_PRESETS]}>{(edo) => <option value={edo}>{edo}-EDO</option>}</For>
          </select>
          <span class="scale-name">{props.store.scaleB().name}</span>
          {props.store.scaleB().origin !== "default" && (
            <button title="Reset to 12-EDO" onClick={() => props.store.resetBToDefault()}>↺ 12-EDO</button>
          )}
        </div>
        <button disabled={props.store.scaleA() === null} onClick={() => props.store.runAutoMap()}>⚡ Auto-Map</button>
        <button disabled={props.store.scaleA() === null} onClick={() => props.store.runRandomMap()}>🎲 Random-Map</button>
        <button onClick={() => props.store.clearMapping()}>✕ Clear</button>
        <button disabled={!canSave()} onClick={() => props.onSave()}>💾 Save .scl</button>
      </div>
    </div>
  );
};
