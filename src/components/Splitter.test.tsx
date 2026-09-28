import { describe, test, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Splitter } from "./Splitter";

// Dispatch a cancelable bubbling keydown and return the event so tests can
// assert defaultPrevented (jsdom does not act on keyboard defaults itself).
const fireKey = (el: Element, key: string, init: KeyboardEventInit = {}) => {
	const ev = new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
		...init,
	});
	el.dispatchEvent(ev);
	return ev;
};

// Range 400px → the 2%-of-range keyboard step is 8px; value 260 → 25%.
const baseProps = {
	orientation: "vertical" as const,
	min: 160,
	max: 560,
	value: 260,
	label: "Resize side panel",
};

describe("Splitter", () => {
	test("drag reports signed deltas along the orientation axis", () => {
		const onDrag = vi.fn();
		render(() => <Splitter {...baseProps} onDrag={onDrag} />);
		const handle = document.querySelector(".splitter") as Element;
		fireEvent.pointerDown(handle, { clientX: 100, clientY: 0 });
		window.dispatchEvent(
			new PointerEvent("pointermove", { clientX: 130, clientY: 0 }),
		);
		expect(onDrag).toHaveBeenLastCalledWith(30);
	});

	test("pointercancel detaches the listeners and restores the body cursor", () => {
		const onDrag = vi.fn();
		render(() => <Splitter {...baseProps} onDrag={onDrag} />);
		const handle = document.querySelector(".splitter") as Element;
		fireEvent.pointerDown(handle, { clientX: 100, clientY: 0 });
		expect(document.body.style.cursor).toBe("col-resize");
		expect(document.body.style.userSelect).toBe("none");
		window.dispatchEvent(new PointerEvent("pointercancel"));
		expect(document.body.style.cursor).toBe("");
		expect(document.body.style.userSelect).toBe("");
		// Stale listeners must be gone: a later move no longer fires onDrag.
		window.dispatchEvent(
			new PointerEvent("pointermove", { clientX: 500, clientY: 0 }),
		);
		expect(onDrag).not.toHaveBeenCalled();
	});
});

describe("Splitter keyboard resize (ARIA separator pattern)", () => {
	test("is focusable and exposes its position as an ARIA percentage", () => {
		render(() => <Splitter {...baseProps} onDrag={() => {}} />);
		const handle = document.querySelector(".splitter") as HTMLElement;
		expect(handle.getAttribute("tabindex")).toBe("0");
		expect(handle.getAttribute("role")).toBe("separator");
		// (260 − 160) / (560 − 160) = 25%, clamped to the 0–100 range.
		expect(handle.getAttribute("aria-valuenow")).toBe("25");
		expect(handle.getAttribute("aria-valuemin")).toBe("0");
		expect(handle.getAttribute("aria-valuemax")).toBe("100");
		expect(handle.getAttribute("aria-label")).toBe("Resize side panel");
		expect(handle.getAttribute("aria-orientation")).toBe("vertical");
	});

	test("arrow keys nudge onDrag by 2% of the range and preventDefault", () => {
		const onDrag = vi.fn();
		render(() => <Splitter {...baseProps} onDrag={onDrag} />);
		const handle = document.querySelector(".splitter") as HTMLElement;
		// Range 400px → step 8px. Right/Down send +step (same direction as
		// dragging the handle right/down), Left/Up send −step.
		const cases = [
			["ArrowRight", 8],
			["ArrowDown", 8],
			["ArrowLeft", -8],
			["ArrowUp", -8],
		] as const;
		for (const [key, expected] of cases) {
			onDrag.mockClear();
			const ev = fireKey(handle, key);
			expect(onDrag).toHaveBeenCalledTimes(1);
			expect(onDrag).toHaveBeenCalledWith(expected);
			expect(ev.defaultPrevented).toBe(true);
		}
	});

	test("Home jumps to the minimum, End to the maximum", () => {
		// Assert through a real consumer model: both App.tsx handlers apply
		// `value = clamp(value − delta)` with the same min/max as here.
		const { min, max } = baseProps;
		const clamp = (v: number) => Math.max(min, Math.min(max, v));
		const [value, setValue] = createSignal(baseProps.value); // 260
		render(() => (
			<Splitter
				{...baseProps}
				value={value()}
				onDrag={(delta) => setValue((v) => clamp(v - delta))}
			/>
		));
		const handle = document.querySelector(".splitter") as HTMLElement;
		let ev = fireKey(handle, "Home");
		expect(value()).toBe(min); // 260 → 160
		expect(ev.defaultPrevented).toBe(true);
		ev = fireKey(handle, "End");
		expect(value()).toBe(max); // 160 → 560
		expect(ev.defaultPrevented).toBe(true);
		// End straight from the midpoint: 260 → 560, not clamped down to min.
		setValue(baseProps.value);
		ev = fireKey(handle, "End");
		expect(value()).toBe(max);
		expect(ev.defaultPrevented).toBe(true);
	});

	test("Home at the minimum sends no delta", () => {
		const onDrag = vi.fn();
		render(() => <Splitter {...baseProps} value={160} onDrag={onDrag} />);
		const handle = document.querySelector(".splitter") as HTMLElement;
		fireKey(handle, "Home");
		expect(onDrag).not.toHaveBeenCalled();
	});

	test("unhandled keys are ignored and not prevented", () => {
		const onDrag = vi.fn();
		render(() => <Splitter {...baseProps} onDrag={onDrag} />);
		const handle = document.querySelector(".splitter") as HTMLElement;
		const ev = fireKey(handle, "a");
		expect(onDrag).not.toHaveBeenCalled();
		expect(ev.defaultPrevented).toBe(false);
	});

	test("keyboard works on the horizontal splitter too", () => {
		const onDrag = vi.fn();
		render(() => (
			<Splitter
				orientation="horizontal"
				onDrag={onDrag}
				min={80}
				max={480}
				value={200}
				label="Resize preview panel"
			/>
		));
		const handle = document.querySelector(".splitter") as HTMLElement;
		fireKey(handle, "ArrowDown");
		expect(onDrag).toHaveBeenCalledWith(8); // 2% of 400
		fireKey(handle, "ArrowUp");
		expect(onDrag).toHaveBeenLastCalledWith(-8);
	});
});
