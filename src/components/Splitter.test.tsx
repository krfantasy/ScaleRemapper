import { describe, test, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Splitter } from "./Splitter";

describe("Splitter", () => {
	test("drag reports signed deltas along the orientation axis", () => {
		const onDrag = vi.fn();
		render(() => <Splitter orientation="vertical" onDrag={onDrag} />);
		const handle = document.querySelector(".splitter") as Element;
		fireEvent.pointerDown(handle, { clientX: 100, clientY: 0 });
		window.dispatchEvent(
			new PointerEvent("pointermove", { clientX: 130, clientY: 0 }),
		);
		expect(onDrag).toHaveBeenLastCalledWith(30);
	});

	test("pointercancel detaches the listeners and restores the body cursor", () => {
		const onDrag = vi.fn();
		render(() => <Splitter orientation="vertical" onDrag={onDrag} />);
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
