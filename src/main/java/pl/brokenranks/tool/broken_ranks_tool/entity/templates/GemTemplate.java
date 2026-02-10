package pl.brokenranks.tool.broken_ranks_tool.entity.templates;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "gem_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class GemTemplate extends BaseNamedEntity {

    private String bonusStat;
    private int bonusValue;
}