import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
import { HelpWidget } from "./HelpWidget";

const SUMMARY_LABELS = [
  "Scale A vs Scale B",
  "Reading the colors",
  "Collapse badges",
  "Manual mapping",
  "Audition",
  "Octave wrap labels",
];

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("HelpWidget", () => {
  test("renders title, Quick Start heading, and all detail summaries", () => {
    render(() => <HelpWidget onClose={() => {}} />);
    expect(screen.getByText(/how scale remapper works/i)).toBeInTheDocument();
    expect(screen.getByText("Quick Start")).toBeInTheDocument();
    for (const label of SUMMARY_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test("✕ button calls onClose once", () => {
    const onClose = vi.fn();
    render(() => <HelpWidget onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close help/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("backdrop click closes; panel click does not", () => {
    const onClose = vi.fn();
    render(() => <HelpWidget onClose={onClose} />);
    // Click inside the panel — should not close.
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    // Click on the backdrop itself — should close.
    fireEvent.click(document.querySelector(".help-backdrop") as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Escape key closes", () => {
    const onClose = vi.fn();
    render(() => <HelpWidget onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("details section toggles open on summary click", () => {
    render(() => <HelpWidget onClose={() => {}} />);
    const first = screen.getByText(SUMMARY_LABELS[0]).closest("details") as HTMLDetailsElement;
    expect(first.open).toBe(false);
    fireEvent.click(screen.getByText(SUMMARY_LABELS[0]));
    expect(first.open).toBe(true);
  });

  test("locks body scroll while mounted, restores on cleanup", () => {
    document.body.style.overflow = "scroll";
    const { unmount } = render(() => <HelpWidget onClose={() => {}} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });
});
