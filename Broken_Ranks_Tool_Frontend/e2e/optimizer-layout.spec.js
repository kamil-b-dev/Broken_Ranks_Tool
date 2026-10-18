import { expect, test } from "@playwright/test";
import {
    optimizerBuild,
    optimizerCatalog,
    optimizerResponse,
} from "../src/test/fixtures/equipment/optimizerScenario.js";

test.beforeEach(async ({ page }) => {
    await page.addInitScript(
        (build) =>
            localStorage.setItem(
                "broken-ranks-tool.equipment-draft.v1",
                JSON.stringify({ version: 1, value: build })
            ),
        optimizerBuild
    );
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: optimizerCatalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({
            json: { stats: { CRITICAL_CHANCE: "44.39%", MANA_USAGE_REDUCTION: "-53.31%" } },
        })
    );
    await page.route("**/api/optimizer/drifs", (route) => {
        const advisory = route.request().postDataJSON().mode === "ADVISOR";
        const result = optimizerResponse(advisory);
        result.summary.outcome = advisory ? "VALID_BUILD" : "VALID_BUILD_SOFT_TARGETS_UNMET";
        if (advisory) result.advisorReport.stopReason = "STATE_LIMIT";
        else
            result.summary.searchReport = {
                stopReason: "OPERATION_LIMIT",
                evaluatedStates: 1234,
                verifiedStates: 56,
            };
        return route.fulfill({ json: result });
    });
    await page.setViewportSize({ width: 1800, height: 1000 });
    await page.goto("/optimizer?ui=desktop");
});

const assertLayout = async (page, width) => {
    await page.setViewportSize({ width, height: 1000 });
    const grid = page.locator(".optimizer-main-grid");
    const goals = page.locator(".optimizer-goals-column");
    const report = page.locator(".optimizer-info-column");
    await expect(goals).toBeVisible();
    await expect(report).toBeVisible();
    const [gridBox, goalsBox, reportBox] = await Promise.all([
        grid.boundingBox(),
        goals.boundingBox(),
        report.boundingBox(),
    ]);
    expect(gridBox.x + gridBox.width).toBeLessThanOrEqual(width);
    expect(await grid.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
        true
    );
    expect(goalsBox.width).toBeGreaterThanOrEqual(544);
    expect(Math.abs(reportBox.x + reportBox.width - (gridBox.x + gridBox.width))).toBeLessThan(2);
    if (width > 1350) {
        expect(goalsBox.width).toBeGreaterThan(reportBox.width);
        expect(Math.abs(goalsBox.y - reportBox.y)).toBeLessThan(2);
        expect(
            await grid.evaluate(
                (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
            )
        ).toBe(3);
    } else {
        expect(reportBox.y).toBeGreaterThanOrEqual(goalsBox.y + goalsBox.height - 1);
        expect(Math.abs(reportBox.width - gridBox.width)).toBeLessThan(2);
    }
    return goalsBox.width;
};

test("advanced goals stay readable beside an empty or populated report", async ({ page }) => {
    await page.getByRole("button", { name: "Zaawansowany", exact: true }).click();
    await page.locator(".optimizer-bonus-card").filter({ hasText: "Szansa na krytyk" }).click();
    await page.getByText("Rozmiary drifów", { exact: true }).click();
    await page.getByLabel("Ogranicz SUBDRIF dla Szansa na krytyk").check();
    const emptyWidths = new Map();
    for (const width of [1800, 1440, 1366, 1280, 1024]) {
        emptyWidths.set(width, await assertLayout(page, width));
        const overflowingControls = await page
            .locator(".optimizer-priority-column")
            .evaluate((column) => {
                const bounds = column.getBoundingClientRect();
                return [
                    ...column.querySelectorAll('input:not([type="file"]), button, summary'),
                ].flatMap((control) => {
                    const box = control.getBoundingClientRect();
                    return box.width === 0 || (box.left >= bounds.left && box.right <= bounds.right)
                        ? []
                        : [
                              {
                                  name: control.getAttribute("aria-label") || control.textContent,
                                  left: box.left,
                                  right: box.right,
                                  bounds: [bounds.left, bounds.right],
                              },
                          ];
                });
            });
        expect(overflowingControls, `Priority controls must fit at ${width}px`).toEqual([]);
    }
    await page.getByRole("button", { name: /^Uruchom optymalizację$/i }).click();
    await expect(page.locator(".optimizer-goal-row")).toBeVisible();
    for (const width of [1800, 1440, 1366, 1280, 1024]) {
        expect(await assertLayout(page, width)).toBeCloseTo(emptyWidths.get(width), 0);
        if (width === 1800 || width === 1280)
            await page.screenshot({ path: `../tmp/optimizer-layout-${width}.png`, fullPage: true });
    }
});

test("advisor goals and protection values fit without overlapping recommendations", async ({
    page,
}) => {
    await page.getByRole("button", { name: "Doradca", exact: true }).click();
    await page.getByLabel("Główny cel").selectOption("CRITICAL_CHANCE");
    const emptyWidths = new Map();
    for (const width of [1800, 1440, 1366, 1280, 1024]) {
        emptyWidths.set(width, await assertLayout(page, width));
        const readable = await page.locator(".advisor-modifier-row").evaluateAll((rows) =>
            rows.every((row) => {
                const [name, loss] = row.querySelectorAll("label");
                const labelBox = name.getBoundingClientRect();
                const lossBox = loss.getBoundingClientRect();
                const nameBox = name.querySelector("span").getBoundingClientRect();
                const valueBox = name.querySelector("b").getBoundingClientRect();
                return (
                    nameBox.right <= valueBox.left &&
                    (labelBox.right <= lossBox.left || labelBox.bottom <= lossBox.top) &&
                    row.scrollWidth <= row.clientWidth + 1
                );
            })
        );
        expect(readable).toBe(true);
    }
    await page.getByRole("button", { name: /^Analizuj build$/i }).click();
    await expect(page.getByLabel("Plan zmian")).toContainText("Przenieś SUBDRIF Band 6");
    for (const width of [1800, 1440, 1366, 1280, 1024]) {
        expect(await assertLayout(page, width)).toBeCloseTo(emptyWidths.get(width), 0);
        if (width === 1800 || width === 1280)
            await page.screenshot({ path: `../tmp/advisor-layout-${width}.png`, fullPage: true });
    }
});
