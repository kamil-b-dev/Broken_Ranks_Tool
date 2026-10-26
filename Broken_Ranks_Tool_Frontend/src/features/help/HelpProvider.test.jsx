import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useState } from "react";
import HelpProvider from "./HelpProvider";
import HelpButton from "./HelpButton";
import HelpHint from "./HelpHint";
import { HELP_GROUPS, HELP_HINTS, HELP_TOPICS } from "./helpContent";
import { LanguageContext } from "../../shared/i18n/LanguageContext";
import { translate } from "../../shared/i18n/translation";
import { useAppRoute } from "../../app/useAppRoute";
import { useMobileBuilderRoute } from "../builder/mobile/useMobileBuilderRoute";
import { useMobileOptimizerNavigation } from "../optimizer/mobile/useMobileOptimizerNavigation";

vi.mock("../equipment/useEquipmentCatalog", () => ({ requestEquipmentCatalog: vi.fn() }));

beforeEach(() => {
    window.history.replaceState(null, "", "/builder?slot=helmet");
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
        this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function () {
        this.removeAttribute("open");
    });
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete HTMLDialogElement.prototype.showModal;
    delete HTMLDialogElement.prototype.close;
});

function WorkingView() {
    const [draft, setDraft] = useState("");
    const { activeView } = useAppRoute();
    const route = useMobileBuilderRoute();
    const optimizer = useMobileOptimizerNavigation(false);
    return (
        <>
            <input
                aria-label="Szkic"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
            />
            <output>{`${activeView}:${route.slot?.key}:${optimizer.section}`}</output>
            <HelpButton topic="advisor" />
            <HelpButton page />
        </>
    );
}
const renderHelp = () =>
    render(
        <HelpProvider>
            <WorkingView />
        </HelpProvider>
    );

it("opens contextual instructions, follows related topics and restores focus and draft on Escape", async () => {
    const user = userEvent.setup();
    renderHelp();
    await user.type(screen.getByRole("textbox"), "niezapisana zmiana");
    const opener = screen.getByRole("link", { name: "Jak korzystać?" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Jak korzystać z Doradcy?" });
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(4);
    await user.click(
        within(dialog).getByRole("link", { name: "Który tryb optymalizatora wybrać?" })
    );
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(screen.getByRole("textbox")).toHaveValue("niezapisana zmiana");
    expect(window.location.pathname + window.location.search).toBe("/builder?slot=helmet");
    expect(document.body.style.overflow).toBe("");
});

it("preserves the working view and nested mobile route through help history and browser forward", async () => {
    const user = userEvent.setup();
    renderHelp();
    await user.type(screen.getByRole("textbox"), "szkic");
    const opener = screen.getByRole("link", { name: "Instrukcja", exact: true });
    await user.click(opener);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByText("Plecak i historia zmian", { exact: true }));
    await user.click(
        within(screen.getByRole("navigation", { name: "Tematy pomocy" })).getByRole("link", {
            name: "Plecak",
            exact: true,
        })
    );
    expect(window.location.search).toBe("?topic=backpack");
    await user.click(screen.getByRole("button", { name: "Wróć do aplikacji" }));
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("szkic"));
    expect(screen.getByText("builder:helmet:goals")).toBeVisible();
    expect(opener).toHaveFocus();
    act(() => window.history.forward());
    await screen.findByRole("heading", { name: "Instrukcja", exact: true });
    act(() => window.history.back());
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("szkic"));
    expect(screen.getByText("builder:helmet:goals")).toBeVisible();
});

it("opens a topic directly and returns a standalone visit to the home page", async () => {
    window.history.replaceState(null, "", "/help?topic=progression");
    renderHelp();
    expect(screen.getByRole("heading", { name: "Jak zaplanować rozwój ekwipunku?" })).toBeVisible();
    expect(window.location.pathname).toBe("/help");
    await userEvent.click(screen.getByRole("button", { name: "Wróć do aplikacji" }));
    expect(window.location.pathname).toBe("/");
    expect(screen.getByRole("textbox")).toBeVisible();
});

it("keeps every topic reachable in the same desktop and mobile groups", async () => {
    window.history.replaceState(null, "", "/help?topic=builder");
    renderHelp();
    const navigation = screen.getByRole("navigation", { name: "Tematy pomocy" });
    const picker = screen.getByRole("combobox", { name: "Wybierz temat" });
    expect(within(navigation).getAllByRole("group", { hidden: true })).toHaveLength(8);
    const topicIds = within(navigation)
        .getAllByRole("group", { hidden: true })
        .flatMap((group) => {
            const title = document.getElementById(
                group.getAttribute("aria-labelledby")
            ).textContent;
            const options = within(within(picker).getByRole("group", { name: title })).getAllByRole(
                "option"
            );
            const links = within(group).getAllByRole("link", { hidden: true });
            expect(links.map((link) => link.textContent)).toEqual(
                options.map((option) => option.textContent)
            );
            expect(links.map((link) => new URL(link.href).searchParams.get("topic"))).toEqual(
                options.map((option) => option.value)
            );
            return options.map((option) => option.value);
        });
    expect(topicIds.sort()).toEqual(HELP_TOPICS.map((topic) => topic.id).sort());
    await userEvent.selectOptions(picker, "backpack-drifs");
    expect(screen.getByRole("heading", { name: "Drify z plecaka", exact: true })).toBeVisible();
    expect(
        within(navigation).getByRole("link", { name: "Drify z plecaka", exact: true })
    ).toHaveAttribute("aria-current", "page");
    const activeGroup = screen
        .getByText("Od zera — ustawienia", { exact: true })
        .closest("details");
    expect(activeGroup).toHaveAttribute("open");
    await userEvent.click(within(activeGroup).getByText("Od zera — ustawienia", { exact: true }));
    expect(activeGroup).not.toHaveAttribute("open");
    await userEvent.selectOptions(picker, "priorities");
    expect(activeGroup).toHaveAttribute("open");
    await userEvent.click(screen.getByText("Plecak i historia zmian", { exact: true }));
    await userEvent.click(within(navigation).getByRole("link", { name: "Plecak", exact: true }));
    expect(picker).toHaveValue("backpack");
});

it("keeps related topic links valid across the help catalog", () => {
    const ids = HELP_TOPICS.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const topic of HELP_TOPICS) {
        expect(topic.steps.length + (topic.tables?.length || 0), topic.id).toBeGreaterThan(0);
        for (const related of topic.related)
            expect(ids, `${topic.id} → ${related}`).toContain(related);
    }
});

it("moves from the dialog to the full help page without losing the originating URL", async () => {
    renderHelp();
    await userEvent.click(screen.getByRole("link", { name: "Jak korzystać?" }));
    await userEvent.click(screen.getByRole("link", { name: "Wszystkie tematy" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.href).toContain("/help?topic=advisor");
    await userEvent.click(screen.getByRole("button", { name: "Wróć do aplikacji" }));
    await waitFor(() =>
        expect(window.location.pathname + window.location.search).toBe("/builder?slot=helmet")
    );
});

it("provides keyboard and touch hints that close with Escape or an outside interaction", async () => {
    const user = userEvent.setup();
    render(
        <>
            <HelpHint kind="locks" label="Blokady" />
            <button>Poza</button>
        </>
    );
    await user.tab();
    expect(screen.getByRole("tooltip")).toHaveTextContent(HELP_HINTS.locks);
    expect(screen.getByRole("button", { name: "Pomoc: Blokady" })).toHaveAttribute(
        "aria-describedby",
        screen.getByRole("tooltip").id
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pomoc: Blokady" }));
    expect(screen.getByRole("tooltip")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Poza" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});

it("has English translations for every instruction and opens localized help", () => {
    for (const group of HELP_GROUPS)
        expect(translate(group.title, "en"), group.title).not.toBe(group.title);
    for (const topic of HELP_TOPICS) {
        const tableText = (topic.tables || []).flatMap((table) => [
            table.caption,
            ...table.headers.filter((header) => /\p{L}/u.test(header)),
            table.note,
        ]);
        for (const source of [
            topic.title,
            topic.intro,
            topic.note,
            ...topic.steps,
            ...tableText,
        ].filter(Boolean))
            expect(translate(source, "en"), source).not.toBe(source);
    }
    for (const source of Object.values(HELP_HINTS))
        expect(translate(source, "en")).not.toBe(source);
    window.history.replaceState(null, "", "/help?topic=capacity");
    render(
        <LanguageContext.Provider value={{ language: "en", setLanguage: vi.fn() }}>
            <HelpProvider>
                <WorkingView />
            </HelpProvider>
        </LanguageContext.Provider>
    );
    expect(
        screen.getByRole("heading", { name: "Why does a drif not fit in an item?" })
    ).toBeVisible();
});
