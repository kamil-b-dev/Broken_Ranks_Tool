import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CategoryIcon from "./CategoryIcon";

describe("CategoryIcon", () => {
    it.each([
        ["orbs", "OFFENSIVE", "orb-offensive.webp"],
        ["orb", "DEFENSIVE", "orb-defensive.webp"],
        ["drifs", "UTILITY", "drif-utility.webp"],
    ])("maps %s %s to the expected artwork", (kind, category, fileName) => {
        const { container } = render(<CategoryIcon kind={kind} category={category} />);

        expect(container.querySelector("img")).toHaveAttribute(
            "src",
            expect.stringContaining(fileName)
        );
    });

    it("renders the provided fallback for an unknown category", () => {
        render(
            <CategoryIcon
                kind="drif"
                category="UNKNOWN"
                fallback={<span data-testid="fallback">◇</span>}
            />
        );

        expect(screen.getByTestId("fallback")).toBeInTheDocument();
    });
});
