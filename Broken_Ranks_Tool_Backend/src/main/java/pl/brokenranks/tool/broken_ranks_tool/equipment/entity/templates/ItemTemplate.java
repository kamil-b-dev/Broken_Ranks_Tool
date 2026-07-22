package pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import pl.brokenranks.tool.broken_ranks_tool.core.converters.MapToStringConverter;
import pl.brokenranks.tool.broken_ranks_tool.core.entity.BaseNamedEntity;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.RARITY;

import java.util.Map;

/**
 * Reprezentuje szablon przedmiotu.
 * Ta klasa została stworzona, aby oddzielić bazowe właściwości przedmiotu
 * od konkretnych instancji, które mogą istnieć w ekwipunku graczy.
 */
@Entity
@Table(name = "item_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ItemTemplate extends BaseNamedEntity {

    @Enumerated(EnumType.STRING)
    private ITEM_CATEGORY category;

    private String tier;
    private int reqLevel;
    private String boss;
    private Integer capacity;

    @Column(name = "stats")
    @Convert(converter = MapToStringConverter.class)
    private Map<String, Double> stats;

    @Column(name = "rarity")
    @Enumerated(EnumType.STRING)
    private RARITY rarity;
}
