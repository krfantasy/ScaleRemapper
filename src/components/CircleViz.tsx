import { For, Show, onMount, onCleanup, type Component } from "solid-js";
import type { Store } from "../state/store";
import { destCents, noteName } from "../utils/cents";

interface Props { store: Store; }

const CX = 200, CY = 200, R_OUTER = 150, R_INNER = 100;
const TAU = Math.PI * 2;

function angle(cents: number): number {
  return (cents / 1200) * TAU;
}
function dotX(cents: number, r: number): number {
  return CX + r * Math.sin(angle(cents));
}
function dotY(cents: number, r: number): number {
  return CY - r * Math.cos(angle(cents));
}

function deviationColor(dev: number): string {
  const a = Math.abs(dev);
  if (a < 15) return "#22c55e";
  if (a <= 30) return "#eab308";
  return "#ef4444";
}

export const CircleViz: Component<Props> = (props) => {
  const source = () => props.store.sourceScale();
  const sourceCents = () => props.store.sourceCents();

  onMount(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.store.cancelConnect(); };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  const innerDots = Array.from({ length: 12 }, (_, k) => ({
    key: k,
    cents: destCents(k),
    name: noteName(k),
    x: dotX(destCents(k), R_INNER),
    y: dotY(destCents(k), R_INNER),
  }));

  return (
    <Show when={source()} fallback={<div class="circle-placeholder">Load a scale to begin</div>}>
      <svg viewBox="0 0 400 400" class="circle-svg" style={{ "max-width": "440px", width: "100%" }}>
        <For each={Array.from({ length: 12 }, (_, i) => i * 30)}>
          {(deg) => {
            const a = (deg / 360) * TAU;
            return (
              <line
                x1={CX} y1={CY}
                x2={CX + R_OUTER * Math.sin(a)}
                y2={CY - R_OUTER * Math.cos(a)}
                stroke="#dfe4ea" stroke-width="1"
              />
            );
          }}
        </For>
        <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="#ccc" />
        <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="#ccc" />

        <For each={props.store.mapping().assignments}>
          {(a) => (
            <Show when={a}>
              {(assign) => {
                const srcCents = sourceCents()[assign().sourceDegree];
                const dev = srcCents - destCents(assign().destKey);
                const inner = innerDots[assign().destKey];
                return (
                  <line
                    data-role="connector"
                    x1={inner.x} y1={inner.y}
                    x2={dotX(srcCents, R_OUTER)} y2={dotY(srcCents, R_OUTER)}
                    stroke={deviationColor(dev)} stroke-width="3" stroke-linecap="round"
                  />
                );
              }}
            </Show>
          )}
        </For>

        <For each={source()!.degrees}>
          {(deg) => {
            const isMapped = props.store.mapping().assignments.some(
              (a) => a?.sourceDegree === deg.degree,
            );
            return (
              <circle
                data-ring="outer"
                data-degree={deg.degree}
                cx={dotX(deg.cents, R_OUTER)} cy={dotY(deg.cents, R_OUTER)}
                r={isMapped ? 5 : 3.5}
                fill={isMapped ? "#3b82f6" : "#bbb"}
                style={{ cursor: "pointer" }}
                onClick={() => props.store.completeConnect({ kind: "outer", degree: deg.degree })}
              />
            );
          }}
        </For>

        <For each={innerDots}>
          {(dot) => {
            const isSelected = props.store.selectedKey() === dot.key;
            return (
              <g>
                <circle
                  data-ring="inner"
                  data-key={dot.key}
                  cx={dot.x} cy={dot.y}
                  r={isSelected ? 9 : 7}
                  fill={isSelected ? "#ef4444" : "#1d4ed8"}
                  stroke={isSelected ? "#fff" : "none"}
                  stroke-width="2"
                  style={{ cursor: "pointer" }}
                  onClick={() => props.store.completeConnect({ kind: "inner", key: dot.key })}
                />
                <text
                  x={dot.x} y={dot.y + 3}
                  text-anchor="middle"
                  fill="#fff" font-size="7" font-weight="bold"
                  pointer-events="none"
                >{dot.name}</text>
              </g>
            );
          }}
        </For>
      </svg>
    </Show>
  );
};
