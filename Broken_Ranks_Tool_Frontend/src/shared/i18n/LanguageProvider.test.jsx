import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import LanguageProvider from "./LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import { LANGUAGE_STORAGE_KEY } from "./translation";
import ProgressionResult from "../../features/progression-path/ProgressionResult";
import {
    legendReport,
    reportData,
} from "../../features/progression-path/progressionReport.fixtures";
import CompactCharacterPanel from "../../features/builder/character/CompactCharacterPanel";
import ProgressionWorkspace from "../../features/progression-path/ProgressionWorkspace";
import { createBuildPayload } from "../../features/builds/buildPayload";
import { useTranslation } from "./useTranslation";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it("provides Polish translation defaults outside the optional language provider", () => {
    function Consumer() {
        const { t, language, setLanguage } = useTranslation();
        return (
            <button onClick={() => setLanguage("en")}>
                {language}: {t("Hełm")}
            </button>
        );
    }
    render(<Consumer />);
    fireEvent.click(screen.getByRole("button", { name: "pl: Hełm" }));
    expect(screen.getByRole("button", { name: "pl: Hełm" })).toBeVisible();
});

it("updates translated page metadata and ignores unrelated storage events", async () => {
    const description = document.createElement("meta");
    description.name = "description";
    const locale = document.createElement("meta");
    locale.setAttribute("property", "og:locale");
    document.head.append(description, locale);
    try {
        render(
            <LanguageProvider>
                <LanguageSwitcher />
            </LanguageProvider>
        );
        expect(description.content).toMatch(/Kalkulator ekwipunku/);
        expect(locale.content).toBe("pl_PL");
        act(() =>
            window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "en" }))
        );
        expect(document.documentElement.lang).toBe("pl");
        await userEvent.click(screen.getByRole("button", { name: "English" }));
        expect(description.content).toMatch(/Equipment calculator/);
        expect(locale.content).toBe("en_GB");
    } finally {
        description.remove();
        locale.remove();
    }
});

it("switches an open progression report without resetting completed stages", async () => {
    const user = userEvent.setup();
    const report = legendReport();
    const original = structuredClone(report);
    render(
        <LanguageProvider>
            <LanguageSwitcher />
            <ProgressionResult report={report} data={reportData} />
        </LanguageProvider>
    );
    expect(document.documentElement.lang).toBe("pl");
    await user.click(screen.getByRole("checkbox", { name: "Poziom 60 wykonany" }));
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(screen.getByRole("status")).toHaveTextContent("Completed stages: 1 of 3");
    expect(screen.getByRole("checkbox", { name: "Level 60 completed" })).toBeChecked();
    expect(screen.getByRole("button", { name: /Level 120:/ })).toHaveAttribute(
        "aria-expanded",
        "true"
    );
    await user.click(screen.getByText("Details"));
    expect(screen.getByText("Żmij · epic · 1★")).toBeVisible();
    expect(screen.getByText("Critical hit chance")).toBeVisible();
    expect(screen.getByRole("region", { name: "Stat summary" })).toBeVisible();
    expect(screen.getByText("Stats do not include synergetics.")).toBeVisible();
    expect(
        screen.getByText("Before", { exact: true }).closest(".progression-slot-preview")
    ).toHaveClass("is-before");
    expect(screen.queryByText("Step-by-step instructions")).not.toBeInTheDocument();
    expect(report).toEqual(original);
    await user.click(screen.getByRole("button", { name: "Polski" }));
    expect(screen.getByRole("checkbox", { name: "Poziom 60 wykonany" })).toBeChecked();
});

it("restores the selected language and keeps character stat identifiers unchanged", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    const changePoints = vi.fn();
    const development = {
        level: 140,
        levelInput: "140",
        spentPoints: { Siła: 10 },
        finalStats: { Siła: 20 },
        totalPoints: 556,
        pointsLeft: 546,
        changePoints,
    };
    render(
        <LanguageProvider>
            <CompactCharacterPanel development={development} />
        </LanguageProvider>
    );
    const strength = screen.getByText("Strength").closest(".character-stat-control");
    fireEvent.click(within(strength).getByRole("button", { name: "Add point: Strength" }));
    expect(changePoints).toHaveBeenCalledWith("Siła", 1);
});

it("synchronizes language changes from another tab and handles cleared preferences", () => {
    render(
        <LanguageProvider>
            <LanguageSwitcher />
        </LanguageProvider>
    );
    act(() =>
        window.dispatchEvent(
            new StorageEvent("storage", { key: LANGUAGE_STORAGE_KEY, newValue: "en" })
        )
    );
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    act(() =>
        window.dispatchEvent(
            new StorageEvent("storage", { key: LANGUAGE_STORAGE_KEY, newValue: null })
        )
    );
    expect(document.documentElement.lang).toBe("pl");
});

it("keeps switching available when browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
    });
    render(
        <LanguageProvider>
            <LanguageSwitcher />
        </LanguageProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(document.documentElement.lang).toBe("en");
});

it("translates generated target names while preserving an identically named saved build", async () => {
    const user = userEvent.setup();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    const payload = createBuildPayload({
        requestData: { slots: {}, characterStats: {} },
        characterConfig: null,
        lockedSlots: [],
        lockedDrifs: {},
        backpack: [],
    });
    render(
        <LanguageProvider>
            <LanguageSwitcher />
            <ProgressionWorkspace
                data={{ items: [], drifs: [], orbs: [] }}
                gameRules={{}}
                createSnapshot={() => ({ payload })}
                builds={[{ id: "custom", name: "Aktualny build", payload }]}
            />
        </LanguageProvider>
    );
    const source = screen.getByRole("combobox", { name: "Target build" });
    await user.selectOptions(source, "current");
    expect(source).toHaveDisplayValue("Current build");
    await user.click(screen.getByRole("button", { name: "Polski" }));
    expect(source).toHaveDisplayValue("Aktualny build");
    await user.click(screen.getByRole("button", { name: "English" }));
    await user.selectOptions(source, "build:custom");
    expect(source).toHaveDisplayValue("Aktualny build");
});
