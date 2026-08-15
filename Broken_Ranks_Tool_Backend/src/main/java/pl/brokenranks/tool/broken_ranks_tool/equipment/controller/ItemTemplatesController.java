package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;

import java.util.List;

/** Exposes API endpoints for retrieving item templates. */
@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ItemTemplatesController {

    private final ItemTemplateRepository itemRepository;

    /** @return HTTP 200 with all item templates. */
    @GetMapping
    @Cacheable("allItems")
    public ResponseEntity<List<ItemTemplate>> getAllItems() {
        return ResponseEntity.ok(itemRepository.findAll());
    }

    /**
     * @param category Category used to filter item templates.
     * @return HTTP 200 with matching items, or HTTP 404 when none are found.
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
