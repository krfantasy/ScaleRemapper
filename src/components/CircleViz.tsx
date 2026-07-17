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

const PAD = 16; // matches .circle-scroll padding (1rem)
const ZOOM_STEP = 1.2;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 4;

export const CircleViz: Component<Props> = (props) => {
  const source = () => props.store.sourceScale();
  const sourceCents = () => props.store.sourceCents();
  const [hovered, setHovered] = createSignal<{ x: number; y: number; text: string } | null>(null);
  const [zoom, setZoom] = createSignal(1);
  const [availWidth, setAvailWidth] = createSignal(0);
  const [availHeight, setAvailHeight] = createSignal(0);
  const [selectedDegree, setSelectedDegree] = createSignal<number | null>(null);

  // Drag-and-drop connect state (svg units, viewBox 0..400).
  type Pt = { x: number; y: number };
  type DragFrom =
    | { ring: "inner"; key: number; x: number; y: number }
    | { ring: "outer"; degree: number; x: number; y: number };
  const [drag, setDrag] = createSignal<DragFrom | null>(null);
  const [cursor, setCursor] = createSignal<Pt | null>(null);
  const [dropTarget, setDropTarget] = createSignal<Pt & ({ ring: "inner"; key: number } | { ring: "outer"; degree: number }) | null>(null);
  const downAt = { x: 0, y: 0 }; // last pointer-down svg coords (click vs drag detection)

  let rootRef: HTMLDivElement | undefined;
  let svgRef: SVGSVGElement | undefined;

  // Convert client pointer coords → SVG viewBox units (accurate at any zoom/size).
  function toSvg(e: { clientX: number; clientY: number }): Pt | null {
    if (!svgRef) return null;
    const ctm = svgRef.getScreenCTM?.();
    if (!ctm) return null; // jsdom doesn't implement getScreenCTM
    const pt = svgRef.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  const size = createMemo(() => Math.max(0, Math.min(availWidth(), availHeight()) * zoom()));

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

  // Predicted deviation color for the rubber-band line when a valid target is hovered.
  const previewColor = (): string => {
    const d = drag();
    const t = dropTarget();
    if (!d || !t) return "#999";
    const degree = d.ring === "outer" ? d.degree : t.ring === "outer" ? t.degree : -1;
    const key = d.ring === "inner" ? d.key : t.ring === "inner" ? t.key : -1;
    if (degree < 0 || key < 0) return "#999";
    const dev = sourceCents()[degree] - destCents(key);
    return deviationColor(dev);
  };

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDrag(null); setCursor(null); setDropTarget(null); }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));

    // Drag move/up — attached once, no-op when no drag is active.
    const onMove = (e: PointerEvent) => {
      const d = drag();
      if (!d) return;
      const p = toSvg(e);
      if (!p) return;
      setCursor(p);
      // Hit-test the opposite ring for a drop target.
      const HIT = 11;
      let target: NonNullable<ReturnType<typeof dropTarget>> | null = null;
      if (d.ring === "outer") {
        for (const dot of innerDots) {
          if (Math.hypot(dot.x - p.x, dot.y - p.y) <= HIT) {
            target = { ring: "inner", key: dot.key, x: dot.x, y: dot.y };
            break;
          }
        }
      } else {
        for (const deg of source()!.degrees) {
          const dx = dotX(deg.cents, R_OUTER), dy = dotY(deg.cents, R_OUTER);
          if (Math.hypot(dx - p.x, dy - p.y) <= HIT) {
            target = { ring: "outer", degree: deg.degree, x: dx, y: dy };
            break;
          }
        }
      }
      setDropTarget(target);
    };
    const onUp = (e: PointerEvent) => {
      const d = drag();
      if (!d) return;
      const moved = Math.hypot(downAt.x - (e.clientX), downAt.y - (e.clientY));
      const t = dropTarget();
      if (t) {
        // Drop on opposite ring → connect.
        if (d.ring === "outer") props.store.connect(t.ring === "inner" ? t.key : -1, d.degree);
        else props.store.connect(d.key, t.ring === "outer" ? t.degree : -1);
      } else if (moved <= 4) {
        // Treat as a click → select.
        if (d.ring === "inner") props.store.selectKey(d.key);
        else setSelectedDegree(d.degree);
      }
      setDrag(null);
      setCursor(null);
      setDropTarget(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    onCleanup(() => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    });

    const measure = () => {
      if (rootRef) {
        setAvailWidth(Math.max(0, rootRef.clientWidth - 2 * PAD));
        setAvailHeight(Math.max(0, rootRef.clientHeight - 2 * PAD));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (rootRef) ro.observe(rootRef);
    onCleanup(() => ro.disconnect());
  });

  const innerDots = Array.from({ length: 12 }, (_, k) => ({
    key: k,
    cents: destCents(k),
    name: noteName(k),
    x: dotX(destCents(k), R_INNER),
    y: dotY(destCents(k), R_INNER),
  }));

  return (
    <div class="circle-viz" ref={rootRef}>
      <Show
        when={source()}
        fallback={<div class="circle-placeholder">Load a scale to begin</div>}
      >
        <div class="circle-toolbar">
          <button
            type="button"
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP))}
          >
            −
          </button>
          <button
            type="button"
            title="Reset to fit"
            aria-label="Reset to fit"
            onClick={() => setZoom(1)}
          >
            ⤢
          </button>
          <button
            type="button"
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP))}
          >
            +
          </button>
        </div>
        <div class="circle-scroll">
          <div class="circle-stage" style={{ width: `${size()}px`, height: `${size()}px` }}>
            <svg ref={svgRef} viewBox="0 0 400 400" class="circle-svg" width={size()} height={size()}>
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
                const x2 = dotX(srcCents, R_OUTER), y2 = dotY(srcCents, R_OUTER);
                return (
                  <>
                    <line
                      data-role="connector"
                      data-key={assign().destKey}
                      x1={inner.x} y1={inner.y} x2={x2} y2={y2}
                      stroke={deviationColor(dev)} stroke-width="3" stroke-linecap="round"
                    />
                    {/* Fat invisible hit area so the thin line is easy to double-click. */}
                    <line
                      data-role="connector-hit"
                      data-key={assign().destKey}
                      x1={inner.x} y1={inner.y} x2={x2} y2={y2}
                      stroke="transparent" stroke-width="14" stroke-linecap="round"
                      style={{ cursor: "pointer" }}
                      onDblClick={() => props.store.disconnect(assign().destKey)}
                    />
                  </>
                );
              }}
            </Show>
          )}
        </For>

        {/* Rubber-band preview line while dragging. */}
        <Show when={drag() && cursor()}>
          <line
            x1={drag()!.x} y1={drag()!.y}
            x2={dropTarget() ? dropTarget()!.x : cursor()!.x}
            y2={dropTarget() ? dropTarget()!.y : cursor()!.y}
            stroke={previewColor()} stroke-width="2" stroke-dasharray="4 3"
            stroke-linecap="round" opacity="0.85"
            pointer-events="none"
          />
        </Show>

        <For each={source()!.degrees}>
          {(deg) => {
            // The octave-closing scale's final entry (2/1 = 1200¢) lands at the
            // same angle as the root (deg 0, 0¢), so it would overlap the root
            // dot at the top of the ring. Skip it — it's the same pitch class.
            const isOctaveRepeat = () =>
              source()!.isOctaveClosing &&
              deg.degree === source()!.degrees[source()!.degrees.length - 1].degree;

            const isMapped = () => props.store.mapping().assignments.some(
              (a) => a?.sourceDegree === deg.degree,
            );

            const isSelected = () => selectedDegree() === deg.degree;

            const isColliding = () => collisionDegrees().has(deg.degree);

            return (
              <Show when={!isOctaveRepeat()}>
              <circle
                data-ring="outer"
                data-degree={deg.degree}
                cx={dotX(deg.cents, R_OUTER)} cy={dotY(deg.cents, R_OUTER)}
                r={isSelected() ? 6 : (isMapped() ? 5 : 3.5)}
                fill={isSelected() ? "#22c55e" : (isMapped() ? "#3b82f6" : "#bbb")}
                stroke={isColliding() ? "#ef4444" : "none"}
                stroke-width={isColliding() ? 2 : 0}
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  downAt.x = e.clientX; downAt.y = e.clientY;
                  setDrag({ ring: "outer", degree: deg.degree, x: dotX(deg.cents, R_OUTER), y: dotY(deg.cents, R_OUTER) });
                  setCursor(toSvg(e));
                }}
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
              </Show>
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
                  onPointerDown={(e) => {
                    e.preventDefault();
                    downAt.x = e.clientX; downAt.y = e.clientY;
                    setDrag({ ring: "inner", key: dot.key, x: dot.x, y: dot.y });
                    setCursor(toSvg(e));
                  }}
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
        </div>
      </Show>
    </div>
  );
};
