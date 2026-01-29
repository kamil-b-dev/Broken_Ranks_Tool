package pl.brokenranks.tool.broken_ranks_tool.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "orb_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrbTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    private String name;
    private String bonusStat;
    private int bonusValue;
    private int tier;
    private int level;
    private ORB_CATEGORY category;
}
