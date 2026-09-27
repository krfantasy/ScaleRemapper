import { onCleanup, onMount, type Component } from "solid-js";

interface Props {
  onClose: () => void;
}

// Selector for elements that can receive focus inside the dialog, queried at
// keydown time so the trap never works from a stale list.
const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), " +
  "textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])";

// Static-content help modal. No store dependency — purely presentational.
// Escape-to-close + body scroll lock follow the CircleViz.tsx keydown pattern;
// focus is moved into the dialog on open, Tab is trapped while it is open, and
// focus is restored to the opener on close (modal dialog pattern).
export const HelpWidget: Component<Props> = (props) => {
  let panel: HTMLDivElement | undefined;

  onMount(() => {
    // Remember what was focused before opening (the ❓ button in TopBar) so it
    // can be restored on close, then move focus into the dialog itself.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panel?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // Trap Tab/Shift+Tab within the dialog: wrap at both ends, and pull
      // focus back in if it somehow landed outside the modal.
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const escaped = active !== null && !panel.contains(active);
      if (e.shiftKey) {
        if (active === first || escaped) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || escaped) {
        e.preventDefault();
        first.focus();
      }
      // Mid-list Tab/Shift+Tab falls through to the browser's default move.
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));

    // Give focus back to the opener when the modal unmounts.
    onCleanup(() => previouslyFocused?.focus());

    // Lock background scroll while the modal is open; restore prior value on close.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    onCleanup(() => {
      document.body.style.overflow = prev;
    });
  });

  // Only close when the click lands on the backdrop itself, not a bubbled panel click.
  const onBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) props.onClose();
  };

  return (
    <div class="help-backdrop" onClick={onBackdropClick}>
      {/* tabindex=-1 lets the dialog itself take focus on open. */}
      <div ref={panel} class="help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title" tabindex={-1}>
        <div class="help-header">
          <h2 id="help-title" class="help-title">
            ❓ How Scale Remapper Works
          </h2>
          <button class="help-close" aria-label="Close help" onClick={() => props.onClose()}>
            ✕
          </button>
        </div>
        <div class="help-body">
          <h2>Quick Start</h2>
          <ol>
            <li>
              <strong>Load source <code>.scl</code></strong> (Scale A) — the tuning you want to
              borrow pitches from.
            </li>
            <li>
              <strong>Pick a destination EDO</strong> (Scale B) — defaults to 12-EDO (your keyboard).
            </li>
            <li>
              <strong>⚡ Auto-Map</strong> — snaps each of the 12 keys to the nearest source pitch.
            </li>
            <li>
              <strong>🎧 Audition</strong> — toggle 🎧 in the side panel, then click any dot on the
              circle to hear it.
            </li>
            <li>
              <strong>💾 Save <code>.scl</code></strong> — exports your remapped scale (enabled when
              every key is mapped).
            </li>
          </ol>

          <details>
            <summary>Scale A vs Scale B</summary>
            <p>
              A = source (outer ring, the colors you're stealing). B = destination (inner ring, the
              12 keys you'll play). Every B-degree gets mapped to one A-degree.
            </p>
          </details>
          <details>
            <summary>Reading the colors</summary>
            <p>
              Connector color = tuning deviation. 🟢 green &lt; 15¢, 🟡 yellow 15–30¢, 🔴 red &gt; 30¢.
              Smaller deviation = closer to the source pitch.
            </p>
          </details>
          <details>
            <summary>Collapse badges</summary>
            <p>
              An amber outline + count badge on a dot means ≥ 2 B-degrees are mapping to the same
              A-degree (a "collision"). Often intentional but worth noticing.
            </p>
          </details>
          <details>
            <summary>Manual mapping</summary>
            <p>
              Drag (or click-click) from an outer A dot to an inner B dot to assign it by hand. Mix
              freely with Auto-Map; manual assignments persist until cleared.
            </p>
          </details>
          <details>
            <summary>Audition</summary>
            <p>
              Toggle 🎧 in the side panel, then click dots. Pick waveform and tweak ADSR. Each dot
              plays its actual remapped pitch.
            </p>
          </details>
          <details>
            <summary>Octave wrap labels</summary>
            <p>
              When Scale A's period ≠ B's, a mapping may shift by whole octaves; a{" "}
              <code>+N oct</code> / <code>−N oct</code> badge appears on the connector to show how
              far.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
};
