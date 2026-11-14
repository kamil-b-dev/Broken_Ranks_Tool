import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LanguageProvider from "../../shared/i18n/LanguageProvider";
import LanguageSwitcher from "../../shared/i18n/LanguageSwitcher";
import { useAppRoute } from "../useAppRoute";
import PageMetadata from "./PageMetadata";

vi.mock("../../features/equipment/useEquipmentCatalog", () => ({
    requestEquipmentCatalog: vi.fn(),
}));

const originalHead = document.head.innerHTML;
beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/builder?ui=mobile#details");
});
afterEach(() => {
    document.head.innerHTML = originalHead;
    window.history.replaceState(null, "", "/");
});

function Navigation() {
    const { navigate } = useAppRoute();
    return <button onClick={() => navigate("builds")}>Library</button>;
}

it("keeps direct links, app navigation, browser history and language metadata in sync", () => {
    render(
        <LanguageProvider>
            <PageMetadata />
            <LanguageSwitcher />
            <Navigation />
        </LanguageProvider>
    );
    expect(document.title).toMatch(/^Kalkulator ekwipunku/);
    expect(document.querySelector('link[rel="canonical"]').href).toBe(
        "https://www.brokenrankstool.pl/builder"
    );
    fireEvent.click(screen.getByRole("button", { name: "EN — English" }));
    expect(document.title).toMatch(/^Equipment calculator/);
    expect(document.querySelector('meta[property="og:title"]').content).toBe(document.title);
    expect(document.querySelector('meta[property="og:locale"]').content).toBe("en_GB");
    fireEvent.click(screen.getByText("Library"));
    expect(document.querySelector('meta[name="robots"]').content).toBe("noindex, follow");
    expect(document.querySelector('meta[property="og:url"]').content).toMatch(/\/builds$/);
    act(() => {
        window.history.replaceState(null, "", "/help?topic=optimizer");
        window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(document.title).toMatch(/^Calculator and optimizer guide/);
    expect(document.querySelector('meta[name="robots"]').content).toBe("index, follow");
    expect(document.querySelector('link[rel="canonical"]').href).toMatch(/\/help$/);
    act(() => {
        window.history.replaceState(null, "", "/optimizer");
        window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(document.title).toMatch(/^Drif optimizer/);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
});
