package pl.brokenranks.tool.broken_ranks_tool.catalog.dto;

import java.util.Map;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.CHARACTER_CLASS;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CLASS_SCOPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_PROFILE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

/** Client-facing representation of an item template. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ItemTemplateDto {
    private Long id;
    private String name;
    private ITEM_CATEGORY category;
    private String tier;
    private int reqLevel;
    private String boss;
    private Integer capacity;
    private Map<String, Double> stats;
    private RARITY rarity;
    private ITEM_PROFILE profile;
    private ITEM_CLASS_SCOPE classScope;
    private Set<CHARACTER_CLASS> allowedClasses;

    public static ItemTemplateDto fromEntity(ItemTemplate entity) {
        return new ItemTemplateDto(
                entity.getId(),
                entity.getName(),
                entity.getCategory(),
                entity.getTier(),
                entity.getReqLevel(),
                entity.getBoss(),
                entity.getCapacity(),
                entity.getStats(),
                entity.getRarity(),
                entity.getProfile(),
                entity.getClassScope(),
                entity.getAllowedClasses());
    }
}
