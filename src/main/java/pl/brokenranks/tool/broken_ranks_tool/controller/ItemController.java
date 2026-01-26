package pl.brokenranks.tool.broken_ranks_tool.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.dto.GemRequest;
import pl.brokenranks.tool.broken_ranks_tool.entity.Gem;
import pl.brokenranks.tool.broken_ranks_tool.entity.Item;
import pl.brokenranks.tool.broken_ranks_tool.service.ItemService;

import java.util.List;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    //Pobieranie wszystkich przedmiotów
    @GetMapping
    public List<Item> getAllItems() {
        return itemService.getAllItems();
    }

    //Dodawanie kamienia do przedmiotu
    @PostMapping("/add-gem")
    public ResponseEntity<Gem> addGemToItem(@RequestBody GemRequest gemRequest) {
        Gem savedGem = itemService.addGemToItem(gemRequest);
        return new ResponseEntity<>(savedGem, HttpStatus.CREATED);
    }
}