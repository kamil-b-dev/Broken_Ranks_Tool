const pageAssetBudget = 1_000_000;
// Social cards are fetched by crawlers, separately from the page's loading path.
const socialCardBudget = 2_000_000;
const totalOutputBudget = 12_000_000;

export function checkOutputBudget(files) {
    const totals = { page: 0, social: 0 };
    const oversized = [];
    for (const file of files) {
        const category = /^social-preview\.(?:png|jpe?g|webp)$/u.test(file.name)
            ? "social"
            : "page";
        totals[category] += file.size;
        const maximum = category === "social" ? socialCardBudget : pageAssetBudget;
        if (file.size > maximum)
            oversized.push(`${file.name}: ${file.size} B (limit ${maximum} B)`);
    }
    const total = totals.page + totals.social;
    if (oversized.length || total > totalOutputBudget) {
        throw new Error(
            [
                `Frontend output exceeds its size budget (${total} B total, limit ${totalOutputBudget} B).`,
                ...oversized,
            ].join("\n")
        );
    }
    return { ...totals, total };
}
