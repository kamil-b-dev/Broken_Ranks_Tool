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
    });

    it("shows an empty report hint before the first run", () => {
        render(<OptimizerStatusSection isOptimizing={false} />);

        expect(
            screen.getByText("Wynik i ostrzeżenia z kolejnej optymalizacji pojawią się tutaj.")
        ).toBeInTheDocument();
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
