package pl.brokenranks.tool.broken_ranks_tool.core.entity;

import jakarta.persistence.MappedSuperclass;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Rozszerza {@link BaseEntity} o pole {@code name}, aby zapewnić spójną nazwę
 * dla encji, które jej wymagają.
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
