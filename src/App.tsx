import { type Component } from "solid-js";
import { createStore } from "./state/store";
import { Synth } from "./audio/synth";
import { TopBar } from "./components/TopBar";
import { CircleViz } from "./components/CircleViz";
import { SidePanel } from "./components/SidePanel";
import { PreviewBox } from "./components/PreviewBox";
import { Legend } from "./components/Legend";
import { serializeMappingToScl } from "./scl/serializer";
import { destCents } from "./utils/cents";
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

  function handleAudition(kind: "remapped" | "edo12") {
    const key = store.selectedKey();
    if (key === null) return;
    const s = getSynth();
    void s.resume();
    if (kind === "remapped") {
      const a = store.mapping().assignments[key];
      if (!a) return;
      s.playNote(store.sourceCents()[a.sourceDegree]);
    } else {
      s.playNote(destCents(key));
    }
  }

  function handleSave() {
    const scale = store.sourceScale();
    if (!scale || store.stats().mappedCount !== 12) return;
    const sclText = serializeMappingToScl(
      store.mapping(),
      scale.degrees.map((d) => d.cents),
      scale.description,
    );
    const blob = new Blob([sclText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scale.description.replace(/[^a-z0-9]/gi, "_")}-remapped-12.scl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div class={styles.app}>
      <TopBar store={store} onSave={handleSave} />
      <div class={styles.main}>
        <div class={styles.circleArea}>
          <CircleViz store={store} />
        </div>
        <SidePanel store={store} onAudition={handleAudition} />
      </div>
      <PreviewBox store={store} />
      <Legend />
    </div>
  );
};

export default App;
