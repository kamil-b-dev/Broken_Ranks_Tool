package pl.brokenranks.tool.broken_ranks_tool.entity.templates;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ORB_SIZE;

@Entity
@Table(name = "orb_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrbTemplate extends BaseNamedEntity {
    @Enumerated(EnumType.STRING)
    private ORB_SIZE size;

    @Enumerated(EnumType.STRING)
    private ORB_CATEGORY category;

    @Enumerated(EnumType.STRING)
    private ORB_BONUS_TYPE bonusType;

    private String bonusLvl1;
    private String bonusLvl2;
    private String bonusLvl3;
    private String rankRange;
    private int price;
}
