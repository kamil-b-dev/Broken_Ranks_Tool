import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ProgressionNumberInput from "./ProgressionNumberInput";

it("commits a complete level once and restores empty or out of range drafts", async () => {
    const user = userEvent.setup();
    const commit = vi.fn();
    render(
        <label>
            Poziom
            <ProgressionNumberInput value={140} min={1} max={140} onCommit={commit} />
        </label>
    );
    const input = screen.getByLabelText("Poziom");
    await user.clear(input);
    await user.type(input, "130");
    expect(commit).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(commit).toHaveBeenCalledExactlyOnceWith(130);
    commit.mockClear();
    await user.click(input);
    await user.clear(input);
    await user.tab();
    expect(input).toHaveValue(140);
    expect(commit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "141" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(140);
    expect(commit).not.toHaveBeenCalled();
});
