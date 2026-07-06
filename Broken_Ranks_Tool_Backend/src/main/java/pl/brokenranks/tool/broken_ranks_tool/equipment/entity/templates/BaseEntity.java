package pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Abstrakcyjna klasa bazowa dla wszystkich encji.
 * Definiuje wspólne pole ID, które jest generowane automatycznie.
 * Adnotacja {@link MappedSuperclass} sprawia, że pola tej klasy są mapowane
 * w tabelach klas dziedziczących, ale sama klasa nie ma swojej tabeli.
 */
@MappedSuperclass
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
public abstract class BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
