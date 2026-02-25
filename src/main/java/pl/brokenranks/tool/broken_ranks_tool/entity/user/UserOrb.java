package pl.brokenranks.tool.broken_ranks_tool.entity.user;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.BaseEntity;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.OrbTemplate;

@Entity
@Table(name = "user_orbs")
@NoArgsConstructor
@Getter
@Setter
@AllArgsConstructor
@SuperBuilder
public class UserOrb extends BaseEntity {
    @ManyToOne
    @JoinColumn(name = "orb_template_id", nullable = false)
    private OrbTemplate orbTemplate;

    @ManyToOne
    @JoinColumn(name = "user_item_id", nullable = false)
    private UserItem userItem;
}
