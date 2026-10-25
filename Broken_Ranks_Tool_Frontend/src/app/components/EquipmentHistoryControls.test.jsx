import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EquipmentHistoryContext } from "../../shared/state/EquipmentContext";
import EquipmentHistoryControls from "./EquipmentHistoryControls";

describe("build history controls", () => {
    it("handles keyboard shortcuts and leaves field undo to the browser", () => {
        const history = { canUndo: true, canRedo: true, undo: vi.fn(), redo: vi.fn() };
        const { unmount } = render(
            <EquipmentHistoryContext.Provider value={history}>
                <EquipmentHistoryControls />
                <input aria-label="Level" />
                <div contentEditable suppressContentEditableWarning role="textbox">
                    Draft
                </div>
            </EquipmentHistoryContext.Provider>
        );
        fireEvent.click(screen.getByRole("button", { name: "Cofnij" }));
        fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
        fireEvent.keyDown(document.body, { key: "Z", metaKey: true, shiftKey: true });
        fireEvent.keyDown(document.body, { key: "y", ctrlKey: true });
        expect(history.undo).toHaveBeenCalledTimes(2);
        expect(history.redo).toHaveBeenCalledTimes(2);
        fireEvent.keyDown(screen.getByLabelText("Level"), { key: "z", ctrlKey: true });
        fireEvent.keyDown(screen.getByRole("textbox", { name: "" }), { key: "z", ctrlKey: true });
        expect(history.undo).toHaveBeenCalledTimes(2);
        unmount();
        fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
        expect(history.undo).toHaveBeenCalledTimes(2);
    });

    it("disables unavailable history without intercepting keyboard events", () => {
        const history = { canUndo: false, canRedo: false, undo: vi.fn(), redo: vi.fn() };
        render(
            <EquipmentHistoryContext.Provider value={history}>
                <EquipmentHistoryControls />
            </EquipmentHistoryContext.Provider>
        );
        expect(screen.getByRole("button", { name: "Cofnij" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Ponów" })).toBeDisabled();
        fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
        expect(history.undo).not.toHaveBeenCalled();
    });
});
