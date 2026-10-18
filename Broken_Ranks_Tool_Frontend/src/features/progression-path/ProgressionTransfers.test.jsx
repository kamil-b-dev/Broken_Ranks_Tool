import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import ProgressionTransfers from "./ProgressionTransfers";
import { groupStoneTransfers } from "./progressionStoneActions";

const data = {
    items: [
        { id: 10, name: "Vorleah" },
        { id: 11, name: "Zalla" },
        { id: 12, name: "Temary" },
        { id: 13, name: "Basileus" },
    ],
    drifs: [
        { id: 1, name: "Ling", size: "ARCYDRIF" },
        { id: 2, name: "Dur", size: "ARCYDRIF" },
    ],
    orbs: [{ id: 3, name: "Cu'at", size: "ARCYORB" }],
};
const position = (slot, socketIndex = 0) => ({ slot, socketIndex });
const move = (id, from, to, templateId = 1, kind = "drif") => ({
    instanceId: id,
    from,
    to,
    templateId,
    kind,
    level: kind === "orb" ? 3 : 21,
});
const group = {
    before: {
        slots: {
            armor: { itemId: 10 },
            legs: { itemId: 12 },
            ring1: { itemId: 13 },
            ring2: { itemId: 13 },
        },
    },
    final: {
        stage: {
            equipment: {
                slots: {
                    armor: { itemId: 11 },
                    legs: { itemId: 12 },
                    ring1: { itemId: 13 },
                    ring2: { itemId: 13 },
                },
            },
        },
    },
    moves: [
        move("ling", position("legs"), position("armor", 2)),
        move("dur", position("armor"), position("legs", 1), 2),
        move("orb", position("armor"), position("armor"), 3, "orb"),
        move("ring", position("ring1"), position("ring2")),
        move("stored", position("legs", 2), null, 2),
        move("from-pool", null, position("legs")),
    ],
};

it("groups every transfer by destination and socket without mutating the plan", () => {
    const original = structuredClone(group);
    const destinations = groupStoneTransfers(group.moves);
    expect(destinations.map((entry) => entry.slot)).toEqual(["armor", "legs", "ring2", null]);
    expect(destinations.flatMap((entry) => entry.moves)).toHaveLength(group.moves.length);
    expect(
        destinations.find((entry) => entry.slot === "legs").moves.map((entry) => entry.instanceId)
    ).toEqual(["from-pool", "dur"]);
    expect(group).toEqual(original);
});

it("shows the destination once per card, with stone sockets and separate source items", () => {
    render(<ProgressionTransfers group={group} data={data} />);
    const armor = screen.getByRole("heading", { name: "Zalla" }).closest("section");
    expect(within(armor).getAllByRole("listitem")).toHaveLength(2);
    expect(within(armor).getByText("Drif · gniazdo 3")).toBeVisible();
    expect(within(armor).getByText("Ling (arcydrif, poz. 21)")).toBeVisible();
    expect(within(armor).getByText("Temary")).toBeVisible();
    expect(within(armor).getByText("Spodnie · gniazdo 1")).toBeVisible();
    expect(within(armor).getByText("Orb · gniazdo 1")).toBeVisible();
    expect(within(armor).getByText("Vorleah")).toBeVisible();
    expect(within(armor).queryByText("Zamień")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(group.moves.length);
});

it("distinguishes identical rings, free stones and stones put aside", () => {
    render(<ProgressionTransfers group={group} data={data} />);
    const ring = screen.getByRole("heading", { name: "Basileus" }).closest("section");
    expect(within(ring).getByText("Pierścień 2", { exact: true })).toBeVisible();
    expect(within(ring).getByText("Pierścień 1 · gniazdo 1")).toBeVisible();
    const storage = screen
        .getByRole("heading", { name: "Pula wolnych kamieni" })
        .closest("section");
    expect(within(storage).getByText("Odłóż")).toBeVisible();
    expect(within(storage).getByText("Spodnie · gniazdo 3")).toBeVisible();
    const legs = screen.getByRole("heading", { name: "Temary" }).closest("section");
    expect(within(legs).getByText("Pula wolnych kamieni")).toBeVisible();
});
