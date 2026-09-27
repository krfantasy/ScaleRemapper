import { createSignal, onCleanup, Show, ErrorBoundary, type Component } from "solid-js";
import { createStore } from "./state/store";
import { createAuditionController } from "./audio/audition-controller";
import { TopBar } from "./components/TopBar";
import { CircleViz } from "./components/CircleViz";
import { SidePanel } from "./components/SidePanel";
import { PreviewBox } from "./components/PreviewBox";
import { HelpWidget } from "./components/HelpWidget";
import { LoadErrorBanner } from "./components/LoadErrorBanner";
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
  const [previewHeight, setPreviewHeight] = createSignal(200);
  // Help modal open/close — always starts closed (no persistence).
  const [helpOpen, setHelpOpen] = createSignal(false);

  // Vertical splitter (between CircleViz and SidePanel): SidePanel is on the
  // RIGHT. Moving the handle RIGHT (into the panel) should SHRINK it → negate
  // (Splitter reports +delta when the handle moves right).
  const onSidePanelDrag = (delta: number) =>
    setSidePanelWidth((w) => Math.max(SIDE_PANEL_MIN, Math.min(SIDE_PANEL_MAX, w - delta)));
  // Horizontal splitter (between main row and PreviewBox): PreviewBox is BELOW.
  // Moving the handle DOWN (into the preview) should SHRINK it → negate.
  // Same upper bound the drag clamps to; read at render time for aria-valuemax.
  const previewMax = () => Math.floor(window.innerHeight * 0.6);
  const onPreviewDrag = (delta: number) =>
    setPreviewHeight((h) =>
      Math.max(PREVIEW_MIN, Math.min(previewMax(), h - delta)),
    );

  const audition = createAuditionController(store);
  // Tear down the AudioContext on unmount (HMR reloads, future App-level tests).
  onCleanup(() => audition.dispose());

  function handleSave() {
    const a = store.scaleA();
    const b = store.scaleB();
    // Single save gate shared with TopBar's Save button (store.canSave): A
    // loaded, all mappable B degrees mapped, and at least one mappable degree.
    // handleSave only fires from that (disabled-when-false) button today, but
    // guarding here keeps any future save trigger from exporting a degenerate
    // or incomplete mapping. `!a` also narrows for the serialize call below.
    if (!store.canSave() || !a) return;
    const sclText = serializeMappingToScl(
      store.mapping(),
      store.aCents(),
      store.bCents(),
      store.periodA(),
      b,
      a.name,
    );
    const blob = new Blob([sclText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeScaleName(a.name)}-onto-${sanitizeScaleName(b.name)}.scl`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ErrorBoundary
      fallback={() => (
        <div class="app-error">
          <h2>⚠ Something went wrong</h2>
          <p>An unexpected error occurred while rendering.</p>
          <p>Please <a href=".">reload the page</a> to continue.</p>
        </div>
      )}
    >
      <div class={styles.app}>
        <TopBar store={store} onSave={handleSave} onHelpClick={() => setHelpOpen(true)} />
        <Show when={store.loadError()}>
          {(err) => <LoadErrorBanner error={err()} onClose={() => store.clearLoadError()} />}
        </Show>
        <div class={styles.main}>
          <div class={styles.circleArea}>
            <div class={styles.circleStage}>
              <CircleViz store={store} audition={audition} />
            </div>
            <Legend />
          </div>
          <Splitter
            orientation="vertical"
            onDrag={onSidePanelDrag}
            value={sidePanelWidth()}
            min={SIDE_PANEL_MIN}
            max={SIDE_PANEL_MAX}
            label="Resize side panel"
          />
          <div class="side-panel-wrap" style={{ width: `${sidePanelWidth()}px` }}>
            <SidePanel store={store} audition={audition} />
          </div>
        </div>
        <Splitter
          orientation="horizontal"
          onDrag={onPreviewDrag}
          value={previewHeight()}
          min={PREVIEW_MIN}
          max={previewMax()}
          label="Resize preview panel"
        />
        <div class="preview-box-wrap" style={{ height: `${previewHeight()}px` }}>
          <PreviewBox store={store} />
        </div>
        <Show when={helpOpen()}>
          <HelpWidget onClose={() => setHelpOpen(false)} />
        </Show>
      </div>
    </ErrorBoundary>
  );
};

export default App;
