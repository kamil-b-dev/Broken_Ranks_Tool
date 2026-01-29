package pl.brokenranks.tool.broken_ranks_tool.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "user_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "template_id")
    private ItemTemplate itemTemplate; //Wskazuje co to za przedmiot

    @OneToMany(mappedBy = "userItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserGem> equippedGems = new ArrayList<>(); //Kamienie włożone przez gracza
}