import { afterEach, describe, expect, it, vi } from "vitest";
import {
    downloadOptimizerConfiguration,
    readOptimizerConfigurationFile,
} from "./optimizerConfigFiles";

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("optimizerConfigFiles", () => {
    it("downloads a dated JSON configuration and releases its object URL", () => {
        vi.useFakeTimers();
        const createObjectURL = vi.fn(() => "blob:test-config");
        const revokeObjectURL = vi.fn();
        Object.defineProperty(URL, "createObjectURL", {
            value: createObjectURL,
            configurable: true,
        });
        Object.defineProperty(URL, "revokeObjectURL", {
            value: revokeObjectURL,
            configurable: true,
        });
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

        downloadOptimizerConfiguration({ priorities: [] }, new Date("2026-08-30T12:00:00Z"));

        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(click).toHaveBeenCalledOnce();
        vi.runAllTimers();
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-config");
    });

    it("parses a valid configuration file", async () => {
        const payload = { priorities: [{ key: "CRITICAL_CHANCE" }] };
        const file = { size: 100, text: vi.fn().mockResolvedValue(JSON.stringify(payload)) };

        await expect(readOptimizerConfigurationFile(file)).resolves.toEqual(payload);
    });

    it("rejects oversized files before reading them", async () => {
        const file = { size: 1024 * 1024 + 1, text: vi.fn() };

        await expect(readOptimizerConfigurationFile(file)).rejects.toThrow(
            "Plik konfiguracji jest zbyt duży."
        );
        expect(file.text).not.toHaveBeenCalled();
    });
});
