/** Deviation → color shared by CircleViz connectors and PreviewBox lines:
 *  green under 15¢, yellow up to 30¢, red beyond. */
export function deviationColor(dev: number): string {
  const a = Math.abs(dev);
  if (a < 15) return "#22c55e";
  if (a <= 30) return "#eab308";
  return "#ef4444";
}
