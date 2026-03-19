package pl.brokenranks.tool.broken_ranks_tool.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.repository.ItemTemplateRepository;

import java.util.List;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GetItemTemplatesController {

    private final ItemTemplateRepository itemRepository;

    @GetMapping
    public List<ItemTemplate> getAllItems() {
        return itemRepository.findAll();
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<ItemTemplate>> getItemsByCategory(@PathVariable ITEM_CATEGORY category) {
        List<ItemTemplate> items = itemRepository.findByCategory(category);
        if (items.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(items);
    }
}
