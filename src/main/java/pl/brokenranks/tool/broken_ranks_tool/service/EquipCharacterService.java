package pl.brokenranks.tool.broken_ranks_tool.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.entity.GemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.entity.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.entity.UserGem;
import pl.brokenranks.tool.broken_ranks_tool.entity.UserItem;
import pl.brokenranks.tool.broken_ranks_tool.repository.GemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.repository.UserGemRepository;
import pl.brokenranks.tool.broken_ranks_tool.repository.UserItemRepository;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class EquipCharacterService {

    private final ItemTemplateRepository itemTemplateRepository;
    private final GemTemplateRepository gemTemplateRepository;
    private final UserItemRepository userItemRepository;
    private final UserGemRepository userGemRepository;

    //Stworzenie instancji przedmiotu
    public UserItem equipItem(Long templateId) {
        ItemTemplate template = itemTemplateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("Nie ma takiego przedmiotu w bibliotece"));

        UserItem userItem = UserItem.builder()
                .itemTemplate(template)
                .equippedGems(new ArrayList<>())
                .build();

        return userItemRepository.save(userItem);
    }

    //Dodanie kamienia do instacji przedmiotu
    public UserGem addGemToUserItem(Long userItemId, Long gemTemplateId) {
        UserItem userItem = userItemRepository.findById(userItemId)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono założonego przedmiotu"));

        GemTemplate gemTemplate = gemTemplateRepository.findById(gemTemplateId)
                .orElseThrow(() -> new RuntimeException("Nie ma takiego kamienia w bibliotece"));

        UserGem userGem = UserGem.builder()
                .gemTemplate(gemTemplate)
                .userItem(userItem)
                .build();

        return userGemRepository.save(userGem);
    }
}