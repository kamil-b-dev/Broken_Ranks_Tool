package pl.brokenranks.tool.broken_ranks_tool.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.entity.UserGem;
import pl.brokenranks.tool.broken_ranks_tool.entity.UserItem;
import pl.brokenranks.tool.broken_ranks_tool.service.EquipCharacterService;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
public class ItemController {

    private final EquipCharacterService equipCharacterService;

    //Zakladanie przedmiotu
    @PostMapping("/add-item")
    public ResponseEntity<UserItem> equipItem(@RequestParam Long templateId)
    {
        UserItem userItem = equipCharacterService.equipItem(templateId);
        return new ResponseEntity<>(userItem, HttpStatus.CREATED);
    }

    //Dodawanie kamienia do przedmiotu
    @PostMapping("/add-gem")
    public ResponseEntity<UserGem> equipGem(@RequestParam Long userItemId, @RequestParam Long gemTemplateId)
    {
        UserGem userGem = equipCharacterService.addGemToUserItem(userItemId, gemTemplateId);
        return new ResponseEntity<>(userGem, HttpStatus.CREATED);
    }
}