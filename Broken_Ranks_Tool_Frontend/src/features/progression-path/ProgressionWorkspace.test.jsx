import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import apiClient from "../../shared/api/axiosConfig";
import { createBuildPayload } from "../builds/buildPayload";
import ProgressionWorkspace from "./ProgressionWorkspace";
import {
    PROJECT_STORAGE_KEY,
    PROJECT_FORMAT,
    projectPayload,
    newProject,
} from "./progressionProject";
import epicTarget from "../../test/fixtures/builds/progression-epic-target.json";

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
beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
});

const uploadedFile = (name, content) => ({ name, size: content.length, text: async () => content });

it("imports a target file and preserves the previous target after an invalid import", async () => {
    const user = userEvent.setup();
    const { container } = render(
        <ProgressionWorkspace data={data} createSnapshot={createSnapshot} />
    );
    const input = container.querySelector('input[accept=".json,.txt"]');
    fireEvent.change(input, {
        target: { files: [uploadedFile("Mag.json", JSON.stringify(payload))] },
    });
    await waitFor(() => expect(screen.getByLabelText("Docelowy build")).toHaveDisplayValue("Mag"));
    fireEvent.change(input, { target: { files: [uploadedFile("invalid.json", "{broken")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(
        "Plik nie zawiera poprawnego JSON-a."
    );
    expect(screen.getByLabelText("Docelowy build")).toHaveDisplayValue("Mag");
    // A delayed import must not overwrite a later explicit source selection.
    let resolve;
    fireEvent.change(input, {
        target: {
            files: [
                {
                    name: "delayed.json",
                    size: 10,
                    text: () =>
                        new Promise((done) => {
                            resolve = done;
                        }),
                },
            ],
        },
    });
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    await act(async () => resolve(JSON.stringify(payload)));
    expect(screen.getByLabelText("Docelowy build")).toHaveDisplayValue("Aktualny build");
});

it("loads a project and rejects oversized or invalid replacements without losing it", async () => {
    const { container } = render(
        <ProgressionWorkspace data={data} createSnapshot={createSnapshot} />
    );
    const input = container.querySelector('input[accept=".json"]');
    const saved = projectPayload({ ...newProject(), characterClass: "DRUID", minItemLevelGap: 20 });
    fireEvent.change(input, {
        target: { files: [uploadedFile("project.json", JSON.stringify(saved))] },
    });
    await waitFor(() => expect(screen.getByLabelText("Profesja")).toHaveValue("DRUID"));
    expect(screen.getByLabelText("Pomijaj zmianę ekwipunku co X poziom")).toHaveValue(20);
    fireEvent.change(input, {
        target: { files: [{ name: "large.json", size: 5 * 1024 * 1024 + 1 }] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Plik projektu jest zbyt duży.");
    expect(screen.getByLabelText("Profesja")).toHaveValue("DRUID");
    fireEvent.change(input, { target: { files: [uploadedFile("wrong.json", "{}")] } });
    await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Nieobsługiwany lub niepoprawny projekt ścieżki."
        )
    );
    expect(screen.getByLabelText("Pomijaj zmianę ekwipunku co X poziom")).toHaveValue(20);
});

it("warns when migrating a legacy project and regenerates its report", async () => {
    const { container } = render(
        <ProgressionWorkspace data={data} createSnapshot={createSnapshot} />
    );
    const legacy = {
        format: PROJECT_FORMAT,
        version: 1,
        project: {
            characterClass: "ARCHER",
            stages: [{ name: "Cel ze starego pliku", characterLevel: 140, payload }],
        },
    };
    fireEvent.change(container.querySelector('input[accept=".json"]'), {
        target: { files: [uploadedFile("legacy.json", JSON.stringify(legacy))] },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
        /Ze starszego projektu przyjęto ostatni etap jako cel/
    );
    expect(screen.getByLabelText("Docelowy build")).toHaveDisplayValue("Cel ze starego pliku");
    expect(screen.queryByRole("heading", { name: "Brak pełnej ścieżki" })).not.toBeInTheDocument();
});

it("reports server failures and allows retrying without losing the target", async () => {
    const user = userEvent.setup();
    apiClient.post.mockRejectedValueOnce({
        response: { data: { message: "Serwer jest zajęty." } },
    });
    render(<ProgressionWorkspace data={data} createSnapshot={createSnapshot} />);
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    await user.click(screen.getByText("Zaplanuj ścieżkę"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Serwer jest zajęty.");
    expect(screen.getByLabelText("Docelowy build")).toHaveDisplayValue("Aktualny build");
    apiClient.post.mockResolvedValueOnce({
        data: { stages: [], warnings: [], remainingDrifs: [] },
    });
    await user.click(screen.getByText("Zaplanuj ścieżkę"));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(apiClient.post).toHaveBeenCalledTimes(2);
});

it("uses separately provided game rules when capturing and restoring an epic target", async () => {
    const user = userEvent.setup();
    const epicPayload = structuredClone(epicTarget);
    epicPayload.build.requestData.slots = { weapon: epicPayload.build.requestData.slots.weapon };
    epicPayload.build.lockedDrifs = {};
    const templates = {
        items: [
            {
                id: 174,
                name: "Żmij",
                rarity: "EPIC",
                tier: "IX",
                category: "WEAPON_2H",
                allowedClasses: ["FIRE_MAGE"],
            },
        ],
        orbs: [],
        drifs: [
            { id: 83, size: "MAGNIDRIF", bonusType: "CRITICAL_CHANCE" },
            { id: 91, size: "MAGNIDRIF", bonusType: "DOUBLE_ATTACK_CHANCE" },
        ],
    };
    const gameRules = { epicBuiltInDrifs: { Żmij: ["CRITICAL_CHANCE", "DOUBLE_ATTACK_CHANCE"] } };
    apiClient.post.mockResolvedValue({
        data: { stages: [], warnings: [], remainingDrifs: [], resSlots: [] },
    });
    const props = { data: templates, gameRules, createSnapshot: () => ({ payload: epicPayload }) };
    const { unmount } = render(<ProgressionWorkspace {...props} />);
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByText("Zaplanuj ścieżkę"));
    expect(apiClient.post.mock.calls[0][1].targetEquipment.slots.weapon).toEqual(
        epicPayload.build.requestData.slots.weapon
    );
    unmount();
    render(<ProgressionWorkspace {...props} />);
    expect(screen.getByLabelText("Docelowy build")).toHaveDisplayValue("Aktualny build");
    expect(screen.queryByText(/Nie udało się odczytać/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Profesja")).toHaveValue("FIRE_MAGE");
});

it("preserves an unreadable draft until an explicit edit", async () => {
    const user = userEvent.setup();
    localStorage.setItem(PROJECT_STORAGE_KEY, "{broken");
    render(<ProgressionWorkspace data={data} createSnapshot={createSnapshot} />);
    expect(screen.getByText(/Poprzedni szkic pozostaje zapisany/)).toBeInTheDocument();
    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBe("{broken");
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    expect(JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY)).project.target.name).toBe(
        "Aktualny build"
    );
});

it("captures the selected source immediately and preserves it when the file dialog is cancelled", async () => {
    const user = userEvent.setup();
    const libraryPayload = structuredClone(payload);
    libraryPayload.build.requestData.characterStats = { Moc: 42 };
    const snapshot = vi.fn(createSnapshot);
    const { container } = render(
        <ProgressionWorkspace
            data={data}
            createSnapshot={snapshot}
            builds={[{ id: "saved", name: "Mag", payload: libraryPayload }]}
        />
    );
    const source = screen.getByLabelText("Docelowy build");
    expect(source).toHaveDisplayValue("Wybierz źródło");
    expect(screen.queryByText("Źródło celu")).not.toBeInTheDocument();
    expect(
        screen.queryByRole("button", { name: "Wybierz build docelowy" })
    ).not.toBeInTheDocument();
    await user.selectOptions(source, "build:saved");
    expect(source).toHaveDisplayValue("Mag");
    expect(
        JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY)).project.target.payload.build
            .requestData.characterStats
    ).toEqual({ Moc: 42 });
    const picker = container.querySelector('input[accept=".json,.txt"]');
    const openPicker = vi.spyOn(picker, "click");
    await user.selectOptions(source, "file");
    expect(openPicker).toHaveBeenCalledOnce();
    expect(source).toHaveDisplayValue("Mag");
    await user.selectOptions(source, "current");
    expect(snapshot).toHaveBeenCalledOnce();
    expect(source).toHaveDisplayValue("Aktualny build");
    await user.selectOptions(source, "current");
    expect(snapshot).toHaveBeenCalledTimes(2);
});

it("plans from one target with res reservations and restores inputs without a historical report", async () => {
    const user = userEvent.setup();
    apiClient.post.mockResolvedValue({
        data: { stages: [], warnings: ["Brak ścieżki"], remainingDrifs: [], resSlots: [] },
    });
    const { unmount } = render(
        <ProgressionWorkspace data={data} createSnapshot={createSnapshot} />
    );
    expect(screen.getByRole("button", { name: "Zaplanuj ścieżkę" })).toBeDisabled();
    expect(screen.getByLabelText("Równomierny rozwój statystyk")).not.toBeChecked();
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    await user.click(screen.getByLabelText("Pierścień 1"));
    await user.click(screen.getByRole("button", { name: "Zaplanuj ścieżkę" }));
    await screen.findByRole("heading", { name: "Brak pełnej ścieżki" });
    const request = apiClient.post.mock.calls[0][1];
    expect(request.targetLevel).toBe(140);
    expect(request.balanceStats).toBe(false);
    expect(request.stages).toBeUndefined();
    expect(request.resSlots).toEqual(["ring1"]);
    expect(request.targetEquipment.slots.ring1.drifIds).toEqual([]);
    expect(payload.build.requestData).toEqual({ slots: {}, characterStats: {} });
    expect(JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY)).report).toBeUndefined();
    unmount();
    render(<ProgressionWorkspace data={data} createSnapshot={createSnapshot} />);
    expect(screen.getByLabelText("Poziom celu")).toHaveValue(140);
    expect(screen.getByLabelText("Pierścień 1: res")).toBeChecked();
    expect(screen.queryByRole("heading", { name: "Brak pełnej ścieżki" })).not.toBeInTheDocument();
});

it("discards a response after res or profession changes even when the transport resolves", async () => {
    const user = userEvent.setup();
    let resolve;
    apiClient.post.mockReturnValue(
        new Promise((done) => {
            resolve = done;
        })
    );
    render(<ProgressionWorkspace data={data} createSnapshot={createSnapshot} />);
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    await user.click(screen.getByText("Zaplanuj ścieżkę"));
    fireEvent.change(screen.getByLabelText("Profesja"), { target: { value: "DRUID" } });
    await act(async () =>
        resolve({ data: { stages: [], warnings: ["Nieaktualny wynik"], remainingDrifs: [] } })
    );
    expect(screen.queryByText("Nieaktualny wynik")).not.toBeInTheDocument();
    expect(apiClient.post.mock.calls[0][2].signal.aborted).toBe(true);
    await waitFor(() => expect(screen.getByText("Zaplanuj ścieżkę")).not.toBeDisabled());
});

it("saves balancing as a separate option and discards a pending response after it changes", async () => {
    const user = userEvent.setup();
    let resolve;
    apiClient.post.mockReturnValue(
        new Promise((done) => {
            resolve = done;
        })
    );
    const props = { data, createSnapshot };
    const { unmount } = render(<ProgressionWorkspace {...props} />);
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    await user.click(screen.getByText("Zaplanuj ścieżkę"));
    await user.click(screen.getByLabelText("Równomierny rozwój statystyk"));
    expect(apiClient.post.mock.calls[0][2].signal.aborted).toBe(true);
    await act(async () =>
        resolve({ data: { stages: [], warnings: ["Stary plan"], remainingDrifs: [] } })
    );
    expect(screen.queryByText("Stary plan")).not.toBeInTheDocument();
    apiClient.post.mockResolvedValue({ data: { stages: [], warnings: [], remainingDrifs: [] } });
    await user.click(screen.getByText("Zaplanuj ścieżkę"));
    expect(apiClient.post.mock.calls[1][1].balanceStats).toBe(true);
    unmount();
    render(<ProgressionWorkspace {...props} />);
    expect(screen.getByLabelText("Równomierny rozwój statystyk")).toBeChecked();
});

it("commits the item interval on blur, invalidates an older plan and restores it from the draft", async () => {
    const user = userEvent.setup();
    let resolve;
    apiClient.post.mockReturnValue(
        new Promise((done) => {
            resolve = done;
        })
    );
    const props = { data, createSnapshot };
    const { unmount } = render(<ProgressionWorkspace {...props} />);
    const interval = screen.getByLabelText("Pomijaj zmianę ekwipunku co X poziom");
    expect(interval).toHaveValue(0);
    await user.selectOptions(screen.getByLabelText("Docelowy build"), "current");
    await user.click(screen.getByText("Zaplanuj ścieżkę"));
    fireEvent.change(interval, { target: { value: "20" } });
    expect(apiClient.post.mock.calls[0][2].signal.aborted).toBe(false);
    fireEvent.blur(interval);
    expect(apiClient.post.mock.calls[0][2].signal.aborted).toBe(true);
    await act(async () =>
        resolve({ data: { stages: [], warnings: ["Stary odstęp"], remainingDrifs: [] } })
    );
    expect(screen.queryByText("Stary odstęp")).not.toBeInTheDocument();
    apiClient.post.mockResolvedValue({ data: { stages: [], warnings: [], remainingDrifs: [] } });
    await user.click(screen.getByText("Zaplanuj ścieżkę"));
    expect(apiClient.post.mock.calls[1][1].minItemLevelGap).toBe(20);
    unmount();
    render(<ProgressionWorkspace {...props} />);
    expect(screen.getByLabelText("Pomijaj zmianę ekwipunku co X poziom")).toHaveValue(20);
});
