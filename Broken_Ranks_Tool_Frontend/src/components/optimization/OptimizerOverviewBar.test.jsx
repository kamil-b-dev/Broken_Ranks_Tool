import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OptimizerOverviewBar from "./OptimizerOverviewBar";

describe("OptimizerOverviewBar", () => {
    it("derives optimizer input counts from the current build", () => {
        render(
            <OptimizerOverviewBar
                slots={{
                    helmet: { itemId: 1, drifIds: [10, null, 11] },
                    weapon: { itemId: 2, drifIds: [20] },
                    armor: { itemId: null, drifIds: [] },
                }}
                lockedSlots={["helmet"]}
                lockedDrifs={{ helmet: [0, 2], weapon: [0] }}
            />
        );

        expect(screen.getByText("2/12")).toBeInTheDocument();
        expect(screen.getByText("1", { selector: "dd" })).toBeInTheDocument();
        expect(screen.getAllByText("3", { selector: "dd" })).toHaveLength(2);
    });
});
