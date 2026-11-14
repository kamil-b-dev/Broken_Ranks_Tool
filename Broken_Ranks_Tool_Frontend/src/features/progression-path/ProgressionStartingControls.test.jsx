import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ProgressionStartingControls from "./ProgressionStartingControls";
import { newProject } from "./progressionProject";
import { createBuildPayload } from "../builds/buildPayload";
import { parseBuildFile } from "../builds/buildFile";
import { builderCatalog as data } from "../../test/fixtures/equipment/builderCatalog";

vi.mock("../builds/buildFile", async (original) => ({
    ...(await original()),
    parseBuildFile: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());
const payload = createBuildPayload({
    requestData: { slots: {}, characterStats: {} },
    characterConfig: { level: 80, spentPoints: {} },
    lockedSlots: [],
    lockedDrifs: {},
    backpack: [],
});
function Harness() {
    const [project, update] = useState({ ...newProject(), target: { characterLevel: 140 } });
    return (
        <>
            <ProgressionStartingControls
                project={project}
                update={update}
                builds={[{ id: "saved", name: "Zapisany", payload }]}
                data={data}
                createSnapshot={() => ({ payload })}
            />
            <output data-testid="project">{JSON.stringify(project)}</output>
        </>
    );
}
const project = () => JSON.parse(screen.getByTestId("project").textContent);

it("selects a current or saved starting build and returns to planning from level one", () => {
    render(<Harness />);
    const source = screen.getByLabelText("Początek ścieżki");
    fireEvent.change(source, { target: { value: "current" } });
    expect(project().startingPoint).toMatchObject({ characterLevel: 80, name: "Aktualny build" });
    fireEvent.change(source, { target: { value: "saved" } });
    expect(project().startingPoint.name).toBe("Zapisany");
    fireEvent.change(source, { target: { value: "none" } });
    expect(project().startingPoint).toBeNull();
    fireEvent.change(source, { target: { value: "missing" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Nie znaleziono buildu początkowego");
});

it("adds and removes required milestones and rejects a second item in the same slot and level", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByText("Obowiązkowe przedmioty pośrednie"));
    fireEvent.change(screen.getByLabelText("Przedmiot etapu"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Poziom etapu"), { target: { value: "100" } });
    fireEvent.submit(container.querySelector("form"));
    expect(project().requiredItems).toEqual([{ slot: "helmet", characterLevel: 100, itemId: 1 }]);
    fireEvent.submit(container.querySelector("form"));
    expect(screen.getByRole("alert")).toHaveTextContent("W jednym slocie");
    expect(project().requiredItems).toHaveLength(1);
    fireEvent.click(screen.getByText("Usuń etap obowiązkowy"));
    expect(project().requiredItems).toEqual([]);
    fireEvent.change(screen.getByLabelText("Slot etapu"), { target: { value: "boots" } });
    expect(screen.getByLabelText("Przedmiot etapu")).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Hełm podróżnika" })).not.toBeInTheDocument();
});

it("imports a starting build and ignores an older file read after the user changes the source", async () => {
    const { container } = render(<Harness />);
    const input = container.querySelector('input[type="file"]');
    let resolve;
    parseBuildFile.mockImplementationOnce(
        () =>
            new Promise((done) => {
                resolve = done;
            })
    );
    fireEvent.change(screen.getByLabelText("Początek ścieżki"), { target: { value: "file" } });
    fireEvent.change(input, { target: { files: [{ name: "old.json" }] } });
    fireEvent.change(screen.getByLabelText("Początek ścieżki"), { target: { value: "none" } });
    await act(async () => resolve(payload.build));
    expect(project().startingPoint).toBeNull();
    parseBuildFile.mockResolvedValueOnce(payload.build);
    await act(async () => fireEvent.change(input, { target: { files: [{ name: "start.json" }] } }));
    expect(project().startingPoint).toMatchObject({ name: "start.json", characterLevel: 80 });
    parseBuildFile.mockRejectedValueOnce(new Error("Niepoprawny plik"));
    await act(async () =>
        fireEvent.change(input, { target: { files: [{ name: "broken.json" }] } })
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Niepoprawny plik");
    expect(project().startingPoint.name).toBe("start.json");
});
