import { For, Show, createSignal, createMemo, createEffect, onMount, onCleanup, type Component } from "solid-js";
import type { Store } from "../state/store";
import type { AuditionController } from "../audio/audition-controller";
import { displacedCents, octaveDisplacement } from "../mapping/displacement";
import { noteName } from "../scl/edo";
import { findCollisions } from "../mapping/deviation";

interface Props { store: Store; audition: AuditionController; }

const CX = 200, CY = 200, R_OUTER = 180, R_INNER = 120;
const TAU = Math.PI * 2;

/** Angle for a cents value, scaled by the given period. 0¢ at top, clockwise. */
function angle(cents: number, period: number): number {
  return (cents / period) * TAU;
}
function dotX(cents: number, period: number, r: number): number {
  return CX + r * Math.sin(angle(cents, period));
}
function dotY(cents: number, period: number, r: number): number {
  return CY - r * Math.cos(angle(cents, period));
}

function deviationColor(dev: number): string {
  const a = Math.abs(dev);
  if (a < 15) return "#22c55e";
  if (a <= 30) return "#eab308";
  return "#ef4444";
}

const PAD = 16;
const ZOOM_STEP = 1.2;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 4;

export const CircleViz: Component<Props> = (props) => {
  const aScale = () => props.store.scaleA()?.scale ?? null;
  const bScale = () => props.store.scaleB().scale;
  const bLoaded = () => props.store.scaleB();
  const aCents = () => props.store.aCents();
  const bCents = () => props.store.bCents();

  // Periods: last degree's cents. Default to 1200 if scale has only root.
  const periodA = () => {
    const ds = aScale()?.degrees;
    return ds && ds.length > 1 ? ds[ds.length - 1].cents : 1200;
  };
  const periodB = () => {
    const ds = bScale().degrees;
    return ds.length > 1 ? ds[ds.length - 1].cents : 1200;
  };

  const [hovered, setHovered] = createSignal<{ x: number; y: number; text: string } | null>(null);
  const [zoom, setZoom] = createSignal(1);
  const [availWidth, setAvailWidth] = createSignal(0);
  const [availHeight, setAvailHeight] = createSignal(0);
  const [selectedADegree, setSelectedADegree] = createSignal<number | null>(null);

  // Keep local A-selection in sync with the store: when the store's selection
  // moves away from A (cleared, or moved to a B-degree), clear the local
  // A-highlight so a stale index doesn't falsely highlight a dot on ring A.
  createEffect(() => {
    if (props.store.selected()?.ring !== "A") setSelectedADegree(null);
  });

  type Pt = { x: number; y: number };
  type DragFrom =
    | { ring: "inner"; bDegree: number; x: number; y: number }
    | { ring: "outer"; aDegree: number; x: number; y: number };
  const [drag, setDrag] = createSignal<DragFrom | null>(null);
  const [cursor, setCursor] = createSignal<Pt | null>(null);
  type DropTarget = Pt & ({ ring: "inner"; bDegree: number } | { ring: "outer"; aDegree: number });
  const [dropTarget, setDropTarget] = createSignal<DropTarget | null>(null);
  const downAt = { x: 0, y: 0 };

  let rootRef: HTMLDivElement | undefined;
  let svgRef: SVGSVGElement | undefined;

  function toSvg(e: { clientX: number; clientY: number }): Pt | null {
    if (!svgRef) return null;
    const ctm = svgRef.getScreenCTM?.();
    if (!ctm) return null;
    const pt = svgRef.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  // Fit (zoom=1) = the ring's canvas equals the container's smaller dimension,
  // so it always fits without scrolling. The ring itself is made visually large
  // by R_OUTER/R_INNER filling ~90% of the 400-wide viewBox (see constants
  // above) — no need to enlarge the canvas past the container.
  const size = createMemo(() => Math.max(0, Math.min(availWidth(), availHeight()) * zoom()));

  // B inner dots, data-driven.
  // Each dot carries:
  //   - `label`: the full label for hover tooltips (note name OR "i · cents¢").
  //      Cents values are NOT rendered on the circle itself — only shown in the
  //      hover tooltip on demand, to keep the ring uncluttered.
  //   - `inDot`: the short text rendered INSIDE the dot (note name for default B,
  //      degree index otherwise — kept to 1-2 chars so it fits the small dot).
  const innerDots = createMemo(() => {
    const ds = bScale().degrees;
    const isDefault = bLoaded().origin === "default";
    const out: { bDegree: number; cents: number; label: string; inDot: string; x: number; y: number }[] = [];
    for (let i = 0; i < ds.length - 1; i++) {
      const cents = ds[i].cents;
      const note = noteName(i);
      const full = `${i} · ${cents.toFixed(2)}¢`;
      out.push({
        bDegree: i, cents,
        label: isDefault ? note : full,
        inDot: isDefault ? note : String(i),
        x: dotX(cents, periodB(), R_INNER), y: dotY(cents, periodB(), R_INNER),
      });
    }
    return out;
  });

  const collisions = createMemo(() => findCollisions(props.store.mapping()));
  const collapseCountByADegree = createMemo(() => {
    const m = new Map<number, number>();
    for (const c of collisions()) m.set(c.aDegree, c.bDegrees.length);
    return m;
  });
  const collidingBDegrees = createMemo(() => {
    const s = new Set<number>();
    for (const c of collisions()) for (const b of c.bDegrees) s.add(b);
    return s;
  });

  // Predicted rubber-band color.
  const previewColor = (): string => {
    const d = drag();
    const t = dropTarget();
    if (!d || !t) return "#999";
    const aDeg = d.ring === "outer" ? d.aDegree : t.ring === "outer" ? t.aDegree : -1;
    const bDeg = d.ring === "inner" ? d.bDegree : t.ring === "inner" ? t.bDegree : -1;
    if (aDeg < 0 || bDeg < 0) return "#999";
    const ac = aCents(), bc = bCents();
    // Use the STORE's periodA for displacement (0 when A is root-only), NOT the
    // local geometry periodA() helper (which defaults to 1200 for drawing).
    const pA = props.store.periodA();
    const dev = displacedCents(aDeg, bDeg, ac, bc, pA) - bc[bDeg];
    return deviationColor(dev);
  };

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDrag(null); setCursor(null); setDropTarget(null); }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));

    const onMove = (e: PointerEvent) => {
      const d = drag();
      if (!d) return;
      if (props.audition.enabled()) return;  // no rubber-band, no drop-target while ON
      const p = toSvg(e);
      if (!p) return;
      setCursor(p);
      const HIT = 11;
      let target: DropTarget | null = null;
      if (d.ring === "outer") {
        for (const dot of innerDots()) {
          if (Math.hypot(dot.x - p.x, dot.y - p.y) <= HIT) {
            target = { ring: "inner", bDegree: dot.bDegree, x: dot.x, y: dot.y };
            break;
          }
        }
      } else {
        const ds = aScale()?.degrees ?? [];
        for (let i = 0; i < ds.length - 1; i++) {
          const deg = ds[i];
          const dx = dotX(deg.cents, periodA(), R_OUTER), dy = dotY(deg.cents, periodA(), R_OUTER);
          if (Math.hypot(dx - p.x, dy - p.y) <= HIT) {
            target = { ring: "outer", aDegree: deg.degree, x: dx, y: dy };
            break;
          }
        }
      }
      setDropTarget(target);
    };
    const onUp = (e: PointerEvent) => {
      const d = drag();
      if (!d) return;
      const moved = Math.hypot(downAt.x - e.clientX, downAt.y - e.clientY);
      if (props.audition.enabled()) {
        if (moved <= 4) {
          void props.audition.resume();
          // DragFrom is a discriminated union on `ring`; TS narrows through the
          // branch, so no cast is needed (matches the OFF-path's connect calls).
          if (d.ring === "outer") props.audition.playDot("A", d.aDegree);
          else props.audition.playDot("B", d.bDegree);
        }
        setDrag(null); setCursor(null); setDropTarget(null);
        return;  // no select, no connect while ON
      }
      const t = dropTarget();
      if (t) {
        if (d.ring === "outer") props.store.connect(t.ring === "inner" ? t.bDegree : -1, d.aDegree);
        else props.store.connect(d.bDegree, t.ring === "outer" ? t.aDegree : -1);
      } else if (moved <= 4) {
        if (d.ring === "inner") props.store.select("B", d.bDegree);
        else { setSelectedADegree(d.aDegree); props.store.select("A", d.aDegree); }
      }
      setDrag(null); setCursor(null); setDropTarget(null);
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

  return (
    <div class="circle-viz" ref={rootRef}>
      <Show when={aScale()} fallback={<div class="circle-placeholder">Load a scale to begin</div>}>
        <div class="circle-toolbar">
          <button type="button" title="Zoom out" aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP))}>−</button>
          <button type="button" title="Reset to fit" aria-label="Reset to fit"
            onClick={() => setZoom(1)}>⤢</button>
          <button type="button" title="Zoom in" aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP))}>+</button>
        </div>
        <div class="circle-scroll">
          <div class="circle-stage" style={{ width: `${size()}px`, height: `${size()}px` }}>
            <svg ref={svgRef} viewBox="0 0 400 400" class="circle-svg" width={size()} height={size()}>
              {/* B-degree gridlines */}
              <For each={innerDots()}>
                {(dot) => {
                  const a = angle(dot.cents, periodB());
                  return (
                    <line data-role="gridline" x1={CX} y1={CY}
                      x2={CX + R_OUTER * Math.sin(a)} y2={CY - R_OUTER * Math.cos(a)}
                      stroke="#dfe4ea" stroke-width="1" />
                  );
                }}
              </For>
              <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="#ccc" />
              <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="#ccc" />

              {/* Connectors */}
              <For each={props.store.mapping().assignments}>
                {(a) => (
                  <Show when={a}>
                    {(assign) => {
                      const ac = aCents(), bc = bCents();
                      // STORE periodA for displacement (0 when A is root-only);
                      // LOCAL periodA() for geometry below (defaults to 1200 for drawing).
                      const pA = props.store.periodA();
                      const sounded = displacedCents(assign().aDegree, assign().bDegree, ac, bc, pA);
                      const dev = sounded - bc[assign().bDegree];
                      const n = octaveDisplacement(assign().aDegree, assign().bDegree, ac, bc, pA);
                      const inner = innerDots().find((d) => d.bDegree === assign().bDegree)!;
                      const srcCents = ac[assign().aDegree];
                      const x2 = dotX(srcCents, periodA(), R_OUTER), y2 = dotY(srcCents, periodA(), R_OUTER);
                      return (
                        <>
                          <line data-role="connector" data-bdegree={assign().bDegree}
                            x1={inner.x} y1={inner.y} x2={x2} y2={y2}
                            stroke={deviationColor(dev)} stroke-width="3" stroke-linecap="round" />
                          <line data-role="connector-hit" data-bdegree={assign().bDegree}
                            x1={inner.x} y1={inner.y} x2={x2} y2={y2}
                            stroke="transparent" stroke-width="14" stroke-linecap="round"
                            style={{ cursor: "pointer" }}
                            onDblClick={() => props.store.disconnect(assign().bDegree)} />
                          {/* Octave label: shown only when the assignment is wrapped
                              (n !== 0). Sits near the A-dot end of the connector. */}
                          {n !== 0 && (
                            <text data-role="octave-label" data-bdegree={assign().bDegree}
                              x={x2 + 8} y={y2 - 4}
                              font-size="8" font-weight="bold" fill="#f59e0b" pointer-events="none">
                              {n > 0 ? `+${n}` : `${n}`}oct
                            </text>
                          )}
                        </>
                      );
                    }}
                  </Show>
                )}
              </For>

              {/* Rubber-band preview */}
              <Show when={drag() && cursor()}>
                <line x1={drag()!.x} y1={drag()!.y}
                  x2={dropTarget() ? dropTarget()!.x : cursor()!.x}
                  y2={dropTarget() ? dropTarget()!.y : cursor()!.y}
                  stroke={previewColor()} stroke-width="2" stroke-dasharray="4 3"
                  stroke-linecap="round" opacity="0.85" pointer-events="none" />
              </Show>

              {/* Outer (A) dots — skip A's period (last degree). */}
              <For each={aScale()!.degrees.slice(0, -1)}>
                {(deg) => {
                  const isMapped = () => props.store.mapping().assignments.some((a) => a?.aDegree === deg.degree);
                  const isSelected = () => selectedADegree() === deg.degree;
                  const collapseN = () => collapseCountByADegree().get(deg.degree) ?? 0;
                  const cx = dotX(deg.cents, periodA(), R_OUTER);
                  const cy = dotY(deg.cents, periodA(), R_OUTER);
                  return (
                    <>
                      <circle data-ring="outer" data-degree={deg.degree} cx={cx} cy={cy}
                        r={isSelected() ? 6 : isMapped() ? 5 : 3.5}
                        fill={isSelected() ? "#22c55e" : isMapped() ? "#3b82f6" : "#bbb"}
                        stroke={collapseN() >= 2 ? "#f59e0b" : "none"}
                        stroke-width={collapseN() >= 2 ? 2 : 0}
                        style={{ cursor: "pointer" }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          downAt.x = e.clientX; downAt.y = e.clientY;
                          setDrag({ ring: "outer", aDegree: deg.degree, x: cx, y: cy });
                          setCursor(toSvg(e));
                        }}
                        onMouseOver={() => {
                          const usedBy = props.store.mapping().assignments
                            .filter((a) => a?.aDegree === deg.degree).map((a) => a!.bDegree);
                          setHovered({
                            x: cx, y: cy,
                            text: `deg ${deg.degree} · ${deg.cents.toFixed(1)}¢${
                              usedBy.length ? ` · used by B-degree(s) ${usedBy.join(", ")}` : ""
                            }${collapseN() >= 2 ? ` · ×${collapseN()} collapse` : ""}`,
                          });
                        }}
                        onMouseOut={() => setHovered(null)}
                      />
                      <Show when={collapseN() >= 2}>
                        <text data-role="collapse-badge" x={cx + 7} y={cy + 7}
                          font-size="8" font-weight="bold" fill="#f59e0b" pointer-events="none">
                          ×{collapseN()}
                        </text>
                      </Show>
                    </>
                  );
                }}
              </For>

              {/* Inner (B) dots */}
              <For each={innerDots()}>
                {(dot) => {
                  const isSelected = () => {
                    const s = props.store.selected();
                    return s !== null && s.ring === "B" && s.degree === dot.bDegree;
                  };
                  const colliding = () => collidingBDegrees().has(dot.bDegree);
                  return (
                    <g>
                      <circle data-ring="inner" data-bdegree={dot.bDegree}
                        cx={dot.x} cy={dot.y} r={isSelected() ? 9 : 7}
                        fill={isSelected() ? "#ef4444" : colliding() ? "#ef4444" : "#1d4ed8"}
                        stroke={isSelected() ? "#fff" : "none"} stroke-width="2"
                        style={{ cursor: "pointer" }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          downAt.x = e.clientX; downAt.y = e.clientY;
                          setDrag({ ring: "inner", bDegree: dot.bDegree, x: dot.x, y: dot.y });
                          setCursor(toSvg(e));
                        }}
                        onMouseOver={() => {
                          const a = props.store.mapping().assignments[dot.bDegree];
                          const ac = aCents(), bc = bCents();
                          const pA = props.store.periodA();
                          if (!a) {
                            setHovered({ x: dot.x, y: dot.y, text: `${dot.label} (unmapped)` });
                            return;
                          }
                          const n = octaveDisplacement(a.aDegree, dot.bDegree, ac, bc, pA);
                          const sounded = displacedCents(a.aDegree, dot.bDegree, ac, bc, pA);
                          const dev = sounded - bc[dot.bDegree];
                          const octLabel = n !== 0 ? ` ${n > 0 ? `+${n}` : n}oct` : "";
                          setHovered({
                            x: dot.x, y: dot.y,
                            text: `${dot.label} → A-degree ${a.aDegree}${octLabel} (${sounded.toFixed(1)}¢) dev ${dev > 0 ? "+" : ""}${dev.toFixed(1)}¢`,
                          });
                        }}
                        onMouseOut={() => setHovered(null)}
                      />
                      {/* In-dot label: short (note name or degree index) so it fits.
                          Cents are intentionally NOT shown on the circle — they're
                          available via the hover tooltip to keep the ring uncluttered. */}
                      <text x={dot.x} y={dot.y + 3} text-anchor="middle"
                        fill="#fff" font-size="7" font-weight="bold" pointer-events="none">
                        {dot.inDot}
                      </text>
                    </g>
                  );
                }}
              </For>
            </svg>
            <Show when={hovered()}>
              {(h) => (
                <div class="circle-tooltip" style={{ left: `${(h().x / 400) * 100}%`, top: `${(h().y / 400) * 100}%` }}>
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
