import { beforeEach, describe, expect, it, vi } from "vitest";
import { detectPresentation, getPresentation } from "./presentation";

describe("mobile presentation selection", () => {
    beforeEach(() => {
        sessionStorage.clear();
        window.history.replaceState(null, "", "/");
        vi.restoreAllMocks();
    });

    it.each([
        [{ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }, "mobile"],
        [{ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel)" }, "mobile"],
        [{ userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)" }, "mobile"],
        [{ platform: "MacIntel", maxTouchPoints: 5 }, "mobile"],
        [{ userAgentData: { mobile: true } }, "mobile"],
        [{ platform: "Win32", maxTouchPoints: 10 }, "desktop"],
        [{ platform: "MacIntel", maxTouchPoints: 0 }, "desktop"],
        [{}, "desktop"],
    ])("detects %j as %s without relying on window width", (device, expected) => {
        expect(detectPresentation(device)).toBe(expected);
    });

    it("preserves a preview across navigation and allows returning to desktop", () => {
        window.history.replaceState(null, "", "/kreator?ui=mobile");
        expect(getPresentation()).toBe("mobile");
        window.history.replaceState(null, "", "/buildy");
        expect(getPresentation()).toBe("mobile");
        window.history.replaceState(null, "", "/kreator?ui=desktop");
        expect(getPresentation()).toBe("desktop");
    });

    it("accepts an explicit preview even if session storage is blocked", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        window.history.replaceState(null, "", "/kreator?ui=mobile");
        expect(getPresentation()).toBe("mobile");
    });
});
