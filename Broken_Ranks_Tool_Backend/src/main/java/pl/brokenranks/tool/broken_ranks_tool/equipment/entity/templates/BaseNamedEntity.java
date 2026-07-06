package pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates;

import jakarta.persistence.MappedSuperclass;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Abstrakcyjna klasa bazowa dla encji, które posiadają nazwę.
 * Rozszerza {@link BaseEntity} o pole {@code name}.
 */
@MappedSuperclass
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
public abstract class BaseNamedEntity extends BaseEntity {
    private String name;
}
