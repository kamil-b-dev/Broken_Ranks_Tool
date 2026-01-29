package pl.brokenranks.tool.broken_ranks_tool.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_gems")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "gem_template_id", nullable = false)
    private GemTemplate gemTemplate; //Wskazuje który to kamien

    @ManyToOne
    @JoinColumn(name = "user_item_id", nullable = false)
    @JsonIgnore
    private UserItem userItem; //Wskazuje do którego przedmiotu należy
}