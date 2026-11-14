import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import AdvisorExclusions from "./AdvisorExclusions";

it("adds and removes exclusions without changing the remaining advisor settings", () => {
    function Harness() {
        const [settings, onChange] = useState({ advisorGoal: "DEFENSE" });
        return (
            <>
                <AdvisorExclusions
                    settings={settings}
                    onChange={onChange}
                    data={{
                        items: [
                            { id: 12, name: "Hełm" },
                            { id: 13, name: "Zbroja" },
                        ],
                    }}
                    gameRules={{
                        bonusTranslations: { DEFENSE: "Obrona", OTHER: "Inny" },
                        drifBasePowers: { DEFENSE: 1 },
                    }}
                />
                <output>{JSON.stringify(settings)}</output>
            </>
        );
    }
    render(<Harness />);
    fireEvent.click(screen.getByText("Wykluczenia Doradcy"));
    fireEvent.change(screen.getByLabelText("Nie proponuj przedmiotu"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Nie kupuj typu drifa"), {
        target: { value: "DEFENSE" },
    });
    expect(screen.queryByRole("option", { name: "Inny" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Hełm" })).not.toBeInTheDocument();
    expect(JSON.parse(screen.getByRole("status").textContent)).toEqual({
        advisorGoal: "DEFENSE",
        advisorExclusions: { itemIds: [12], purchaseBonusTypes: ["DEFENSE"] },
    });
    fireEvent.click(screen.getAllByText("Usuń wykluczenie")[0]);
    fireEvent.click(screen.getByText("Usuń wykluczenie"));
    expect(JSON.parse(screen.getByRole("status").textContent).advisorExclusions).toEqual({
        itemIds: [],
        purchaseBonusTypes: [],
    });
});

it("preserves unknown saved exclusions when the catalogue is unavailable", () => {
    render(
        <AdvisorExclusions
            settings={{ advisorExclusions: { itemIds: [99], purchaseBonusTypes: ["UNKNOWN"] } }}
            onChange={() => {}}
        />
    );
    expect(screen.getByText("99")).toBeInTheDocument();
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
});
