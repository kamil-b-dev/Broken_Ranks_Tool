import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import ProgressionShoppingList from "./ProgressionShoppingList";
import { createProgressionView } from "./progressionReport";
import { reportData, legendReport } from "./progressionReport.fixtures";
import { downloadBuildText } from "../builds/buildDownloads";
vi.mock("../builds/buildDownloads", () => ({ downloadBuildText: vi.fn() }));
const groups = createProgressionView(legendReport(), reportData).groups;
function List() {
    const [prepared, setPrepared] = useState(new Set());
    return (
        <ProgressionShoppingList
            groups={groups}
            data={reportData}
            completed={new Set([60])}
            playerLevel={120}
            prepared={prepared}
            onPreparedChange={setPrepared}
        />
    );
}
describe("shopping list", () => {
    it("checks preparation separately from completion and exports the filtered visible list", async () => {
        const user = userEvent.setup();
        render(<List />);
        await user.click(screen.getByText("Zakupy i ulepszenia ścieżki"));
        expect(
            screen.getByText("Oznaczenie przygotowania nie oznacza wykonania etapu.")
        ).toBeVisible();
        const checks = screen.getAllByRole("checkbox");
        await user.click(checks[0]);
        expect(checks[0]).toBeChecked();
        await user.selectOptions(screen.getByRole("combobox"), "next");
        await user.click(screen.getByRole("button", { name: "Pobierz listę TXT" }));
        expect(downloadBuildText).toHaveBeenLastCalledWith(
            expect.stringContaining("[x]"),
            "broken-ranks-shopping.txt",
            "text/plain;charset=utf-8"
        );
        const rows = within(
            screen.getByText("Zakupy i ulepszenia ścieżki").parentElement
        ).getAllByRole("listitem");
        expect(rows.every((row) => !row.textContent.includes("Poziom 60"))).toBe(true);
    });
});
