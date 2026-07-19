import { createSignal, type Component } from "solid-js";
import { createStore } from "./state/store";
import { createAuditionController } from "./audio/audition-controller";
import { TopBar } from "./components/TopBar";
import { CircleViz } from "./components/CircleViz";
import { SidePanel } from "./components/SidePanel";
import { PreviewBox } from "./components/PreviewBox";
import { Legend } from "./components/Legend";
import { Splitter } from "./components/Splitter";
import { serializeMappingToScl } from "./scl/serializer";
import { sanitizeScaleName } from "./scl/edo";
import styles from "./App.module.css";

// Resizable-panel bounds (kept in module scope; clamped in the drag handlers).
const SIDE_PANEL_MIN = 160, SIDE_PANEL_MAX = 560;
const PREVIEW_MIN = 80;

const App: Component = () => {
  const store = createStore();
  // User-controlled panel sizes. Defaults match the previous fixed layout
  // (250px side panel; ~160px preview strip). Clamped on drag.
  const [sidePanelWidth, setSidePanelWidth] = createSignal(250);
  const [previewHeight, setPreviewHeight] = createSignal(160);

  // Vertical splitter (between CircleViz and SidePanel): dragging the boundary
  // LEFT shrinks the side panel, RIGHT grows it. Standard splitter convention —
  // the delta sign already matches "right = grow", but we negate so the drag
  // direction feels natural (drag toward the panel to shrink it).
  // Actually: delta is +when moving right; SidePanel is on the RIGHT, so moving
  // the handle right (into the panel) should SHRINK it → negate.
  const onSidePanelDrag = (delta: number) =>
    setSidePanelWidth((w) => Math.max(SIDE_PANEL_MIN, Math.min(SIDE_PANEL_MAX, w - delta)));
  // Horizontal splitter (between main row and PreviewBox): PreviewBox is BELOW.
  // Moving the handle DOWN (into the preview) should SHRINK it → negate.
  const onPreviewDrag = (delta: number) =>
    setPreviewHeight((h) =>
      Math.max(PREVIEW_MIN, Math.min(Math.floor(window.innerHeight * 0.6), h - delta)),
    );

  const audition = createAuditionController(store);

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
        <Splitter orientation="vertical" onDrag={onSidePanelDrag} />
        <div class="side-panel-wrap" style={{ width: `${sidePanelWidth()}px` }}>
          <SidePanel store={store} audition={audition} />
        </div>
      </div>
      <Splitter orientation="horizontal" onDrag={onPreviewDrag} />
      <div class="preview-box-wrap" style={{ height: `${previewHeight()}px` }}>
        <PreviewBox store={store} />
      </div>
    </div>
  );
};

export default App;
