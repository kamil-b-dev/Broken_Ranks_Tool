import {
    ROMAN_ORDER,
    SIZE_ORDER,
    calculateItemCapacity,
} from "../../../shared/domain/equipment/equipmentRules";
import {
    DRIF_CATEGORY_ORDER,
    resolveDrifCategoryKey,
} from "../../../shared/domain/equipment/drifCategories";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { backpackTemplate } from "./backpackDomain";

export const BACKPACK_FILTERS = [
    ["ALL", "Wszystko"],
    ["ITEM", "Przedmioty"],
    ["DRIF", "Drify"],
    ["ORB", "Orby"],
];

export const backpackEntryLabel = (entry, data) => {
    const template = backpackTemplate(entry, data);
    const name = template?.name || "Nieznany obiekt";
    return entry.kind === "ITEM"
        ? `${name} · ${entry.equipment.itemStars} ★ · orby: ${entry.equipment.orbIds.filter(Boolean).length} · drify: ${entry.equipment.drifIds.filter(Boolean).length}`
        : `${name} · ${template?.size || "kamień"} · poz. ${entry.level}`;
};

const itemCategories = [...new Set(SLOTS.flatMap((slot) => slot.cat))];
const rarities = ["RARE", "EPIC", "LEGENDARY", "SET"];
const profiles = ["PHYSICAL", "MAGICAL", "UNIVERSAL", "UNSPECIFIED"];
const kinds = ["ITEM", "DRIF", "ORB"];
const orderOf = (values, value) => {
    const index = values.indexOf(value);
    return index < 0 ? null : index;
};
const collator = new Intl.Collator("pl", { numeric: true, sensitivity: "base" });

export const backpackSortOptions = (filter, data) => {
    const options = [
        ["manual", "Własna kolejność"],
        ["name", "Nazwa"],
        ["kind", "Rodzaj obiektu"],
        ["category", "Kategoria"],
    ];
    if (filter === "ALL" || filter === "ITEM") {
        options.push(
            ["tier", "Tier"],
            ["rarity", "Rzadkość"],
            ["reqLevel", "Wymagany poziom"],
            ["stars", "Gwiazdki"],
            ["capacity", "Pojemność"],
            ["boss", "Źródło / boss"],
            ["profile", "Profil przedmiotu"]
        );
        const stats = [
            ...new Set((data.items || []).flatMap((item) => Object.keys(item.stats || {}))),
        ].sort(collator.compare);
        options.push(...stats.map((stat) => [`stat:${stat}`, `Statystyka bazowa: ${stat}`]));
    }
    if (filter !== "ITEM") {
        options.push(
            ["size", "Rozmiar kamienia"],
            ["level", "Poziom kamienia"],
            ["bonusType", "Typ bonusu"],
            ["price", "Cena kamienia"]
        );
        if (filter !== "ORB") options.push(["power", "Bazowa potęga drifa"]);
    }
    return options;
};

const sortValue = (entry, template, key, gameRules) => {
    if (key === "kind") return orderOf(kinds, entry.kind);
    if (!template) return null;
    if (key === "name")
        return (
            template.name ||
            gameRules.bonusTranslations?.[template.bonusType] ||
            template.bonusType ||
            null
        );
    if (key === "category") {
        const category =
            template.category ||
            resolveDrifCategoryKey(template.bonusType, gameRules.drifBonusCategories);
        const order = orderOf(
            entry.kind === "ITEM" ? itemCategories : DRIF_CATEGORY_ORDER,
            category
        );
        return order === null ? null : (entry.kind === "ITEM" ? 0 : itemCategories.length) + order;
    }
    if (key === "tier") return ROMAN_ORDER[template.tier] ?? null;
    if (key === "rarity") return orderOf(rarities, template.rarity);
    if (key === "profile") return orderOf(profiles, template.profile);
    if (key === "stars") return entry.kind === "ITEM" ? entry.equipment.itemStars : null;
    if (key === "capacity")
        return entry.kind === "ITEM"
            ? calculateItemCapacity(template, entry.equipment.itemStars)
            : null;
    if (key === "size") return SIZE_ORDER[template.size?.replace(/ORB$/, "DRIF")] ?? null;
    if (key === "level") return entry.kind === "ITEM" ? null : entry.level;
    if (key === "bonusType")
        return gameRules.bonusTranslations?.[template.bonusType] || template.bonusType || null;
    if (key === "power")
        return entry.kind === "DRIF"
            ? (gameRules.drifBasePowers?.[template.bonusType] ?? null)
            : null;
    if (key.startsWith("stat:")) return template.stats?.[key.slice(5)] ?? null;
    return template[key] ?? null;
};

/** A sorted view never changes the persisted occurrence order. Missing attributes stay last. */
export const visibleBackpackEntries = (entries, data, gameRules, filter, sort, direction) => {
    const visible = entries.filter((entry) => filter === "ALL" || entry.kind === filter);
    if (sort === "manual") return visible;
    const values = new Map(
        visible.map((entry) => [
            entry.id,
            sortValue(entry, backpackTemplate(entry, data), sort, gameRules),
        ])
    );
    return visible.sort((left, right) => {
        const a = values.get(left.id);
        const b = values.get(right.id);
        if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
        const comparison =
            typeof a === "number" && typeof b === "number"
                ? a - b
                : collator.compare(String(a), String(b));
        return direction === "desc" ? -comparison : comparison;
    });
};
