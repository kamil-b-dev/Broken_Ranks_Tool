import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ProfessionProvider from "./ProfessionProvider";
import EquipmentRequirements from "../features/builder/preview/EquipmentRequirements";
import SimpleProfileGoalsPanel from "../features/optimizer/simple-profile/SimpleProfileGoalsPanel";
import { useProfessionOptimizerSettings } from "../features/optimizer/useProfessionOptimizerSettings";
import { DEFAULT_OPTIMIZER_SETTINGS } from "../features/optimizer/optimizerDefaults";
import { buildOptimizationConfig } from "../features/optimizer/optimizerConfiguration";
import ProgressionWorkspace from "../features/progression-path/ProgressionWorkspace";
import apiClient from "../shared/api/axiosConfig";

vi.mock("../shared/api/axiosConfig", () => ({ default: { post: vi.fn() } }));
const data = { items: [], drifs: [], orbs: [] };
const requestData = { slots: {}, characterStats: {} };
const snapshot = () => ({
    payload: {
        format: "broken-ranks-tool-build",
        version: 1,
        build: { requestData, backpack: [], lockedSlots: [], lockedDrifs: {} },
    },
});
function Controls() {
    const [stored, change] = useState(DEFAULT_OPTIMIZER_SETTINGS);
    const [settings, setSettings] = useProfessionOptimizerSettings(stored, change);
    return (
        <>
            <section aria-label="builder">
                <EquipmentRequirements requestData={requestData} items={[]} />
            </section>
            <SimpleProfileGoalsPanel settings={settings} onChange={setSettings} />
            <output data-testid="request">
                {JSON.stringify(buildOptimizationConfig([], settings))}
            </output>
            <section aria-label="planner">
                <ProgressionWorkspace data={data} createSnapshot={snapshot} />
            </section>
        </>
    );
}
beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
});
const builderProfession = () =>
    within(screen.getByRole("region", { name: "builder" })).getByLabelText("Profesja");
const plannerProfession = () =>
    within(screen.getByRole("region", { name: "planner" })).getByLabelText("Profesja");
const optimizerProfession = () => screen.getByLabelText("Profil prostego optymalizatora");

it("shares manual choices in both directions, sends the matching optimizer profile and persists on remount", () => {
    const view = render(
        <ProfessionProvider>
            <Controls />
        </ProfessionProvider>
    );
    fireEvent.change(builderProfession(), { target: { value: "FIRE_MAGE" } });
    expect(optimizerProfession()).toHaveValue("FIRE_MAGE");
    expect(plannerProfession()).toHaveValue("FIRE_MAGE");
    expect(JSON.parse(screen.getByTestId("request").textContent).simpleProfile).toBe("FIRE_MAGE");
    fireEvent.change(optimizerProfession(), { target: { value: "KNIGHT" } });
    expect(builderProfession()).toHaveValue("KNIGHT");
    expect(plannerProfession()).toHaveValue("KNIGHT");
    fireEvent.change(plannerProfession(), { target: { value: "DRUID" } });
    expect(builderProfession()).toHaveValue("DRUID");
    expect(optimizerProfession()).toHaveValue("DRUID");
    view.unmount();
    render(
        <ProfessionProvider>
            <Controls />
        </ProfessionProvider>
    );
    expect(builderProfession()).toHaveValue("DRUID");
    expect(optimizerProfession()).toHaveValue("DRUID");
    expect(plannerProfession()).toHaveValue("DRUID");
});

it("infers the shared profession from the equipped weapon, but keeps a manual choice", () => {
    const items = [
        { id: 1, allowedClasses: ["FIRE_MAGE"] },
        { id: 2, allowedClasses: ["ARCHER"] },
    ];
    const view = render(
        <ProfessionProvider items={items} slots={{ weapon: { itemId: 1 } }}>
            <Controls />
        </ProfessionProvider>
    );
    expect(optimizerProfession()).toHaveValue("FIRE_MAGE");
    expect(plannerProfession()).toHaveValue("FIRE_MAGE");
    fireEvent.change(builderProfession(), { target: { value: "DRUID" } });
    view.rerender(
        <ProfessionProvider items={items} slots={{ weapon: { itemId: 2 } }}>
            <Controls />
        </ProfessionProvider>
    );
    expect(optimizerProfession()).toHaveValue("DRUID");
    fireEvent.change(builderProfession(), { target: { value: "AUTO" } });
    expect(optimizerProfession()).toHaveValue("ARCHER");
    expect(plannerProfession()).toHaveValue("ARCHER");
});

it("ignores a stale planner response after a profession change elsewhere", async () => {
    let complete;
    apiClient.post.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                complete = resolve;
            })
    );
    render(
        <ProfessionProvider>
            <Controls />
        </ProfessionProvider>
    );
    fireEvent.change(screen.getByLabelText("Docelowy build"), { target: { value: "current" } });
    fireEvent.click(screen.getByRole("button", { name: "Zaplanuj ścieżkę" }));
    expect(apiClient.post).toHaveBeenCalledOnce();
    fireEvent.change(builderProfession(), { target: { value: "FIRE_MAGE" } });
    expect(apiClient.post.mock.calls[0][2].signal.aborted).toBe(true);
    await act(async () => complete({ data: { stages: [], warnings: [], remainingDrifs: [] } }));
    expect(plannerProfession()).toHaveValue("FIRE_MAGE");
    expect(screen.queryByText("Brak pełnej ścieżki")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zaplanuj ścieżkę" })).toBeEnabled();
});
