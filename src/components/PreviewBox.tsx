import { createSignal, For, Show, createMemo, type Component } from "solid-js";
import type { Store } from "../state/store";
import { destCents, noteName } from "../utils/cents";
import { serializeMappingToScl } from "../scl/serializer";

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

  const readableLines = createMemo(() => {
    const cents = props.store.sourceCents();
    return Array.from({ length: 12 }, (_, k) => {
      const a = props.store.mapping().assignments[k];
      if (!a) return { key: k, dev: null as number | null };
      const dev = cents[a.sourceDegree] - destCents(k);
      return { key: k, dev };
    });
  });

  const rawText = createMemo(() => {
    const scale = props.store.sourceScale();
    if (!scale) return "";
    if (props.store.stats().mappedCount !== 12) return "Not all 12 keys mapped.";
    return serializeMappingToScl(
      props.store.mapping(),
      scale.degrees.map((d) => d.cents),
      scale.description,
    );
  });

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
                  ? `${noteName(line.key).padEnd(3)} →  (unmapped)`
                  : `${noteName(line.key).padEnd(3)} →  ${noteName(line.key).padEnd(4)} ${fmtSigned(line.dev)}`}
                {"\n"}
              </span>
            )}
          </For>
        </pre>
      </Show>
    </div>
  );
};
