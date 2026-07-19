import { createSignal, For, Show, createMemo, type Component } from "solid-js";
import type { Store } from "../state/store";
import { noteName } from "../scl/edo";
import { serializeMappingToScl } from "../scl/serializer";
import { displacedCents } from "../mapping/displacement";

interface Props { store: Store; }

function deviationColor(dev: number): string {
  const a = Math.abs(dev);
  if (a < 15) return "#22c55e";
  if (a <= 30) return "#eab308";
  return "#ef4444";
}

function fmtSigned(cents: number): string {
  const sign = cents >= 0 ? "+" : "−";
  return `${sign}${Math.abs(cents).toFixed(1)}¢`;
}

export const PreviewBox: Component<Props> = (props) => {
  const [view, setView] = createSignal<"readable" | "raw">("readable");

  // Readable view: one line per B-degree (not hardcoded 12).
  const readableLines = createMemo(() => {
    const aCents = props.store.aCents();
    const bCents = props.store.bCents();
    const bLoaded = props.store.scaleB();
    const periodA = props.store.periodA();
    return props.store.mapping().assignments.map((a, b) => {
      if (!a) return { bDegree: b, label: labelFor(b, bCents[b], bLoaded.origin), dev: null as number | null };
      // Use displacedCents (single source of truth for the wrap rule) so the
      // readable deviation matches the connector colour and the sounded pitch.
      const dev = displacedCents(a.aDegree, b, aCents, bCents, periodA) - bCents[b];
      return { bDegree: b, label: labelFor(b, bCents[b], bLoaded.origin), dev };
    });
  });

  const rawText = createMemo(() => {
    const a = props.store.scaleA();
    if (!a) return "";
    if (props.store.stats().mappedCount !== props.store.bCents().length - 1) {
      return "Not all B-degrees mapped.";
    }
    return serializeMappingToScl(
      props.store.mapping(),
      props.store.aCents(),
      props.store.bCents(),
      props.store.periodA(),
      props.store.scaleB(),
      a.name,
    );
  });

  // Label for a B-degree: note name when B is the default, else "degree·cents".
  function labelFor(bDegree: number, cents: number, origin: string): string {
    return origin === "default" ? noteName(bDegree) : `${bDegree}·${cents.toFixed(0)}¢`;
  }

  return (
    <div class="preview-box">
      <div class="preview-header">
        <span class="preview-title">📋 Resulting Scale — live preview</span>
        <div class="preview-toggle">
          <button classList={{ active: view() === "readable" }} onClick={() => setView("readable")}>Readable</button>
          <button classList={{ active: view() === "raw" }} onClick={() => setView("raw")}>Raw .scl</button>
        </div>
      </div>
      <Show when={view() === "readable"} fallback={<pre class="preview-raw">{rawText()}</pre>}>
        <pre class="preview-readable">
          <For each={readableLines()}>
            {(line) => (
              <span
                style={{
                  display: "block",
                  color: line.dev === null ? "#666" : deviationColor(line.dev),
                }}
              >
                {line.dev === null
                  ? `${line.label.padEnd(8)} →  (unmapped)`
                  : `${line.label.padEnd(8)} →  ${fmtSigned(line.dev)}`}
                {"\n"}
              </span>
            )}
          </For>
        </pre>
      </Show>
    </div>
  );
};
