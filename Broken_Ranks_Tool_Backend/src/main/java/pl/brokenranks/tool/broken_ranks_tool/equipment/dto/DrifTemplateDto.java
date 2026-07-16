package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DrifTemplateDto {
    private Long id;
    private String name;
    private String baseValue;
    private String increment;
    private DRIF_SIZE size;
    private DRIF_BONUS_TYPE bonusType;
    private String rankRange;
    private int price;
    private DRIF_CATEGORY category;

    public static DrifTemplateDto fromEntity(DrifTemplate entity) {
        return new DrifTemplateDto(
                entity.getId(),
                entity.getName(),
                entity.getBaseValue(),
                entity.getIncrement(),
                entity.getSize(),
                entity.getBonusType(),
                entity.getRankRange(),
                entity.getPrice(),
                entity.getBonusType() != null ? entity.getBonusType().getCategory() : null
        );
    }
}
