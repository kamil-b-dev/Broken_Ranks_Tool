import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReorganizationReport from "./ReorganizationReport";
import ReorganizationUndo from "./ReorganizationUndo";

const report = (overrides = {}) => ({
    moves: [],
    capacities: [],
    upgrades: [],
    itemNames: { helmet: "Hełm podróżnika" },
    ...overrides,
});

describe("reorganization instructions", () => {
    it("renders no result before a report exists", () => {
        const { container } = render(<ReorganizationReport />);
        expect(container).toBeEmptyDOMElement();
    });
    it("shows temporary storage requirements before ordered moves and the final upgrade", () => {
        render(
            <ReorganizationReport
                report={report({
                    sequence: {
                        extraSlotsNeeded: 1,
                        operations: [
                            {
                                kind: "REMOVE",
                                temporary: true,
                                name: "Band",
                                size: "SUBDRIF",
                                level: 2,
                                from: "helmet:0",
                            },
                            {
                                kind: "MOVE",
                                name: "Regen",
                                size: "BIDRIF",
                                level: 6,
                                from: "armor:1",
                                to: "helmet:0",
                            },
                            {
                                kind: "INSERT",
                                name: "Band",
                                size: "SUBDRIF",
                                level: 2,
                                to: "armor:1",
                            },
                            {
                                kind: "UPGRADE",
                                name: "Band",
                                level: 2,
                                targetName: "Band",
                                targetLevel: 11,
                                to: "armor:1",
                            },
                            {
                                kind: "REMOVE",
                                temporary: false,
                                name: "Nieużyty",
                                size: "SUBDRIF",
                                level: 1,
                                from: "boots:0",
                            },
                        ],
                    },
                    reservationSummary: { label: "Hełm", freeSockets: 2, freeCapacity: 8 },
                    capacities: [{ slot: "Hełm", before: 4, after: 1, capacity: 12 }],
                })}
                statChanges={[{ statKey: "CRITICAL_CHANCE", finalValue: "8%", variantValue: "9%" }]}
                translations={{ CRITICAL_CHANCE: "Szansa na krytyk" }}
            />
        );
        const section = screen.getByRole("region", { name: "Wynik reorganizacji" });
        const instruction = within(section).getAllByRole("list")[0];
        const steps = within(instruction).getAllByRole("listitem");
        expect(steps).toHaveLength(5);
        expect(steps[0]).toHaveTextContent(
            /Wyjmij tymczasowo Band.*2 lvl.*Hełm · Hełm podróżnika, gniazdo 1/
        );
        expect(steps[1]).toHaveTextContent(/Regen.*BIDRIF.*6 lvl.*Zbroja, gniazdo 2 → Hełm/);
        expect(steps[2]).toHaveTextContent(/Band.*Plecak → Zbroja, gniazdo 2/);
        expect(steps[3]).toHaveTextContent(
            "Po przełożeniu ulepsz: Band 2 lvl → Band 11 lvl · Zbroja, gniazdo 2"
        );
        expect(steps[4]).toHaveTextContent(/Odłóż Nieużyty/);
        const warning = screen.getByRole("status");
        expect(warning).toHaveTextContent(/zwolnij dodatkowo 1 miejsc/);
        expect(
            warning.compareDocumentPosition(instruction) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
        expect(screen.getByText("Hełm: wolne gniazda 2, wolna pojemność 8.")).toBeVisible();
        expect(screen.getByText("Hełm: 4/12 → 1/12")).toBeVisible();
        expect(screen.getByText("Szansa na krytyk: 8% → 9%")).toBeVisible();
    });
    it("labels an in-place upgrade without inventing preceding moves", () => {
        render(
            <ReorganizationReport
                report={report({
                    sequence: {
                        operations: [
                            {
                                kind: "UPGRADE",
                                name: "Band",
                                level: 2,
                                targetName: "Band",
                                targetLevel: 6,
                                to: "helmet:0",
                            },
                        ],
                    },
                })}
            />
        );
        expect(screen.getByText("Ulepsz:")).toBeVisible();
        expect(screen.queryByText("Po przełożeniu ulepsz:")).not.toBeInTheDocument();
    });
    it("does not claim an executable sequence when only the destination layout is known", () => {
        render(
            <ReorganizationReport
                report={report({
                    sequence: { unavailable: true, operations: [] },
                    moves: [{ name: "Band", from: "Plecak", to: "Hełm" }],
                    upgrades: [
                        {
                            name: "Band",
                            before: 6,
                            targetName: "Band",
                            after: 11,
                            destination: "Hełm",
                            maximizeLevel: true,
                        },
                    ],
                })}
            />
        );
        expect(screen.getByText(/Nie udało się potwierdzić kolejności wykonania/)).toBeVisible();
        expect(screen.getByRole("heading", { name: "Rozmieszczenie kamieni" })).toBeVisible();
        expect(
            screen.queryByRole("heading", { name: "Instrukcja wykonania" })
        ).not.toBeInTheDocument();
        expect(screen.getByText("Band: Plecak → Hełm")).toBeVisible();
        expect(screen.getByText("Znaleziony poziom:")).toBeVisible();
    });
    it("supports unchanged locations and the legacy single-upgrade report", () => {
        render(
            <ReorganizationReport
                report={report({
                    upgrades: undefined,
                    upgrade: {
                        name: "Band",
                        before: 2,
                        targetName: "Band",
                        after: 6,
                        destination: "Hełm",
                    },
                })}
            />
        );
        expect(screen.getByText("Kamienie pozostają w dotychczasowych gniazdach.")).toBeVisible();
        expect(screen.getByText("Po przełożeniu ulepsz:")).toBeVisible();
    });
});

describe("guarded reorganization undo control", () => {
    it("is hidden without a saved change and calls undo once when available", () => {
        const onUndo = vi.fn();
        const { rerender, container } = render(
            <ReorganizationUndo available={false} onUndo={onUndo} />
        );
        expect(container).toBeEmptyDOMElement();
        rerender(<ReorganizationUndo available onUndo={onUndo} />);
        fireEvent.click(screen.getByRole("button", { name: "Cofnij reorganizację" }));
        expect(onUndo).toHaveBeenCalledOnce();
    });
    it.each([{ disabled: true }, { warning: "Cofnięcie nadpisałoby późniejsze zmiany." }])(
        "prevents undo when %j",
        (props) => {
            const onUndo = vi.fn();
            render(<ReorganizationUndo available onUndo={onUndo} {...props} />);
            const button = screen.getByRole("button", { name: "Cofnij reorganizację" });
            expect(button).toBeDisabled();
            fireEvent.click(button);
            expect(onUndo).not.toHaveBeenCalled();
            if (props.warning) expect(screen.getByRole("status")).toHaveTextContent(props.warning);
        }
    );
});
