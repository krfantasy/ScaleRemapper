import { type Component } from "solid-js";
import { createStore } from "./state/store";
import { Synth } from "./audio/synth";
import { TopBar } from "./components/TopBar";
import { CircleViz } from "./components/CircleViz";
import { SidePanel } from "./components/SidePanel";
import { PreviewBox } from "./components/PreviewBox";
import { Legend } from "./components/Legend";
import { serializeMappingToScl } from "./scl/serializer";
import { sanitizeScaleName } from "./scl/edo";
import styles from "./App.module.css";

const App: Component = () => {
  const store = createStore();
  let synth: Synth | null = null;
  function getSynth(): Synth {
    if (!synth) {
      const ctx = new AudioContext();
      synth = new Synth(ctx);
    }
    return synth;
  }

  function handleAudition(kind: "remapped" | "b") {
    const sel = store.selected();
    if (!sel || sel.ring !== "B") return; // only B-dots have a "remapped vs B-pure" A/B
    const bDegree = sel.degree;
    const s = getSynth();
    s.setWaveform(store.waveform());
    void s.resume();
    if (kind === "remapped") {
      const a = store.mapping().assignments[bDegree];
      if (!a) return;
      s.playNote(store.aCents()[a.aDegree]);
    } else {
      s.playNote(store.bCents()[bDegree]);
    }
  }

  function handleSave() {
    const a = store.scaleA();
    const b = store.scaleB();
    if (!a) return;
    if (store.stats().mappedCount !== store.bCents().length - 1) return;
    const sclText = serializeMappingToScl(store.mapping(), store.aCents(), b, a.name);
    const blob = new Blob([sclText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeScaleName(a.name)}-onto-${sanitizeScaleName(b.name)}.scl`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div class={styles.app}>
      <TopBar store={store} onSave={handleSave} />
      <div class={styles.main}>
        <div class={styles.circleArea}>
          <div class={styles.circleStage}>
            <CircleViz store={store} />
          </div>
          <Legend />
        </div>
        <SidePanel store={store} onAudition={handleAudition} />
      </div>
      <PreviewBox store={store} />
    </div>
  );
};

export default App;
