import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EquipmentProvider } from "../../../app/EquipmentProvider";
import { useEquipment } from "../../../shared/state/EquipmentContext";
import { readEquipmentDraft, writeEquipmentDraft } from "../../../app/storage/workingDraftStorage";
import { server } from "../../../test/server";
import {
    optimizerBuild,
    optimizerCatalog,
    optimizerResponse,
} from "../../../test/fixtures/equipment/optimizerScenario";
import { DEFAULT_OPTIMIZER_SETTINGS } from "../optimizerDefaults";
import MobileOptimizerWorkspace from "./MobileOptimizerWorkspace";

const button = (name) => screen.getByRole("button", { name, exact: true });
const click = (name) => fireEvent.click(button(name));
const change = (name, value) =>
    fireEvent.change(screen.getByLabelText(name), { target: { value } });
const section = (name) =>
    fireEvent.click(
        within(screen.getByRole("navigation", { name: "Sekcje optymalizatora" })).getByRole(
            "button",
            { name, exact: true }
        )
    );
const back = vi.fn();

function Workspace({ initialSettings }) {
    const { loading } = useEquipment();
    const [settings, setSettings] = useState({ ...DEFAULT_OPTIMIZER_SETTINGS, ...initialSettings });
    return loading ? null : (
        <MobileOptimizerWorkspace
            settings={settings}
            onSettingsChange={setSettings}
            onBackToBuilder={back}
        />
    );
}
const mount = (initialSettings = {}) =>
    render(
        <EquipmentProvider>
            <Workspace initialSettings={initialSettings} />
        </EquipmentProvider>
    );

describe("mobile optimizer integration", () => {
    beforeEach(() => {
        localStorage.clear();
        writeEquipmentDraft(optimizerBuild);
        window.history.replaceState(null, "", "/optymalizator?ui=mobile");
        vi.spyOn(window, "scrollTo").mockImplementation(() => {});
        back.mockClear();
        HTMLDialogElement.prototype.showModal = vi.fn(function () {
            this.open = true;
        });
        HTMLDialogElement.prototype.close = vi.fn(function () {
            this.open = false;
        });
        server.use(
            http.get("*/api/initial-data", () => HttpResponse.json(optimizerCatalog)),
            http.post("*/api/calculator/calculate", () =>
                HttpResponse.json({
                    stats: { CRITICAL_CHANCE: "12%", MANA_USAGE_REDUCTION: "-10%" },
                })
            )
        );
    });
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        delete HTMLDialogElement.prototype.showModal;
        delete HTMLDialogElement.prototype.close;
    });

    it("keeps advanced goals and options across sections and sends their normalized values", async () => {
        let requestBody;
        server.use(
            http.post("*/api/optimizer/drifs", async ({ request }) => {
                requestBody = await request.json();
                return HttpResponse.json(optimizerResponse());
            })
        );
        mount();
        await screen.findByRole("heading", { name: "Optymalizator" });
        change("Tryb optymalizatora", "ADVANCED");
        expect(button("Uruchom optymalizację")).toBeDisabled();
        click("＋ Dodaj cel");
        change("Szukaj bonusu", "brak");
        expect(screen.getByRole("status")).toHaveTextContent("Brak pasujących bonusów");
        change("Szukaj bonusu", "");
        change("Kategoria", "UTILITY");
        expect(screen.queryByRole("button", { name: "Szansa na krytyk" })).not.toBeInTheDocument();
        change("Kategoria", "ALL");
        click("Szansa na krytyk");
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        change("Waga priorytetu dla Szansa na krytyk", "25");
        click("Wymuś konkretny procent dla Szansa na krytyk");
        click("Uruchom optymalizację");
        expect(screen.getByRole("alert")).toHaveTextContent("Podaj poprawny");
        click("Zamknij komunikat");
        change("Wymuszony procent dla Szansa na krytyk", "60");
        fireEvent.click(screen.getByText("Rozmiary drifów", { selector: "summary" }));
        fireEvent.click(screen.getByLabelText("Ogranicz SUBDRIF dla Szansa na krytyk"));
        change("Minimum SUBDRIF dla Szansa na krytyk", "1");
        fireEvent.click(screen.getByText("Opcje i warianty"));
        fireEvent.click(screen.getByLabelText("Wymuś maksymalizację według bonusów do drifów"));
        fireEvent.click(screen.getByLabelText("Obliczaj dodatkowe warianty"));
        change("Maksymalna strata wariantu (%)", "8");
        section("Blokady");
        section("Cele");
        expect(screen.getByLabelText("Wymuszony procent dla Szansa na krytyk")).toHaveValue(60);
        click("Uruchom optymalizację");
        await screen.findByText("Obliczenia zakończone.");
        expect(requestBody).toMatchObject({
            configurationMode: "ADVANCED",
            priorities: { CRITICAL_CHANCE: 25 },
            forcedPercentageTargets: { CRITICAL_CHANCE: 60 },
            drifSizeQuantities: { CRITICAL_CHANCE: { SUBDRIF: { min: 1, max: 12 } } },
            forceMaximizationByDrifBonus: true,
            generateVariants: true,
            maxVariantLossPercent: 8,
        });
        expect(
            screen.queryByRole("region", { name: "Wynik optymalizacji" })
        ).not.toBeInTheDocument();
        click("Pokaż wynik →");
        expect(screen.getByText("Cel", { selector: "small" })).toBeInTheDocument();
        expect(
            screen.getByText("60%", { selector: ".optimizer-goal-target span" })
        ).toBeInTheDocument();
        click(/Wynik główny/);
        click("Zastosuj wybrany wariant");
        expect(readEquipmentDraft().requestData.slots.boots.drifIds).toEqual([60]);
    });

    it("cancels an advisor run from another section and protects an outdated recommendation", async () => {
        let requestBody;
        let complete;
        let cancellationToken;
        const pending = new Promise((resolve) => {
            complete = resolve;
        });
        server.use(
            http.post("*/api/optimizer/drifs", async ({ request }) => {
                requestBody = await request.json();
                await pending;
                return HttpResponse.json(optimizerResponse(true, "CANCELLED"));
            }),
            http.post("*/api/optimizer/advisor/:id/cancel", ({ request }) => {
                cancellationToken = request.headers.get("x-advisor-cancellation-token");
                complete();
                return HttpResponse.json({ cancelled: true });
            })
        );
        mount();
        await screen.findByRole("heading", { name: "Optymalizator" });
        change("Tryb optymalizatora", "ADVISOR");
        section("Porady");
        expect(
            screen.getByText("Uruchom analizę, aby zobaczyć propozycje zmian buildu.")
        ).toBeInTheDocument();
        section("Cel i ochrony");
        await waitFor(() => expect(button("Analizuj build")).toBeEnabled());
        change("Główny cel", "CRITICAL_CHANCE");
        change("Oczekiwany efekt", "VALUE");
        change("Wartość celu (%)", "60");
        change("Dopuszczalny spadek: Redukcja zużycia many", "3");
        section("Dozwolone zmiany");
        change("Profil buildu", "MAGICAL");
        fireEvent.click(screen.getByLabelText("Ulepszanie drifów"));
        change("Maksymalna liczba działań w planie", "10");
        click("Analizuj build");
        await waitFor(() => expect(requestBody?.advisor?.maxActions).toBe(10));
        expect(requestBody.advisor.profession).toBe("MAGICAL");
        section("Build i blokady");
        expect(screen.getByLabelText("Tryb optymalizatora")).toBeDisabled();
        click("Zatrzymaj i pokaż znalezione plany");
        await screen.findByText("Obliczenia zakończone.");
        expect(cancellationToken).toBe(requestBody.advisor.cancellationToken);
        expect(readEquipmentDraft().requestData.slots.helmet.drifIds).toEqual([60]);
        const helmet = screen.getByText("Hełm podróżnika").closest(".optimizer-lock-card");
        fireEvent.click(within(helmet).getByRole("button", { name: "Zablokuj cały slot" }));
        section("Porady");
        expect(screen.getByText("Analiza anulowana", { exact: true })).toBeInTheDocument();
        expect(screen.getByLabelText("Plan zmian")).toHaveTextContent("Przenieś SUBDRIF Band 6");
        click("Zastosuj wybrany wariant");
        expect(screen.getByRole("alert")).toHaveTextContent("Build zmienił się od analizy");
        section("Build i blokady");
        click("Odblokuj slot");
        section("Porady");
        click("Zastosuj wybrany wariant");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(readEquipmentDraft().requestData.slots.boots.drifIds).toEqual([60]);
    });

    it("closes a directly linked picker, handles browser Back and keeps simple profile settings", async () => {
        window.history.replaceState(null, "", "/optymalizator?section=invalid&pick=bonus");
        mount({ configurationMode: "ADVANCED" });
        await screen.findByRole("dialog");
        click("Zamknij wybór celu");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(window.location.search).not.toContain("pick=");
        const user = userEvent.setup();
        await user.click(button("＋ Dodaj cel"));
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(button("＋ Dodaj cel")).toHaveFocus();
        await user.click(button("＋ Dodaj cel"));
        fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        change("Tryb optymalizatora", "SIMPLE");
        change("Profil prostego optymalizatora", "DRUID");
        change("Styl buildu", "DEFENSIVE");
        section("Wynik");
        expect(
            screen.getByText("Uruchom optymalizację, aby zobaczyć wynik i realizację celów.")
        ).toBeInTheDocument();
        section("Profil");
        expect(screen.getByLabelText("Styl buildu")).toHaveValue("DEFENSIVE");
        click("← Edytuj ekwipunek");
        expect(back).toHaveBeenCalledOnce();
    });
});
