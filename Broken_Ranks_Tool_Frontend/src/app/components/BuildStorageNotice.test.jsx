import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
    EquipmentBuildActionsContext,
    EquipmentStorageContext,
} from "../../shared/state/EquipmentContext";
import { downloadBuildPayload, downloadBuildText } from "../../features/builds/buildDownloads";
import BuildStorageNotice from "./BuildStorageNotice";

vi.mock("../../features/builds/buildDownloads", () => ({
    downloadBuildPayload: vi.fn(),
    downloadBuildText: vi.fn(),
}));

describe("storage recovery notice", () => {
    it("keeps failed autosave visible and offers retry plus an export of the latest build", () => {
        const retrySave = vi.fn();
        const payload = { build: { requestData: { slots: { helmet: { itemStars: 9 } } } } };
        render(
            <EquipmentStorageContext.Provider value={{ saveFailed: true, retrySave }}>
                <EquipmentBuildActionsContext.Provider
                    value={{ createBuildSnapshot: () => ({ payload }) }}
                >
                    <BuildStorageNotice />
                </EquipmentBuildActionsContext.Provider>
            </EquipmentStorageContext.Provider>
        );
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Nie udało się automatycznie zapisać buildu"
        );
        fireEvent.click(screen.getByRole("button", { name: "Ponów zapis" }));
        expect(retrySave).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole("button", { name: "Pobierz kopię do pliku" }));
        expect(downloadBuildPayload).toHaveBeenCalledWith(payload);
    });

    it("exports exact rejected draft bytes and exposes an explicit library recovery action", () => {
        const library = {
            storageWarning: "Zapis jest zablokowany.",
            canRecover: true,
            downloadRecovery: vi.fn(),
            recover: vi.fn(),
        };
        const dismissRecovery = vi.fn();
        render(
            <EquipmentStorageContext.Provider
                value={{ draftRejected: true, recoveryRaw: "{original draft", dismissRecovery }}
            >
                <BuildStorageNotice library={library} />
            </EquipmentStorageContext.Provider>
        );
        fireEvent.click(screen.getByRole("button", { name: "Pobierz oryginalny szkic" }));
        expect(downloadBuildText).toHaveBeenCalledWith(
            "{original draft",
            "broken-ranks-draft-recovery.json"
        );
        fireEvent.click(screen.getByRole("button", { name: "Pobierz oryginalną bibliotekę" }));
        expect(library.downloadRecovery).toHaveBeenCalledOnce();
        fireEvent.click(
            screen.getByRole("button", { name: "Zachowaj kopię i odzyskaj czytelne buildy" })
        );
        expect(library.recover).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole("button", { name: "Zamknij komunikat" }));
        expect(dismissRecovery).toHaveBeenCalledOnce();
    });

    it("reports a download failure without dismissing the save warning", () => {
        downloadBuildPayload.mockImplementationOnce(() => {
            throw new Error("blocked");
        });
        render(
            <EquipmentStorageContext.Provider value={{ saveFailed: true, retrySave: vi.fn() }}>
                <EquipmentBuildActionsContext.Provider
                    value={{ createBuildSnapshot: () => ({ payload: {} }) }}
                >
                    <BuildStorageNotice />
                </EquipmentBuildActionsContext.Provider>
            </EquipmentStorageContext.Provider>
        );
        fireEvent.click(screen.getByRole("button", { name: "Pobierz kopię do pliku" }));
        expect(screen.getAllByRole("alert")).toHaveLength(2);
        expect(
            screen.getByText("Nie udało się pobrać kopii danych. Spróbuj ponownie.")
        ).toBeVisible();
    });
});
