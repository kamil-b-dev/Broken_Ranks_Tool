package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.ItemTemplateRepository;

import java.util.List;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ItemTemplatesController {

    private final ItemTemplateRepository itemRepository;

    @GetMapping
    @Cacheable("allItems")
    public List<ItemTemplate> getAllItems() {
        return itemRepository.findAll();
    }

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
