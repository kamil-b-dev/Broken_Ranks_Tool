import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import apiClient from "../../shared/api/axiosConfig";
import ProgressionWorkspace from "./ProgressionWorkspace";
import { createBuildPayload } from "../builds/buildPayload";
import { PROGRESSION_PROGRESS_KEY } from "./progressionProgress";

vi.mock("../../shared/api/axiosConfig", () => ({ default: { post: vi.fn() } }));
const data = { items: [], drifs: [], orbs: [] };
const payload = createBuildPayload({
    requestData: { slots: {}, characterStats: {} },
    characterConfig: null,
    lockedSlots: [],
    lockedDrifs: {},
    backpack: [],
});
const createSnapshot = () => ({ payload });
const report = () => ({
    stages: [20, 140].map((level) => ({
        stage: {
            id: String(level),
            characterLevel: level,
            equipment: { slots: {}, characterStats: {} },
        },
        actions: [],
        orbActions: [],
        calculation: { stats: {} },
    })),
    warnings: [],
    remainingDrifs: [],
    resSlots: [],
});
beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    apiClient.post.mockResolvedValue({ data: report() });
});

it("restores the level and checklist after reopening and replanning, without trusting a saved report", async () => {
    const user = userEvent.setup();
    const props = { data, createSnapshot };
    const { unmount } = render(<ProgressionWorkspace {...props} />);
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    await user.click(screen.getByRole("button", { name: "Zaplanuj ścieżkę" }));
    await user.click(await screen.findByRole("checkbox", { name: "Poziom 20 wykonany" }));
    fireEvent.change(screen.getByLabelText("Twój poziom"), { target: { value: "42" } });
    fireEvent.blur(screen.getByLabelText("Twój poziom"));
    expect(JSON.parse(localStorage.getItem(PROGRESSION_PROGRESS_KEY))).toMatchObject({
        playerLevel: 42,
        completed: [20],
    });
    unmount();
    render(<ProgressionWorkspace {...props} />);
    expect(screen.queryByRole("heading", { name: "Plan rozwoju" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Odtwórz plan" }));
    await waitFor(() =>
        expect(screen.getByRole("checkbox", { name: "Poziom 20 wykonany" })).toBeChecked()
    );
    expect(screen.getByLabelText("Twój poziom")).toHaveValue(42);
    expect(apiClient.post).toHaveBeenCalledTimes(2);
});

it("does not reuse old checkmarks for changed instructions at the same level", async () => {
    const user = userEvent.setup();
    render(<ProgressionWorkspace data={data} createSnapshot={createSnapshot} />);
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    await user.click(screen.getByRole("button", { name: "Zaplanuj ścieżkę" }));
    await user.click(await screen.findByRole("checkbox", { name: "Poziom 20 wykonany" }));
    const changed = report();
    changed.stages[0].stage.equipment.characterStats = { Moc: 10 };
    apiClient.post.mockResolvedValue({ data: changed });
    await user.click(screen.getByRole("button", { name: "Zaplanuj ścieżkę" }));
    await waitFor(() =>
        expect(screen.getByRole("checkbox", { name: "Poziom 20 wykonany" })).not.toBeChecked()
    );
    expect(screen.getByText(/Plan się zmienił/)).toBeVisible();
});

it("shows a save failure, keeps marks in memory and retries the pending checkpoint", async () => {
    const user = userEvent.setup();
    render(<ProgressionWorkspace data={data} createSnapshot={createSnapshot} />);
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    await user.click(screen.getByRole("button", { name: "Zaplanuj ścieżkę" }));
    await screen.findByRole("checkbox", { name: "Poziom 20 wykonany" });
    const setItem = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
        if (key === PROGRESSION_PROGRESS_KEY) throw new Error("quota");
        return setItem.call(this, key, value);
    });
    await user.click(screen.getByRole("checkbox", { name: "Poziom 20 wykonany" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się zapisać postępu");
    expect(screen.getByRole("checkbox", { name: "Poziom 20 wykonany" })).toBeChecked();
    spy.mockRestore();
    await user.click(screen.getByRole("button", { name: "Ponów zapis" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PROGRESSION_PROGRESS_KEY)).completed).toEqual([20]);
});
