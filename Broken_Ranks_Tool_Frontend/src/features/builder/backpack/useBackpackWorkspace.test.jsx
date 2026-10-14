import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import { useBackpackWorkspace } from "./useBackpackWorkspace";

const entry = { id: "owned", kind: "DRIF", templateId: "60", level: 6 };
const mount = (entries = [entry]) => {
    const onChange = vi.fn();
    const hook = renderHook(() =>
        useBackpackWorkspace({
            entries,
            onChange,
            data: builderCatalog,
            gameRules: builderCatalog.gameRules,
        })
    );
    return { ...hook, onChange };
};
describe("backpack edits before the next parent render", () => {
    it("enforces 200 slots across two immediate additions", () => {
        const { result, onChange } = mount(
            Array.from({ length: 199 }, (_, index) => ({ ...entry, id: `owned-${index}` }))
        );
        act(() => {
            result.current.add("DRIF", builderCatalog.drifs[0]);
            result.current.add("DRIF", builderCatalog.drifs[0]);
        });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toHaveLength(200);
        expect(result.current.notice).toContain("200");
    });
    it("preserves two immediate edits of separate fields", () => {
        const { result, onChange } = mount();
        act(() => {
            result.current.update("owned", { sendToBackend: true });
            result.current.update("owned", { level: 3 });
        });
        expect(onChange.mock.lastCall[0]).toEqual([{ ...entry, level: 3, sendToBackend: true }]);
    });
    it("cannot duplicate an occurrence consumed by an earlier operation", () => {
        const { result, onChange } = mount();
        act(() => {
            result.current.remove("owned");
            result.current.duplicate(entry);
        });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.lastCall[0]).toEqual([]);
        expect(result.current.notice).toContain("już");
    });
    it.each([{ id: "changed" }, { kind: "ORB" }, { level: 0 }, { sendToBackend: "true" }])(
        "rejects invalid edits without publishing or throwing through the UI: %j",
        (change) => {
            const { result, onChange } = mount();
            act(() => expect(result.current.update("owned", change)).toBe(false));
            expect(onChange).not.toHaveBeenCalled();
            expect(result.current.notice).toBeTruthy();
        }
    );
    it("reads duplication data from current state and ignores stale supplied configuration", () => {
        const { result, onChange } = mount();
        act(() => {
            result.current.update("owned", { level: 3 });
            result.current.duplicate({ ...entry, level: 21 });
        });
        expect(onChange.mock.lastCall[0].map((stone) => stone.level)).toEqual([3, 3]);
        expect(new Set(onChange.mock.lastCall[0].map((stone) => stone.id)).size).toBe(2);
    });
});
