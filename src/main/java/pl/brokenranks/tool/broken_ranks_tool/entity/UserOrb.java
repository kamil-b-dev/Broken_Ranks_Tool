package pl.brokenranks.tool.broken_ranks_tool.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_orbs")
@NoArgsConstructor
@Getter
@Setter
@AllArgsConstructor
@Builder
public class UserOrb {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "orb_template_id", nullable = false)
    private OrbTemplate orbTemplate;

    @ManyToOne
    @JoinColumn(name = "user_item_id", nullable = false)
    private UserItem userItem;
}
