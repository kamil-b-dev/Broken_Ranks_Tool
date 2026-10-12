import { expect, test } from "@playwright/test";

test("orders character attributes, loads intelligence artwork and keeps controls readable", async ({
    page,
}) => {
    await page.route("**/api/initial-data", (route) =>
        route.fulfill({
            json: {
                items: [],
                orbs: [],
                drifs: [],
                gameRules: {},
                dictionaries: { itemCategories: {}, orbCategories: {}, drifCategories: {} },
            },
        })
    );
    await page.setViewportSize({ width: 1824, height: 1000 });
    await page.goto("/kreator?ui=desktop");
    const controls = page.locator(".character-stat-control");
    await expect(controls).toHaveCount(8);
    expect(
        await controls.evaluateAll((elements) => elements.map((element) => element.dataset.stat))
    ).toEqual(["PŻ", "Mana", "Kondycja", "Siła", "Zręczność", "Moc", "Wiedza", "Inteligencja"]);
    const intelligence = page.locator('[data-stat="Inteligencja"]');
    await expect(intelligence.locator("strong")).toHaveText("10");
    const iconUrl = await intelligence
        .locator(".character-stat-icon")
        .evaluate(
            (element) =>
                getComputedStyle(element, "::before").backgroundImage.match(/url\("?(.*?)"?\)/)[1]
        );
    const iconResponse = await page.request.get(iconUrl);
    expect(iconResponse.ok()).toBe(true);
    await page.getByRole("button", { name: "Zwiększ poziom postaci" }).click();
    await page.getByRole("button", { name: "Dodaj punkt: Inteligencja" }).click();
    await expect(intelligence.locator("strong")).toHaveText("11");
    for (const width of [1824, 1366]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(
            await page
                .locator(".character-summary")
                .evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
        ).toBe(true);
        expect(
            await intelligence.evaluate((element) => {
                const bounds = element.getBoundingClientRect();
                return [
                    ...element.querySelectorAll(
                        "button, div > span:not(.character-stat-icon), strong"
                    ),
                ].every((control) => {
                    const box = control.getBoundingClientRect();
                    const range = document.createRange();
                    range.selectNodeContents(control);
                    const text = range.getBoundingClientRect();
                    const actions = element
                        .querySelector(".character-stat-actions")
                        .getBoundingClientRect();
                    return (
                        box.left >= bounds.left &&
                        box.right <= bounds.right &&
                        text.left >= bounds.left &&
                        text.right <= bounds.right &&
                        (control.tagName === "BUTTON" || text.right <= actions.left)
                    );
                });
            })
        ).toBe(true);
    }
    await page.setViewportSize({ width: 1824, height: 1000 });
    await page
        .locator(".character-summary")
        .screenshot({ path: "../tmp/intelligence-character-panel.png" });
});
