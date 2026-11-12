import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { LanguageContext } from "../../shared/i18n/LanguageContext";
import ProjectFooter from "./ProjectFooter";

it("makes reporting and source links available without a catalogue or account", () => {
    render(<ProjectFooter />);
    expect(screen.getByRole("link", { name: "Zgłoś błąd" })).toHaveAttribute(
        "href",
        expect.stringContaining("issues/new?template=bug_report.yml")
    );
    expect(screen.getByRole("link", { name: "Licencja AGPL-3.0" })).toHaveAttribute(
        "href",
        expect.stringContaining("/LICENSE")
    );
    fireEvent.click(screen.getByText("O projekcie i danych"));
    expect(screen.getByText(/Usunięcie danych witryny/)).toBeVisible();
    expect(screen.getByText(/nie obejmuje roboczego szkicu/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Zgłoś podatność prywatnie" })).toHaveAttribute(
        "href",
        expect.stringContaining("/security/advisories/new")
    );
});

it("explains storage, backup scope and reporting in English", () => {
    render(
        <LanguageContext.Provider value={{ language: "en", setLanguage: () => {} }}>
            <ProjectFooter />
        </LanguageContext.Provider>
    );
    fireEvent.click(screen.getByText("About this project and your data"));
    expect(screen.getByRole("link", { name: "Report a bug" })).toBeVisible();
    expect(screen.getByText(/Deleting site data removes these records/)).toBeVisible();
    expect(screen.getByText(/does not include the working draft/)).toBeVisible();
});
