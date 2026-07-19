import { type Component } from "solid-js";

interface Props {
  /** vertical = a thin column between two side-by-side panels (drag left/right);
   *  horizontal = a thin row between two stacked panels (drag up/down). */
  orientation: "vertical" | "horizontal";
  /** Called with the signed pixel delta on each pointermove. */
  onDrag: (deltaPx: number) => void;
}

/**
 * A thin drag handle for resizing adjacent panels. On pointerdown, captures
 * pointer events at the window level and reports signed deltas along the
 * relevant axis to `onDrag`. The consumer updates a clamped size signal in
 * response; the flex layout reflows the neighbouring panels to match.
 */
export const Splitter: Component<Props> = (props) => {
  let lastPos = 0;
  const axis = () => (props.orientation === "vertical" ? "clientX" : "clientY");

  const onDown = (e: PointerEvent) => {
    e.preventDefault();
    lastPos = e[axis()];
    const onMove = (ev: PointerEvent) => {
      const cur = ev[axis()];
      props.onDrag(cur - lastPos);
      lastPos = cur;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.cursor = props.orientation === "vertical" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      class={`splitter splitter-${props.orientation}`}
      role="separator"
      aria-orientation={props.orientation === "vertical" ? "vertical" : "horizontal"}
      onPointerDown={onDown}
    />
  );
};
