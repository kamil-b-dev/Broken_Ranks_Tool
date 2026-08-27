package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

/** Normalizes upgrade levels and derives item capacity. */
@Component
public class UpgradeLevelPolicy {
    public int calculateItemCapacity(ItemTemplate item, int stars) {
        int base = item.getCapacity() == null ? 0 : item.getCapacity();
        if (base == 0) return 0;
        int normalized = sanitizeItemStars(stars);
        return base + (normalized == 7 ? 1 : normalized == 8 ? 2 : normalized == 9 ? 4 : 0);
    }

    public int sanitizeDrifLevel(int level, DrifTemplate drif) {
        return drif.getSize() == null
                ? Math.max(1, level)
                : Math.max(1, Math.min(level, drif.getSize().getMaxLevel()));
    }

    public int sanitizeOrbLevel(int level, OrbTemplate orb) {
        return orb.getSize() == null
                ? Math.max(1, level)
                : Math.max(1, Math.min(level, orb.getSize().getMaxLevel()));
    }

    public int sanitizeItemStars(int stars) {
        return Math.max(1, Math.min(stars, 9));
    }
}
