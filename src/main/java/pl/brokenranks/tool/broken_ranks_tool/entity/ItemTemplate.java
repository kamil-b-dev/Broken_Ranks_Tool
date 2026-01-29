package pl.brokenranks.tool.broken_ranks_tool.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "item_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String category;
    private String tier;
    private int reqLevel;
    private String boss;
    private int capacity;


    @ElementCollection
    @CollectionTable(name = "item_stats", joinColumns = @JoinColumn(name = "item_id"))
    @MapKeyColumn(name = "stat_name")
    @Column(name = "stat_value")
    private Map<String, Integer> stats;
}