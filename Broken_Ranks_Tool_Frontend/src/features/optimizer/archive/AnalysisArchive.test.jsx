import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import AnalysisArchive from "./AnalysisArchive";
import { ANALYSIS_ARCHIVE_KEY, readAnalysisArchive } from "./analysisArchiveStorage";
import { downloadBuildText } from "../../builds/buildDownloads";

vi.mock("../../builds/buildDownloads", () => ({ downloadBuildText: vi.fn() }));
vi.mock("../OptimizerReportColumn", () => ({
    default: ({ displayedVariant, onSelectVariant }) => (
        <div>
            <span>{displayedVariant?.label}</span>
            <button onClick={() => onSelectVariant(null, 1)}>Następny wariant</button>
        </div>
    ),
}));
beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
});
const document = {
    input: { payload: { build: { requestData: { slots: { helmet: { itemId: 1 } } } } } },
    status: { mode: "ADVISOR", nextVariants: [{ label: "Pierwszy" }, { label: "Drugi" }] },
};

it("saves a complete analysis, opens both variants, exports it and removes the saved copy", async () => {
    render(<AnalysisArchive document={document} data={{ items: [{ id: 1, name: "Hełm" }] }} />);
    fireEvent.click(screen.getByText("Archiwum analiz"));
    fireEvent.click(screen.getByText("Zapisz pełną analizę"));
    const saved = await screen.findByRole("button", { name: /ADVISOR/ });
    expect(readAnalysisArchive()[0].document).toEqual(document);
    fireEvent.click(saved);
    expect(screen.getByText("Pierwszy")).toBeInTheDocument();
    expect(screen.getByText(/Hełm: Hełm · 1★/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Następny wariant"));
    expect(screen.getByText("Drugi")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Pobierz analizę"));
    expect(JSON.parse(downloadBuildText.mock.calls[0][0]).document).toEqual(document);
    fireEvent.click(screen.getByText("Usuń analizę"));
    await waitFor(() => expect(readAnalysisArchive()).toEqual([]));
    expect(screen.queryByText("Zapisany wynik analizy")).not.toBeInTheDocument();
});

it("preserves corrupt archive bytes before enabling writes again", async () => {
    localStorage.setItem(ANALYSIS_ARCHIVE_KEY, "{broken");
    render(<AnalysisArchive document={null} />);
    fireEvent.click(screen.getByText("Archiwum analiz"));
    expect(screen.getByRole("alert")).toHaveTextContent("uszkodzone");
    expect(screen.getByText("Zapisz pełną analizę")).toBeDisabled();
    fireEvent.click(screen.getByText("Pobierz kopię archiwum"));
    expect(downloadBuildText).toHaveBeenCalledWith("{broken", "analysis-recovery.json");
    fireEvent.click(screen.getByText("Zachowaj kopię i odblokuj archiwum"));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    const backup = Object.keys(localStorage).find((key) =>
        key.startsWith(ANALYSIS_ARCHIVE_KEY + ".recovery.")
    );
    expect(localStorage.getItem(backup)).toBe("{broken");
});

it("reports a full archive without dropping existing analyses", async () => {
    const entries = Array.from({ length: 10 }, (_, index) => ({
        id: String(index),
        savedAt: "2026-11-14",
        document,
    }));
    localStorage.setItem(ANALYSIS_ARCHIVE_KEY, JSON.stringify({ version: 1, entries }));
    render(<AnalysisArchive document={document} />);
    fireEvent.click(screen.getByText("Archiwum analiz"));
    fireEvent.click(screen.getByText("Zapisz pełną analizę"));
    expect(await screen.findByRole("alert")).toHaveTextContent("mieści 10 analiz");
    expect(readAnalysisArchive()).toHaveLength(10);
});
