package pl.brokenranks.tool.broken_ranks_tool.entity.templates;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.DRIF_SIZE;

@Entity
@Table(name = "drif_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DrifTemplate extends BaseNamedEntity {

    @Enumerated(EnumType.STRING)
    private DRIF_SIZE size;

    @Enumerated(EnumType.STRING)
    private DRIF_BONUS_TYPE bonusType;

    private String baseValue;
    private String increment;
    private String rankRange;
    private int price;
}