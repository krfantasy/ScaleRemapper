# Scale Remapper

A client-side web app for remapping **any** Scala tuning scale onto **any** other.
Load Scale A (your pitch palette) and Scale B (your destination grid); each degree of B
snaps to the nearest pitch in A. Export the result as a single `.scl` file with B's note
count and period, whose interior pitches come from A.

Built with TypeScript + [Solid.js](https://www.solidjs.com/). Pure client-side —
nothing leaves your browser.

## Why

The default session is the familiar 12-key workflow: B starts as 12-EDO, so loading a
source `.scl` and remapping produces a 12-note scale whose pitches are borrowed from your
source. Play C–C♯–D… on a keyboard tuned with the output and the notes sound like they
came from the source scale — the familiar 12-key layout, retuned.

But B isn't fixed to 12-EDO. Swap in any `.scl` or a built-in EDO preset and the same
engine maps B's grid onto A's pitches. A few examples:

- **JI → 12-EDO (the default flow):** load a just-intonation `.scl` as A, leave B at
  12-EDO. Each of the 12 keys snaps to its nearest JI value.
- **JI → 31-EDO:** same A, pick the 31-EDO preset for B. Output is a 31-note scale, each
  pitch snapped to the nearest JI value.
- **12-EDO → Bohlen-Pierce:** A = 12-EDO, B = a Bohlen-Pierce `.scl`. Output is a 13-note
  scale with BP's `3/1` tritave period (1901.955¢), interior pitches taken from the
  nearest 12-EDO values. Non-octave periods are fully supported.

## Features

- **Two independent scales.** Scale A (source palette) loads from a `.scl` file. Scale B
  (destination grid) defaults to 12-EDO and can be replaced by a loaded `.scl`, a built-in
  EDO preset (`12, 19, 22, 31, 41, 53`), or reset to the 12-EDO default with one click.
  Parser is hand-rolled client-side (the format is small enough to implement directly,
  ~30 lines).
- **Auto-Map** — one click snaps every B-degree to its nearest A-pitch.
- **Manual connect** — drag from a dot on one ring to a dot on the other to wire up
  individual degrees. Mix freely with Auto-Map to nudge after the bulk pass.
- **Concentric-circle visualization** — outer ring = Scale A, inner ring = Scale B, both
  data-driven for any degree count, with deviation-colored connectors, hover tooltips,
  tie ghosts, and collapse flagging (when several B-degrees land on the same A-pitch).
- **Click-to-audition** — a built-in Web Audio synth (sine, square, triangle, saw) lets
  you A/B a remapped pitch against B's pure pitch.
- **Live preview** — a read-only panel shows the resulting scale two ways (readable
  deviations and raw `.scl` text), refreshing on every change.
- **Save** — download a single `.scl` with B's note count and period; the period echoes
  B's last entry verbatim (e.g. `2/1`, or `3/1` for Bohlen-Pierce).

Out of scope by design: MIDI input, live keyboard playing, `.kbm` export, multi-period
output, scale editing (load or pick — you can't add/remove degrees by hand), a scale
library beyond the small EDO preset list, and any backend/accounts/storage.

## Getting started

Requires Node 26 (CI runs on 26).

```bash
npm install
npm run dev      # start the dev server
```

Open the printed local URL, drop in a `.scl`, and start remapping.

## Commands

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Type-check and build for production  |
| `npm run preview` | Preview the production build locally |
| `npm test`        | Run the test suite once              |
| `npm run test:watch` | Run tests in watch mode           |

## Testing

The suite covers the parser/serializer, mapping logic (auto-map, deviation,
displacement), audio and audition controllers, and component behavior via
`@solidjs/testing-library`, plus a smoke test that round-trips a real `.scl`
(see `test-fixtures/`). Run `npm test`.

## License

See [THE-LICENSE.txt](./THE-LICENSE.txt).
