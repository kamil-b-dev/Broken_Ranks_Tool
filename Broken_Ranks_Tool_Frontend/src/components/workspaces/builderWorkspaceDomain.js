import { SLOTS } from "../../constants/equipment";

/** Groups item templates by every equipment slot that accepts their category. */
export const groupItemsBySlot = (items = []) => Object.fromEntries(SLOTS.map((slot) => [
    slot.key,
    items.filter((item) => Array.isArray(slot.cat)
        ? slot.cat.includes(item.category?.toUpperCase())
        : item.category?.toUpperCase() === slot.cat),
]));

export const indexItemsById = (items = []) => new Map(items.map((item) => [String(item.id), item]));

export const countEquippedSlots = (slots = {}) => SLOTS.filter((slot) => slots[slot.key]?.itemId).length;
