package pl.brokenranks.tool.broken_ranks_tool.equipment.service;

import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Fasada dla modułu ekwipunku.
 * Zapewnia uproszczony, wysokopoziomowy interfejs dostępu do logiki i danych
 * związanych z ekwipunkiem, ukrywając wewnętrzną złożoność podsystemu.
 * Jest to jedyny punkt kontaktu dla zewnętrznych modułów (np. 'optimization').
 */
public interface EquipmentFacade {

    /**
     * Pobiera mapę szablonów przedmiotów na podstawie podanej kolekcji ID.
     * @param ids Kolekcja ID przedmiotów do pobrania.
     * @return Mapa, gdzie kluczem jest ID przedmiotu, a wartością jego szablon.
     */
    Map<Long, ItemTemplate> getItemTemplates(Collection<Long> ids);

    /**
     * Pobiera listę wszystkich dostępnych szablonów drifów.
     * @return Lista wszystkich drifów.
     */
    List<DrifTemplate> getAllDrifs();

    /**
     * Oblicza całkowitą pojemność drifów dla przedmiotu.
     * @param item Szablon przedmiotu.
     * @param itemStars Poziom ulepszenia przedmiotu.
     * @return Całkowita pojemność drifów.
     */
    int calculateItemCapacity(ItemTemplate item, int itemStars);

    /**
     * Sprawdza, czy rozmiar drifu jest dozwolony dla danego tieru przedmiotu.
     * @param drif Szablon drifu.
     * @param item Szablon przedmiotu.
     * @return {@code true}, jeśli rozmiar drifu jest dozwolony.
     */
    boolean isValidDrifSizeForTier(DrifTemplate drif, ItemTemplate item);

    /**
     * Sprawdza, czy pozycja drifu z obrażeniami od żywiołów jest prawidłowa.
     * @param drif Szablon drifu.
     * @param slotKey Klucz identyfikujący slot.
     * @return {@code true}, jeśli drif żywiołowy jest w prawidłowym slocie.
     */
    boolean isElementalDrifPositionValid(DrifTemplate drif, String slotKey);
}
