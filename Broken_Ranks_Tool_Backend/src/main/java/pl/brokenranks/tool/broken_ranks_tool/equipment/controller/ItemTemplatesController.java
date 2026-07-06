package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.ItemTemplateRepository;

import java.util.List;

/**
 * Kontroler API do pobierania szablonów przedmiotów (ItemTemplate).
 */
@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ItemTemplatesController {

    private final ItemTemplateRepository itemRepository;

    /**
     * Zwraca listę wszystkich dostępnych szablonów przedmiotów.
     * Wynik jest cachowany w celu poprawy wydajności.
     *
     * @return ResponseEntity z listą wszystkich przedmiotów.
     */
    @GetMapping
    @Cacheable("allItems")
    public ResponseEntity<List<ItemTemplate>> getAllItems() {
        return ResponseEntity.ok(itemRepository.findAll());
    }

    /**
     * Zwraca listę szablonów przedmiotów przefiltrowaną po podanej kategorii.
     * Wynik jest cachowany dla każdej kategorii.
     *
     * @param category Kategoria przedmiotów do odfiltrowania.
     * @return ResponseEntity z listą przedmiotów lub 404 Not Found, jeśli żadne przedmioty nie pasują.
     */
    @GetMapping("/category/{category}")
    @Cacheable(value = "itemsByCategory", key = "#category")
    public ResponseEntity<List<ItemTemplate>> getItemsByCategory(@PathVariable ITEM_CATEGORY category) {
        List<ItemTemplate> items = itemRepository.findByCategory(category);
        if (items.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(items);
    }
}
