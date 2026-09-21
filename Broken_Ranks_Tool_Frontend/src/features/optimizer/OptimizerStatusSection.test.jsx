import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OptimizerStatusSection from "./OptimizerStatusSection";

describe("OptimizerStatusSection", () => {
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
        expect(screen.getByText("Zastosowano najlepszy znaleziony układ.")).toBeInTheDocument();
        expect(screen.getByText("8 drifów")).toBeInTheDocument();
        expect(screen.getByText("Wykorzystana pojemność")).toBeInTheDocument();
        expect(screen.getByText("1.24 s")).toBeInTheDocument();
        expect(screen.getByText("Zaawansowany")).toBeInTheDocument();
        expect(screen.getByText("Podtryb")).toBeInTheDocument();
    });

    it("shows advisor quality, limits, and proof scope", () => {
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

        expect(screen.getByText("Optimum potwierdzone")).toBeInTheDocument();
        expect(screen.getByText("42")).toBeInTheDocument();
        expect(screen.getByText("12/12")).toBeInTheDocument();
        expect(screen.getByText("pełny dowód")).toBeInTheDocument();
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

        expect(screen.getByText("Analiza anulowana")).toBeInTheDocument();
        expect(container.querySelector(".is-warning")).toBeInTheDocument();
        expect(screen.getByText("!")).toBeInTheDocument();
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

        expect(screen.getByText(/Wynik nie został zastosowany automatycznie/)).toHaveTextContent(
            "kalkulator liczy aktualny ekwipunek"
        );
        expect(screen.getByText(/Wynik nie został zastosowany automatycznie/)).toHaveTextContent(
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
    });
});
