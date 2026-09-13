package pl.brokenranks.tool.broken_ranks_tool.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

/** Client-facing representation of an orb template. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrbTemplateDto {
    private Long id;
    private String name;
    private ORB_SIZE size;
    private ORB_CATEGORY category;
    private ORB_BONUS_TYPE bonusType;
    private String bonusLvl1;
    private String bonusLvl2;
    private String bonusLvl3;
    private String rankRange;
    private int price;

    public static OrbTemplateDto fromEntity(OrbTemplate entity) {
        return new OrbTemplateDto(
                entity.getId(),
                entity.getName(),
                entity.getSize(),
                entity.getCategory(),
                entity.getBonusType(),
                entity.getBonusLvl1(),
                entity.getBonusLvl2(),
                entity.getBonusLvl3(),
                entity.getRankRange(),
                entity.getPrice());
    }
}
