import { beforeEach, describe, expect, it } from "vitest";
import {
    readAnalysisArchive,
    saveAnalysis,
    recoverAnalysisArchive,
    ANALYSIS_ARCHIVE_KEY,
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
