import type { Component } from "solid-js";

export const Legend: Component = () => {
  const items = [
    { color: "#3b82f6", shape: "dot", label: "mapped" },
    { color: "#bbb", shape: "dot-sm", label: "skipped" },
    { color: "#f59e0b", shape: "dot", label: "collapse (≥2 B→1 A)" },
    { color: "#22c55e", shape: "line", label: "<15¢" },
    { color: "#eab308", shape: "line", label: "15–30¢" },
    { color: "#ef4444", shape: "line", label: ">30¢ / tie" },
  ];
  return (
    <div class="legend">
      {items.map((it) => (
        <span class="legend-item">
          {it.shape === "dot" && <span class="legend-dot" style={{ background: it.color }} />}
          {it.shape === "dot-sm" && <span class="legend-dot legend-dot-sm" style={{ background: it.color }} />}
          {it.shape === "line" && <span class="legend-line" style={{ background: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
};
