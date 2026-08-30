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
                    executionTimeSeconds: 1.236,
                }}
            />
        );

        expect(screen.getByText("Znaleziono częściowy wynik.")).toBeInTheDocument();
        expect(screen.getByText("Nie osiągnięto celu.")).toBeInTheDocument();
        expect(screen.getByText("Zastosowano najlepszy znaleziony układ.")).toBeInTheDocument();
        expect(screen.getByText("8 drifów")).toBeInTheDocument();
        expect(screen.getByText("1.24 s")).toBeInTheDocument();
    });

    it("shows an empty report hint before the first run", () => {
        render(<OptimizerStatusSection isOptimizing={false} />);

        expect(
            screen.getByText("Wynik i ostrzeżenia z kolejnej optymalizacji pojawią się tutaj.")
        ).toBeInTheDocument();
    });
});
