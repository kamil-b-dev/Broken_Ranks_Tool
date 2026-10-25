import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import ProgressionResult from "./ProgressionResult";
import { legendReport, reportData } from "./progressionReport.fixtures";

it("shows only step-by-step details on mobile, preserving the full upgrade order", async () => {
    const user = userEvent.setup();
    render(<ProgressionResult report={legendReport()} data={reportData} mobile />);
    const timeline = screen.getByRole("list", { name: "Etapy według poziomu" });
    expect(timeline.children).toHaveLength(3);
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Poziom 120/ })).toHaveAttribute(
        "aria-expanded",
        "false"
    );
    await user.click(screen.getByRole("button", { name: /Poziom 120/ }));
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
    expect(
        screen.queryByRole("heading", { name: "Przygotuj", exact: true })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Przenieś", exact: true })).toBeInTheDocument();
    await user.click(screen.getByText("Szczegóły", { exact: true }));
    expect(document.querySelector(".progression-config")).not.toBeInTheDocument();
    const stats = screen.getByRole("region", { name: "Podsumowanie statystyk" });
    expect(within(stats).getByText("Szansa na krytyk")).toBeVisible();
    expect(within(stats).getByText("5%")).toBeVisible();
    expect(within(stats).getByText("Statystyki nie uwzględniają synergetyków.")).toBeVisible();
    expect(stats.parentElement.lastElementChild).toBe(stats);
    const ordered = screen.getByText("Ulepsz epik Żmij do 9★.").closest("ol");
    const texts = within(ordered)
        .getAllByRole("listitem")
        .map((entry) => entry.textContent);
    expect(texts.indexOf("Ulepsz epik Żmij do 9★.")).toBeLessThan(
        texts.indexOf("Ulepsz epik Żmij (9★) do legendy (1★).")
    );
    expect(texts.indexOf("Ulepsz epik Żmij (9★) do legendy (1★).")).toBeLessThan(
        texts.indexOf("Ulepsz legendę Żmij do 9★.")
    );
    expect(screen.queryByText(/^(Drif|Orb) \d+$/)).not.toBeInTheDocument();
    expect(screen.getByText(/Wyjmij Czuf.*Żmij · epik/)).toBeInTheDocument();
    expect(screen.getAllByText(/Włóż Czuf.*Żmij · legenda/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/orb:internal/)).not.toBeInTheDocument();
});

it("opens before and after equipment with Polish stats and omits every reserved slot", async () => {
    const user = userEvent.setup();
    const report = { ...legendReport(), resSlots: ["ring1", "ring2", "necklace"] };
    render(<ProgressionResult report={report} data={reportData} />);
    await user.click(screen.getByRole("button", { name: /Poziom 120/ }));
    await user.click(screen.getByText("Szczegóły"));
    expect(document.querySelector(".progression-instructions")).not.toBeInTheDocument();
    expect(screen.getByText("Przed", { exact: true })).toBeVisible();
    expect(screen.getByText("Po", { exact: true })).toBeVisible();
    expect(screen.getByText("Żmij · epik · 1★")).toBeVisible();
    expect(screen.getByText("Żmij · legenda · 9★")).toBeVisible();
    expect(screen.getByText("Szansa na krytyk")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Pierścień 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Pierścień 2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Naszyjnik" })).not.toBeInTheDocument();
    expect(screen.queryByText("res", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Statystyki nie uwzględniają synergetyków.")).toBeVisible();
    const stats = screen.getByRole("region", { name: "Podsumowanie statystyk" });
    expect(stats.parentElement.lastElementChild).toBe(stats);
});

it.each([false, true])("shows final stats even without operations, mobile=%s", async (mobile) => {
    const user = userEvent.setup();
    const report = { ...legendReport(), resSlots: [] };
    render(<ProgressionResult report={report} data={reportData} mobile={mobile} />);
    await user.click(screen.getByRole("button", { name: /Poziom 140/ }));
    await user.click(screen.getByText("Szczegóły"));
    expect(screen.getAllByText("Szczegóły")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Podsumowanie statystyk" })).toBeVisible();
    expect(screen.getByText("5%")).toBeVisible();
    expect(screen.queryByText("Statystyki nie uwzględniają synergetyków.")).not.toBeInTheDocument();
});

it("uses the player level and checklist to reveal the next milestone without completing earlier ones", async () => {
    const user = userEvent.setup();
    render(<ProgressionResult report={legendReport()} data={reportData} />);
    const input = screen.getByLabelText("Twój poziom");
    await user.clear(input);
    await user.type(input, "120");
    await user.tab();
    expect(screen.getByRole("button", { name: /Poziom 120/ })).toHaveAttribute(
        "aria-expanded",
        "true"
    );
    await user.click(screen.getByRole("checkbox", { name: "Poziom 120 wykonany" }));
    expect(screen.getByRole("button", { name: /Poziom 140/ })).toHaveAttribute(
        "aria-expanded",
        "true"
    );
    expect(screen.getByRole("status")).toHaveTextContent("Wykonane etapy: 1 z 3");
    expect(screen.getByRole("checkbox", { name: "Poziom 60 wykonany" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /Najbliższy etap: poziom 140/ })).toBeVisible();
});
