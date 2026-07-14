import { For, Show, createSignal, createMemo, onMount, onCleanup, type Component } from "solid-js";
import type { Store } from "../state/store";
import { destCents, noteName } from "../utils/cents";
import { findCollisions } from "../mapping/deviation";

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
  const [hovered, setHovered] = createSignal<{ x: number; y: number; text: string } | null>(null);

  const collisionDegrees = createMemo(() => {
    const cols = findCollisions(props.store.mapping());
    return new Set(cols.map((c) => c.sourceDegree));
  });
  const collidingKeys = createMemo(() => {
    const cols = findCollisions(props.store.mapping());
    const keys = new Set<number>();
    for (const c of cols) for (const k of c.destKeys) keys.add(k);
    return keys;
  });

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
      <div style={{ position: "relative", display: "inline-block" }}>
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
                stroke={collisionDegrees().has(deg.degree) ? "#ef4444" : "none"}
                stroke-width={collisionDegrees().has(deg.degree) ? 2 : 0}
                style={{ cursor: "pointer" }}
                onClick={() => props.store.completeConnect({ kind: "outer", degree: deg.degree })}
                onMouseOver={() => {
                  const usedBy = props.store.mapping().assignments
                    .filter((a) => a?.sourceDegree === deg.degree)
                    .map((a) => a!.destKey);
                  setHovered({
                    x: dotX(deg.cents, R_OUTER), y: dotY(deg.cents, R_OUTER),
                    text: `deg ${deg.degree} · ${deg.cents.toFixed(1)}¢${usedBy.length ? ` · used by key(s) ${usedBy.join(", ")}` : ""}`,
                  });
                }}
                onMouseOut={() => setHovered(null)}
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
                  fill={collidingKeys().has(dot.key) ? "#ef4444" : isSelected ? "#ef4444" : "#1d4ed8"}
                  stroke={isSelected ? "#fff" : "none"}
                  stroke-width="2"
                  style={{ cursor: "pointer" }}
                  onClick={() => props.store.completeConnect({ kind: "inner", key: dot.key })}
                  onMouseOver={() => {
                    const a = props.store.mapping().assignments[dot.key];
                    const cents = a ? props.store.sourceCents()[a.sourceDegree] : null;
                    const dev = cents !== null ? cents - destCents(dot.key) : null;
                    setHovered({
                      x: dot.x, y: dot.y,
                      text: dev !== null
                        ? `${dot.name} → deg ${a!.sourceDegree} (${cents!.toFixed(1)}¢) dev ${dev > 0 ? "+" : ""}${dev.toFixed(1)}¢`
                        : `${dot.name} (unmapped)`,
                    });
                  }}
                  onMouseOut={() => setHovered(null)}
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
      <Show when={hovered()}>
        {(h) => (
          <div class="circle-tooltip" style={{
            left: `${(h().x / 400) * 100}%`,
            top: `${(h().y / 400) * 100}%`,
          }}>
            {h().text}
          </div>
        )}
      </Show>
      </div>
    </Show>
  );
};
