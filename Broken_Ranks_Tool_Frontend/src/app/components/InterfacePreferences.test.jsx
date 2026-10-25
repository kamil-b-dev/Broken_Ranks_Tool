import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import InterfacePreferences from "./InterfacePreferences";
import LanguageProvider from "../../shared/i18n/LanguageProvider";
import { LANGUAGE_STORAGE_KEY } from "../../shared/i18n/translation";
import { OPTIMIZER_LABEL_STORAGE_KEY } from "../../features/optimizer/optimizerLabels";

beforeEach(() => localStorage.clear());

it("preserves modifier naming when switching and restoring the interface language", async () => {
    const user = userEvent.setup();
    const mount = () =>
        render(
            <LanguageProvider>
                <InterfacePreferences />
            </LanguageProvider>
        );
    const app = mount();
    await user.selectOptions(screen.getByRole("combobox", { name: "Nazwy modów" }), "DRIFS");
    await user.click(screen.getByRole("button", { name: "EN — English" }));
    expect(screen.getByRole("combobox")).toHaveValue("DRIFS");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(localStorage.getItem(OPTIMIZER_LABEL_STORAGE_KEY)).toBe("DRIFS");
    app.unmount();
    mount();
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("combobox")).toHaveValue("DRIFS");
    await user.click(screen.getByRole("button", { name: "PL — Polski" }));
    expect(screen.getByRole("combobox", { name: "Nazwy modów" })).toHaveValue("DRIFS");
});
