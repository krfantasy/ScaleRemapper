import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { LoadErrorBanner } from "./LoadErrorBanner";
import type { LoadError } from "../state/store";

function makeError(overrides: Partial<LoadError> = {}): LoadError {
  return { source: "A", filename: "bad.scl", message: "Invalid .scl note count.", ...overrides };
}

describe("LoadErrorBanner", () => {
  test("renders the filename, slot, and parser message", () => {
    render(() => <LoadErrorBanner error={makeError()} onClose={() => {}} />);
    expect(screen.getByText(/bad\.scl/)).toBeInTheDocument();
    expect(screen.getByText(/source scale/i)).toBeInTheDocument();
    expect(screen.getByText(/invalid \.scl note count/i)).toBeInTheDocument();
  });

  test('uses "destination scale" for a source B error', () => {
    render(() => <LoadErrorBanner error={makeError({ source: "B" })} onClose={() => {}} />);
    expect(screen.getByText(/destination scale/i)).toBeInTheDocument();
  });

  test('uses "source scale" for a source A error', () => {
    render(() => <LoadErrorBanner error={makeError({ source: "A" })} onClose={() => {}} />);
    expect(screen.getByText(/source scale/i)).toBeInTheDocument();
  });

  test("dismiss button calls onClose", () => {
    const onClose = vi.fn();
    render(() => <LoadErrorBanner error={makeError()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss error/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("has role=alert for assistive tech", () => {
    const { container } = render(() => <LoadErrorBanner error={makeError()} onClose={() => {}} />);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
