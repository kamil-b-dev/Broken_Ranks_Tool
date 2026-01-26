package pl.brokenranks.tool.broken_ranks_tool.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "gems")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Gem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String bonusStat;
    private int bonusValue;

    @ManyToOne
    @JoinColumn(name = "item_id")
    private Item item;
}