import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { createLocalBuildRecord } from "../buildLibraryStorage";
import { createBuildPayload } from "../buildPayload";
import { builderCatalog as data } from "../../../test/fixtures/equipment/builderCatalog";
import { createLibraryBackup } from "./libraryBackup";
import LibraryBackupPanel from "./LibraryBackupPanel";

const record = () =>
    createLocalBuildRecord({
        id: "one",
        name: "Mage",
        snapshot: {
            payload: createBuildPayload({
                requestData: { slots: {}, characterStats: {} },
                characterConfig: null,
                lockedSlots: [],
                lockedDrifs: {},
                backpack: [],
            }),
        },
    });
const upload = (records) => ({
    name: "backup.json",
    size: 100,
    text: async () => JSON.stringify(createLibraryBackup(records)),
});

it("previews conflicts without applying and only imports explicitly chosen replacements", async () => {
    const user = userEvent.setup();
    const library = {
        builds: [record()],
        importLibrary: vi.fn().mockResolvedValue(true),
        exportLibrary: vi.fn(),
    };
    render(<LibraryBackupPanel library={library} data={data} />);
    fireEvent.change(screen.getByLabelText("Plik kopii biblioteki"), {
        target: { files: [upload([record()])] },
    });
    const choice = await screen.findByLabelText("Import buildu: Mage");
    expect(choice).toHaveValue("copy");
    expect(library.importLibrary).not.toHaveBeenCalled();
    await user.selectOptions(choice, "replace:one");
    await user.click(screen.getByRole("button", { name: "Importuj wybrane buildy" }));
    expect(library.importLibrary).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "one" })]),
        { one: "replace:one" },
        JSON.stringify(library.builds)
    );
    expect(
        screen.queryByRole("heading", { name: "Podgląd importu biblioteki" })
    ).not.toBeInTheDocument();
});

it("keeps the library unchanged when a file is invalid, canceled or replaced by a newer read", async () => {
    const user = userEvent.setup();
    const library = { builds: [], importLibrary: vi.fn(), exportLibrary: vi.fn() };
    render(<LibraryBackupPanel library={library} data={data} />);
    const input = screen.getByLabelText("Plik kopii biblioteki");
    fireEvent.change(input, { target: { files: [{ size: 1, text: async () => "{broken" }] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("JSON");
    fireEvent.change(input, { target: { files: [upload([record()])] } });
    await screen.findByLabelText("Import buildu: Mage");
    await user.click(screen.getByRole("button", { name: "Anuluj import" }));
    expect(library.importLibrary).not.toHaveBeenCalled();
});

it("blocks the import action when keeping copies would exceed capacity", async () => {
    const library = {
        builds: Array.from({ length: 10 }, (_, i) => ({
            ...record(),
            id: String(i),
            name: String(i),
        })),
        importLibrary: vi.fn(),
    };
    render(<LibraryBackupPanel library={library} data={data} />);
    fireEvent.change(screen.getByLabelText("Plik kopii biblioteki"), {
        target: { files: [upload([record()])] },
    });
    await waitFor(() =>
        expect(screen.getByRole("button", { name: "Importuj wybrane buildy" })).toBeDisabled()
    );
    expect(screen.getByRole("alert")).toHaveTextContent("limit 10");
});
