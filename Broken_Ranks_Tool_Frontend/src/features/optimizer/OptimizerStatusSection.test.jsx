import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OptimizerStatusSection from "./OptimizerStatusSection";

describe("OptimizerStatusSection", () => {
    it("shows owned levels alongside the original optimization targets without offering to apply the target", () => {
        render(
            <OptimizerStatusSection
                status={{
                    success: true,
                    message: "Użyto drifów z plecaka.",
                    backpackDrifTargets: [
                        {
                            entryId: "used",
                            slotLabel: "Buty",
                            drifName: "Alorn",
                            size: "ARCYDRIF",
                            level: 18,
                            targetLevel: 21,
                        },
                    ],
                }}
            />
        );
        expect(screen.getByText("Drify z plecaka — poziomy docelowe")).toBeInTheDocument();
        expect(screen.getByText("18")).toBeInTheDocument();
        expect(screen.getByText("21")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
    it.each([
        ["TIME_LIMIT", "Upłynął czas przeznaczony na wyszukiwanie."],
        ["STATE_LIMIT", "Osiągnięto limit sprawdzanych układów."],
        ["OPERATION_LIMIT", "Osiągnięto limit obliczeń."],
        ["CANCELLED", "Wyszukiwanie zostało anulowane."],
        ["INTERRUPTED", "Wyszukiwanie zostało przerwane."],
        ["COMPLETED", "Lepszy układ może jeszcze istnieć."],
    ])("distinguishes advisor stop reason %s", (stopReason, label) => {
        render(
            <OptimizerStatusSection
                status={{
                    success: true,
                    outcome: "VALID_BUILD",
                    message: "Gotowe.",
                    advisorReport: { status: "BEST_FOUND", stopReason },
                }}
            />
        );
        expect(screen.getByText(label, { exact: false })).toBeInTheDocument();
        expect(screen.queryByText(/Sprawdzono wszystkie możliwości/)).not.toBeInTheDocument();
    });
    it("explains a search limit without technical counters or misclassifying the valid build", () => {
        const { container } = render(
            <OptimizerStatusSection
                status={{
                    success: true,
                    outcome: "VALID_BUILD_SOFT_TARGETS_UNMET",
                    message: "Cel nieosiągnięty.",
                    searchReport: {
                        stopReason: "OPERATION_LIMIT",
                        evaluatedStates: 123,
                        verifiedStates: 7,
                    },
                }}
            />
        );
        expect(container.querySelector(".is-warning")).toBeInTheDocument();
        expect(screen.getByText(/Osiągnięto limit obliczeń/)).not.toBeVisible();
        expect(
            screen.getByText("Układ jest gotowy. Nie wszystkie cele zostały osiągnięte.")
        ).toBeVisible();
        fireEvent.click(screen.getByText("Szczegóły obliczeń"));
        expect(screen.getByText(/Osiągnięto limit obliczeń/)).toBeVisible();
        expect(screen.queryByText("123")).not.toBeInTheDocument();
        expect(screen.queryByText("7")).not.toBeInTheDocument();
        expect(screen.queryByText("Oceny stanów")).not.toBeInTheDocument();
        expect(screen.queryByText("Przeliczenia kalkulatorem")).not.toBeInTheDocument();
    });
    it("shows live optimization progress", () => {
        render(<OptimizerStatusSection isOptimizing elapsedSeconds={7} />);

        expect(screen.getByText("Optymalizacja trwa (7 s).")).toBeInTheDocument();
    });

    it("presents warnings and run metrics", () => {
        render(
            <OptimizerStatusSection
                status={{
                    success: false,
                    applied: true,
                    message: "Znaleziono częściowy wynik.",
                    warnings: ["Nie osiągnięto celu."],
                    configurationMode: "ADVANCED",
                    drifsPlaced: 8,
                    totalPowerUsed: 302,
                    executionTimeSeconds: 1.236,
                }}
            />
        );

        expect(screen.getByText("Znaleziono częściowy wynik.")).toBeInTheDocument();
        expect(screen.getByText("Nie osiągnięto celu.")).toBeInTheDocument();
        expect(screen.getByText("Ten układ jest obecnie założony.")).toBeVisible();
        expect(screen.getByText("8")).toBeVisible();
        expect(screen.getByText("Drify w układzie")).toBeVisible();
        expect(screen.getByText(/Zajęta pojemność:/)).toHaveTextContent("Zajęta pojemność: 302.");
        expect(screen.getByText("1,24 s")).toBeVisible();
        expect(screen.queryByText("Zaawansowany")).not.toBeInTheDocument();
        expect(screen.queryByText("Podtryb")).not.toBeInTheDocument();
    });

    it("explains a complete advisor search without diagnostic metrics", () => {
        render(
            <OptimizerStatusSection
                status={{
                    success: true,
                    message: "Gotowe.",
                    advisorReport: {
                        status: "OPTIMAL",
                        evaluatedStates: 42,
                        verifiedCandidates: 12,
                        candidateCount: 12,
                        maxActions: 3,
                        searchSpaceExhausted: true,
                        proofComplete: true,
                    },
                }}
            />
        );

        expect(
            screen.getByText("Sprawdzono wszystkie możliwości w wybranym zakresie.")
        ).toBeInTheDocument();
        expect(screen.queryByText(/Lepszy układ/)).not.toBeInTheDocument();
        expect(screen.queryByText("42")).not.toBeInTheDocument();
        expect(screen.queryByText("12/12")).not.toBeInTheDocument();
        expect(screen.queryByText("Limit działań")).not.toBeInTheDocument();
    });

    it("presents cancelled advisor analysis as a warning", () => {
        const { container } = render(
            <OptimizerStatusSection
                status={{
                    success: true,
                    message: "Analizę zatrzymano.",
                    advisorReport: { status: "CANCELLED" },
                }}
            />
        );

        expect(screen.getByText(/Wyszukiwanie zostało anulowane/)).toBeInTheDocument();
        expect(container.querySelector(".is-warning")).toBeInTheDocument();
        expect(screen.getByText("!")).toBeInTheDocument();
    });
    it("makes a proven unattainable advisor goal clear without claiming proof for an incomplete search", () => {
        const status = {
            success: false,
            applied: false,
            message: "Nie znaleziono poprawy.",
            advisorReport: { status: "INFEASIBLE", proofComplete: true },
        };
        const view = render(<OptimizerStatusSection status={status} />);
        expect(
            screen.getByText("Przy wybranych ustawieniach nie da się osiągnąć celu.")
        ).toBeVisible();
        view.rerender(
            <OptimizerStatusSection
                status={{
                    ...status,
                    advisorReport: { status: "BEST_FOUND", proofComplete: false },
                }}
            />
        );
        expect(screen.getByText("Nie znaleziono poprawy.")).toBeVisible();
        expect(screen.queryByText(/nie da się osiągnąć celu/)).not.toBeInTheDocument();
    });

    it("does not add placeholder copy before the first run", () => {
        const { container } = render(<OptimizerStatusSection isOptimizing={false} />);

        expect(container.querySelector(".optimizer-status-section")).toBeEmptyDOMElement();
    });

    it("explains why an unapplied result differs from the calculator", () => {
        render(
            <OptimizerStatusSection
                status={{
                    success: false,
                    applied: false,
                    message: "Nie osiągnięto capa.",
                    warnings: ["Podwojny atak (59.18/60.00)."],
                    nextVariants: [{ main: true }],
                }}
            />
        );

        expect(screen.getByText(/Ekwipunek pozostaje bez zmian/)).toHaveTextContent(
            "Zastosuj wybrany wariant"
        );
    });

    it("does not offer a proposal when optimization returned no variants", () => {
        render(
            <OptimizerStatusSection
                status={{ success: false, applied: false, message: "Błąd", nextVariants: [] }}
            />
        );

        expect(
            screen.queryByText(/Wynik nie został zastosowany automatycznie/)
        ).not.toBeInTheDocument();
        expect(screen.getByText("Ekwipunek nie został zmieniony.")).toBeVisible();
    });
    it("keeps a successful result concise and reports that it has been applied", () => {
        render(
            <OptimizerStatusSection
                status={{
                    success: true,
                    outcome: "VALID_BUILD",
                    applied: true,
                    message:
                        "Znaleziono najlepszy sprawdzony poprawny układ; heurystyka nie dowodzi globalnego optimum.",
                    drifsPlaced: 33,
                    totalPowerUsed: 307,
                    executionTimeSeconds: 3.76,
                    searchReport: {
                        stopReason: "OPERATION_LIMIT",
                        evaluatedStates: 47327,
                        verifiedStates: 147,
                        proofComplete: false,
                    },
                }}
            />
        );
        expect(screen.getByText("Układ drifów jest gotowy.")).toBeVisible();
        expect(screen.getByText("Ten układ jest obecnie założony.")).toBeVisible();
        expect(screen.getByText("3,76 s")).toBeVisible();
        expect(screen.queryByText("47327")).not.toBeInTheDocument();
        expect(screen.getByText("307")).not.toBeVisible();
        expect(screen.getByText(/Lepszy układ może jeszcze istnieć/)).not.toBeVisible();
        fireEvent.click(screen.getByText("Szczegóły obliczeń"));
        expect(screen.getByText(/Lepszy układ może jeszcze istnieć/)).toBeVisible();
    });
    it("does not show empty details just for the selected configuration mode", () => {
        render(
            <OptimizerStatusSection
                status={{
                    outcome: "INVALID_INPUT",
                    message: "Błąd.",
                    configurationMode: "ADVANCED",
                }}
            />
        );
        expect(screen.queryByText("Szczegóły obliczeń")).not.toBeInTheDocument();
    });
    it("keeps validation failures specific and never implies that an empty result was applied", () => {
        render(
            <OptimizerStatusSection
                status={{
                    success: false,
                    outcome: "INVALID_INPUT",
                    applied: false,
                    message: "Slot Hełm: za mało pojemności.",
                    drifsPlaced: 0,
                }}
            />
        );
        expect(screen.getByText("Slot Hełm: za mało pojemności.")).toBeVisible();
        expect(screen.getByText("Ekwipunek nie został zmieniony.")).toBeVisible();
        expect(screen.queryByText("Drify w układzie")).not.toBeInTheDocument();
    });
});
