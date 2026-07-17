import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver; provide a no-op stub so components
// that observe layout can mount in tests. Real layout behaviour is verified
// via Playwright against a live browser.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
