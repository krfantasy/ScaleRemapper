import type { Component } from "solid-js";
import type { Store } from "../state/store";

interface Props {
  store: Store;
  onSave: () => void;
}

export const TopBar: Component<Props> = (props) => {
  let fileInput: HTMLInputElement | undefined;

  const handleFile = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((text) => props.store.loadScale(text));
    input.value = "";
  };

  const canSave = () => props.store.stats().mappedCount === 12;

  return (
    <div class="topbar">
      <div class="topbar-title">🎵 Scale Remapper</div>
      <div class="topbar-actions">
        <input ref={fileInput} type="file" accept=".scl" style={{ display: "none" }} onChange={handleFile} />
        <button onClick={() => fileInput?.click()}>Load .scl</button>
        <button onClick={() => props.store.runAutoMap()}>Auto-Map</button>
        <button onClick={() => props.store.clearMapping()}>Clear</button>
        <button disabled={!canSave()} onClick={() => props.onSave()}>Save .scl</button>
      </div>
    </div>
  );
};
