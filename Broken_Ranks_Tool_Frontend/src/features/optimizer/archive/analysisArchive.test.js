import { beforeEach, describe, expect, it } from "vitest";
import {
    readAnalysisArchive,
    saveAnalysis,
    recoverAnalysisArchive,
    ANALYSIS_ARCHIVE_KEY,
    MAX_SAVED_ANALYSES,
} from "./analysisArchiveStorage";
describe("analysis archive", () => {
    beforeEach(() => localStorage.clear());
    it("preserves the complete detached result and input across reloads", async () => {
        const document = {
            input: { payload: { build: {} } },
            status: { nextVariants: [{ setup: { slots: {} }, actions: ["A"] }] },
        };
        await saveAnalysis(document);
        document.status.nextVariants[0].actions.push("B");
        expect(readAnalysisArchive()[0].document.status.nextVariants[0].actions).toEqual(["A"]);
    });
    it("blocks writes over corrupt storage and retains its exact bytes", async () => {
        localStorage.setItem(ANALYSIS_ARCHIVE_KEY, "{broken");
        await expect(saveAnalysis({ input: {}, status: {} })).rejects.toThrow();
        expect(localStorage.getItem(ANALYSIS_ARCHIVE_KEY)).toBe("{broken");
    });
    it("saves and reloads the 100th analysis without overwriting data when the limit is reached", async () => {
        expect(MAX_SAVED_ANALYSES).toBe(100);
        const document = { input: {}, status: {} };
        const entries = Array.from({ length: MAX_SAVED_ANALYSES - 1 }, (_, index) => ({
            id: String(index),
            savedAt: "2026-11-16",
            document,
        }));
        localStorage.setItem(ANALYSIS_ARCHIVE_KEY, JSON.stringify({ version: 1, entries }));
        await expect(saveAnalysis(document)).resolves.toHaveLength(100);
        expect(readAnalysisArchive().slice(0, entries.length)).toEqual(entries);
        expect(readAnalysisArchive()).toHaveLength(100);
        const original = localStorage.getItem(ANALYSIS_ARCHIVE_KEY);
        await expect(saveAnalysis(document)).rejects.toThrow("mieści 100 analiz");
        expect(localStorage.getItem(ANALYSIS_ARCHIVE_KEY)).toBe(original);
        localStorage.setItem(
            ANALYSIS_ARCHIVE_KEY,
            JSON.stringify({
                version: 1,
                entries: [...readAnalysisArchive(), { ...entries[0], id: "extra" }],
            })
        );
        expect(() => readAnalysisArchive()).toThrow("uszkodzone");
    });
    it("recovers only after preserving the exact original bytes under a separate key", async () => {
        localStorage.setItem(ANALYSIS_ARCHIVE_KEY, "{original");
        await recoverAnalysisArchive();
        expect(readAnalysisArchive()).toEqual([]);
        const recovery = Object.keys(localStorage).find((key) =>
            key.startsWith(ANALYSIS_ARCHIVE_KEY + ".recovery.")
        );
        expect(localStorage.getItem(recovery)).toBe("{original");
    });
});
