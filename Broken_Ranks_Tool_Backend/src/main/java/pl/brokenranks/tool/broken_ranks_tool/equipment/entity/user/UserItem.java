package pl.brokenranks.tool.broken_ranks_tool.equipment.entity.user;

import jakarta.persistence.Entity;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.BaseNamedEntity;

/**
 * Encja reprezentująca przedmiot należący do użytkownika.
 * Przechowuje informacje o konkretnym przedmiocie w ekwipunku lub konfiguracji użytkownika.
 */
@Entity
public class UserItem extends BaseNamedEntity {
    // Potencjalnie pola specyficzne dla przedmiotu użytkownika, np. unikalne ID, poziom ulepszenia itp.
}
