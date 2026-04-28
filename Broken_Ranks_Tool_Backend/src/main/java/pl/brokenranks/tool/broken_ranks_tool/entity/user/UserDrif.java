package pl.brokenranks.tool.broken_ranks_tool.entity.user;


import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.BaseEntity;

@Entity
@Table(name = "user_drif")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserDrif extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "user_item_id")
    private UserItem userItem;

    @ManyToOne
    @JoinColumn(name = "drif_template_id")
    private pl.brokenranks.tool.broken_ranks_tool.entity.templates.DrifTemplate drifTemplate;

    private int level;

}
