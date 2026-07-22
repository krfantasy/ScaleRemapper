import { type Component } from "solid-js";
import type { LoadError } from "../state/store";

interface Props {
  error: LoadError;
  onClose: () => void;
}

// Non-blocking error banner for a failed .scl load. Purely presentational —
// no store dependency; the parent passes the error and a dismiss callback
// (mirrors the HelpWidget onClose wiring).
export const LoadErrorBanner: Component<Props> = (props) => {
  // "source" for slot A, "destination" for slot B — matches the TopBar labels.
  const slot = () => (props.error.source === "A" ? "source" : "destination");

  return (
    <div class="load-error-banner" role="alert" aria-live="polite">
      <span class="icon" aria-hidden="true">⚠</span>
      <span class="msg">
        Could not load <strong>{props.error.filename}</strong> as {slot()} scale:{" "}
        {props.error.message}
      </span>
      <button
        class="dismiss"
        type="button"
        aria-label="Dismiss error"
        onClick={() => props.onClose()}
      >
        ✕
      </button>
    </div>
  );
};
