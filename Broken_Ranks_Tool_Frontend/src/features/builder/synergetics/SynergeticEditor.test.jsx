import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import SynergeticEditor from "./SynergeticEditor";

it("saves explicitly entered integer stats and clears the slot when removed", () => {
    const onUpdate = vi.fn();
    const { rerender } = render(<SynergeticEditor slotKey="ring1" onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText("Własny synergetyk"));
    fireEvent.change(screen.getByLabelText("Nazwa synergetyka"), { target: { value: "  Res  " } });
    fireEvent.change(screen.getByLabelText("PŻ"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Mana"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Mana"), { target: { value: "" } });
    fireEvent.submit(screen.getByText("Zastosuj synergetyk").closest("form"));
    const next = onUpdate.mock.calls[0][1];
    expect(next.synergetic).toEqual({ name: "Res", stats: { PŻ: 123 } });
    expect(next).toMatchObject({ itemId: null, itemStars: 1, drifIds: [], orbIds: [] });
    rerender(<SynergeticEditor slotKey="ring1" slot={next} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByText("Usuń synergetyk"));
    expect(onUpdate.mock.calls.at(-1)[1]).not.toHaveProperty("synergetic");
});

it("rejects invalid values without replacing equipment and recovers after correction", () => {
    const onUpdate = vi.fn();
    const { rerender } = render(
        <SynergeticEditor
            slotKey="necklace"
            slot={{ synergetic: { name: "Res", stats: { PŻ: 20 } } }}
            onUpdate={onUpdate}
        />
    );
    fireEvent.change(screen.getByLabelText("PŻ"), { target: { value: "-1" } });
    fireEvent.submit(screen.getByText("Zastosuj synergetyk").closest("form"));
    expect(screen.getByRole("alert")).toHaveTextContent("Niepoprawny synergetyk");
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("PŻ"), { target: { value: "0" } });
    fireEvent.submit(screen.getByText("Zastosuj synergetyk").closest("form"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledOnce();
    rerender(<SynergeticEditor slotKey="helmet" onUpdate={onUpdate} />);
    expect(screen.queryByText("Własny synergetyk")).not.toBeInTheDocument();
});
