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

    private String baseValue;   // -1%, 0,15% (zostawiamy jako String dla precyzji lub zmieniamy na Double)
    private String increment;   // -1%, +0,15%
    private String rankRange;   // I - XII
    private int price;          // 27500
}