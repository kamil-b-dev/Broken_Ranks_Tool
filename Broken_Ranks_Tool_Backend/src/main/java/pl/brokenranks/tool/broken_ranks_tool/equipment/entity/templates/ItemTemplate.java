package pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates;

import jakarta.persistence.*;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import lombok.*;
import lombok.experimental.SuperBuilder;
import pl.brokenranks.tool.broken_ranks_tool.core.entity.BaseNamedEntity;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.CHARACTER_CLASS;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CLASS_SCOPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_PROFILE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.ItemProfileClassifier;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.converter.MapToStringConverter;

/** Defines shared item properties independently from user-owned item instances. */
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

    @Column(name = "profile", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ITEM_PROFILE profile = ITEM_PROFILE.UNSPECIFIED;

    @Column(name = "class_scope", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ITEM_CLASS_SCOPE classScope = ITEM_CLASS_SCOPE.UNKNOWN;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "item_template_classes",
            joinColumns = @JoinColumn(name = "item_template_id"))
    @Column(name = "character_class", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<CHARACTER_CLASS> allowedClasses = new LinkedHashSet<>();

    @PrePersist
    @PreUpdate
    void refreshProfile() {
        profile = ItemProfileClassifier.classify(category, stats);
    }
}
