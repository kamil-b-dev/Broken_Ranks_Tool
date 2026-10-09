import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog";

test.beforeEach(async ({ context }) => {
    await context.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
});

test("desktop slot controls remain visible at narrow widths and character reset is available", async ({
    page,
}) => {
    for (const width of [1440, 690, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto("/kreator?ui=desktop");
        const slots = page.locator("button.equipment-slot-overview");
        await expect(slots).toHaveCount(12);
        for (const slot of await slots.all()) await expect(slot).toBeVisible();
        await expect(page.getByRole("button", { name: "Zresetuj punkty" })).toBeVisible();
        await page.screenshot({
            path: `node_modules/.cache/br-audit/builder-${width}.png`,
            fullPage: true,
        });
    }
});

test("catalog details support Tab focus, Escape and keyboard activation", async ({ page }) => {
    await page.goto("/kreator?ui=desktop");
    const details = page.getByRole("button", { name: /Szczegóły: Hełm podróżnika/ });
    await expect(details).toBeVisible();
    await details.focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(details).toHaveAttribute(
        "aria-describedby",
        await page.getByRole("tooltip").getAttribute("id")
    );
    await details.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await details.press("Enter");
    await expect(page.getByRole("tooltip")).toBeVisible();
    await details.press("Tab");
    await expect(details).not.toBeFocused();
});

test("simultaneous saves in two tabs preserve both records and refresh the library", async ({
    page,
    context,
}) => {
    const second = await context.newPage();
    await Promise.all([page.goto("/kreator?ui=desktop"), second.goto("/kreator?ui=desktop")]);
    const save = (tab) => tab.getByRole("button", { name: /Zapisz lokalnie/ });
    await expect(save(page)).toBeEnabled();
    await expect(save(second)).toBeEnabled();
    await Promise.all([save(page).click(), save(second).click()]);
    await expect(page.getByRole("status")).toContainText("Zapisano lokalnie");
    await expect(second.getByRole("status")).toContainText("Zapisano lokalnie");
    const records = await page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.build-library.v1")).builds
    );
    expect(records).toHaveLength(2);
    expect(new Set(records.map(({ id }) => id)).size).toBe(2);
    await page.goto("/buildy?ui=desktop");
    await expect(page.locator(".saved-build-card")).toHaveCount(2);
    await save(second).click();
    await expect(page.locator(".saved-build-card")).toHaveCount(3);
});
