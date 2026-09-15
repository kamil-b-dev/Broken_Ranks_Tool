import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuildLibraryWorkspace from "./BuildLibraryWorkspace";

vi.mock("./BuildComparison", () => ({
    default: ({ builds }) => (
        <div data-testid="comparison">{builds.map((build) => build.name).join(",")}</div>
    ),
}));

const build = (id, name, savedAt = "2026-09-12T10:00:00.000Z") => ({
    id,
    name,
    savedAt,
    updatedAt: savedAt,
    payload: {
        build: {
            requestData: {
                slots: { helmet: { itemId: 1, drifIds: [2], orbIds: [3] } },
                characterStats: {},
            },
            characterConfig: { level: 140 },
        },
    },
    stats: { DAMAGE: 100 },
});

const defaultProps = () => ({
    builds: [],
    data: { items: [], drifs: [] },
    gameRules: {},
    onRename: vi.fn(() => true),
    onOverwrite: vi.fn(),
    onLoad: vi.fn(() => true),
    onExport: vi.fn(),
    onRemove: vi.fn(),
    onOpenBuilder: vi.fn(),
});

describe("BuildLibraryWorkspace", () => {
    let props;

    beforeEach(() => {
        props = defaultProps();
    });

    it("renders an inactive empty workspace without an active content target", () => {
        const { container } = render(<BuildLibraryWorkspace {...props} active={false} />);

        expect(screen.getByText("Brak lokalnych buildów")).toBeInTheDocument();
        expect(container.firstChild).toHaveAttribute("hidden");
        expect(container.firstChild).not.toHaveAttribute("id");
        expect(screen.getByRole("button", { name: "Zmień nazwę", hidden: true })).toBeDisabled();
    });

    it("renames, loads, exports and confirms destructive actions", async () => {
        const user = userEvent.setup();
        props.builds = [build("a", "PvE")];
        render(<BuildLibraryWorkspace {...props} />);

        const name = screen.getByLabelText("Zmień nazwę lokalnego buildu");
        await user.clear(name);
        await user.type(name, "PvP");
        await user.click(screen.getByRole("button", { name: "Zmień nazwę" }));
        expect(props.onRename).toHaveBeenCalledWith("a", "PvP");

        await user.click(screen.getByRole("button", { name: "Wczytaj" }));
        expect(props.onLoad).toHaveBeenCalledWith("a");
        expect(props.onOpenBuilder).toHaveBeenCalledOnce();

        await user.click(screen.getByRole("button", { name: "Eksportuj JSON" }));
        expect(props.onExport).toHaveBeenCalledWith("a");

        await user.click(screen.getByRole("button", { name: "Nadpisz" }));
        expect(props.onOverwrite).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "Potwierdź nadpisanie" }));
        expect(props.onOverwrite).toHaveBeenCalledWith("a");

        await user.click(screen.getByRole("button", { name: "Usuń" }));
        expect(props.onRemove).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "Potwierdź usunięcie" }));
        expect(props.onRemove).toHaveBeenCalledWith("a");
    });

    it("limits comparison to three builds and can clear the selection", async () => {
        const user = userEvent.setup();
        props.builds = [
            build("a", "A"),
            build("b", "B"),
            build("c", "C"),
            build("d", "D", "invalid"),
        ];
        render(<BuildLibraryWorkspace {...props} />);

        const checks = screen.getAllByRole("checkbox", { name: "Porównaj" });
        await user.click(checks[0]);
        await user.click(checks[1]);
        await user.click(checks[2]);

        expect(checks[3]).toBeDisabled();
        expect(screen.getByTestId("comparison")).toHaveTextContent("A,B,C");
        expect(screen.getByText("Nieznana data")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Wyczyść wybór" }));
        expect(checks[3]).toBeEnabled();
        expect(screen.queryByRole("button", { name: "Wyczyść wybór" })).not.toBeInTheDocument();
        expect(screen.getByTestId("comparison")).toBeEmptyDOMElement();
    });
});
