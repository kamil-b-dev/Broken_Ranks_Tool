package pl.brokenranks.tool.broken_ranks_tool.entity.templates;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import pl.brokenranks.tool.broken_ranks_tool.entity.converters.MapToStringConverter;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ITEM_CATEGORY;

import java.util.Map;

@Entity
@Table(name = "item_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ItemTemplate extends  BaseNamedEntity {

    @Enumerated(EnumType.STRING)
    private ITEM_CATEGORY category;

    private String tier;
    private int reqLevel;
    private String boss;
    private int capacity;

    @Column(name = "stats")
    @Convert(converter = MapToStringConverter.class)
    private Map<String, Integer> stats;
}