package pl.brokenranks.tool.broken_ranks_tool.entity.user;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.BaseEntity;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.ItemTemplate;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "user_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserItem extends BaseEntity {
    @ManyToOne
    @JoinColumn(name = "template_id")
    private ItemTemplate itemTemplate; //Wskazuje co to za przedmiot

    @OneToMany(mappedBy = "userItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserDrif> equippedGems = new ArrayList<>(); //Kamienie włożone przez gracza

    @OneToMany(mappedBy = "userItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserOrb> equippedOrbs = new  ArrayList<>(); //Orby włożone przez gracza
}