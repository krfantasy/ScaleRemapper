import { describe, test, expect } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { ErrorBoundary, type Component } from "solid-js";

// ErrorBoundary fallback: a child that throws during render must be caught and
// replaced with the fallback UI, rather than crashing the whole render to a
// white screen. This mirrors how App.tsx wraps its subtree.
describe("ErrorBoundary fallback", () => {
  const Boom: Component = () => {
    throw new Error("child blew up");
  };

  test("renders the fallback when a child throws", () => {
    render(() => (
      <ErrorBoundary fallback={() => <div class="app-error">Something went wrong</div>}>
        <Boom />
      </ErrorBoundary>
    ));
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/child blew up/)).toBeNull();
  });

  test("renders the child normally when it does not throw", () => {
    const Fine: Component = () => <div>all good</div>;
    render(() => (
      <ErrorBoundary fallback={() => <div class="app-error">Something went wrong</div>}>
        <Fine />
      </ErrorBoundary>
    ));
    expect(screen.getByText(/all good/i)).toBeInTheDocument();
  });
});
