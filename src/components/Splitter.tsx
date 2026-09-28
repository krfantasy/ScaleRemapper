import { type Component } from "solid-js";

interface Props {
  /** vertical = a thin column between two side-by-side panels (drag left/right);
   *  horizontal = a thin row between two stacked panels (drag up/down). */
  orientation: "vertical" | "horizontal";
  /** Called with the signed pixel delta on each pointermove or arrow-key press. */
  onDrag: (deltaPx: number) => void;
  /** Current size (px) of the panel this handle resizes; shown as an ARIA percentage. */
  value: number;
  /** Min/max size (px) the consumer clamps to; define the ARIA value range and key step. */
  min: number;
  max: number;
  /** Accessible name describing what the handle resizes. */
  label: string;
}

// Keyboard resize step (ARIA separator pattern): 2% of the min→max range.
const KEY_STEP_PERCENT = 2;

/**
 * A thin drag handle for resizing adjacent panels. On pointerdown, captures
 * pointer events at the window level and reports signed deltas along the
 * relevant axis to `onDrag`; arrow keys report a fixed ±2%-of-range step and
 * Home/End snap to the bounds. The consumer updates a clamped size signal in
 * response (the same path for drag and keyboard, so bounds stay in one place);
 * the flex layout reflows the neighbouring panels to match.
 */
export const Splitter: Component<Props> = (props) => {
  let lastPos = 0;
  const axis = () => (props.orientation === "vertical" ? "clientX" : "clientY");

  const onDown = (e: PointerEvent) => {
    e.preventDefault();
    // Capture the pointer so pointerup is delivered even when released outside
    // the window — otherwise the listeners below leak and the cursor sticks.
    // `?.` guard: jsdom doesn't implement setPointerCapture.
    (e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
    lastPos = e[axis()];
    const onMove = (ev: PointerEvent) => {
      const cur = ev[axis()];
      props.onDrag(cur - lastPos);
      lastPos = cur;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.body.style.cursor = props.orientation === "vertical" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  // Key directions mirror the drag sign convention: a positive delta moves the
  // handle right/down, which grows the left/top pane and shrinks the right/bottom
  // panel (App.tsx negates the delta for exactly this geometry). So Right/Down
  // send +step and Left/Up send −step — keys behave like dragging the handle in
  // that direction. Home/End snap to the range bounds under the consumer's
  // `clamp(value − delta)` contract: Home sends value − min (positive → shrinks
  // to min) and End sends value − max (negative → grows to max). Clamping stays
  // with the consumer (same code path as pointer drag); preventDefault stops the
  // page from scrolling on the keys we handle.
  const onKeyDown = (e: KeyboardEvent) => {
    const step = ((props.max - props.min) * KEY_STEP_PERCENT) / 100;
    let delta: number;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        delta = -step;
        break;
      case "ArrowRight":
      case "ArrowDown":
        delta = step;
        break;
      case "Home":
        delta = props.value - props.min;
        break;
      case "End":
        delta = props.value - props.max;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (delta !== 0) props.onDrag(delta);
  };

  // ARIA separator pattern: expose the split position as a percentage of the
  // clamped drag range.
  const toPercent = (v: number) =>
    props.max > props.min
      ? Math.round(Math.min(100, Math.max(0, ((v - props.min) / (props.max - props.min)) * 100)))
      : 0;

  return (
    <div
      class={`splitter splitter-${props.orientation}`}
      role="separator"
      aria-orientation={props.orientation === "vertical" ? "vertical" : "horizontal"}
      tabindex={0}
      aria-label={props.label}
      aria-valuenow={toPercent(props.value)}
      aria-valuemin={toPercent(props.min)}
      aria-valuemax={toPercent(props.max)}
      onKeyDown={onKeyDown}
      onPointerDown={onDown}
    />
  );
};
