package pl.brokenranks.tool.broken_ranks_tool.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.brokenranks.tool.broken_ranks_tool.dto.GemRequest;
import pl.brokenranks.tool.broken_ranks_tool.entity.Gem;
import pl.brokenranks.tool.broken_ranks_tool.entity.Item;
import pl.brokenranks.tool.broken_ranks_tool.repository.GemRepository;
import pl.brokenranks.tool.broken_ranks_tool.repository.ItemRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;
    private final GemRepository gemRepository;

    //Pobieranie wszystkich przedmiotów
    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    //Dodawanie kamienia do przedmiotu
    @Transactional
    public Gem addGemToItem(GemRequest request) {
        //Szukanie kamienia który dodajemy
        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Nie znaleziono przedmiotu o ID: " + request.getItemId()));

        //Tworzenie nowego kamienia na podstawie szablonu
        Gem newGem = Gem.builder()
                .name(request.getName())
                .bonusStat(request.getBonusStat())
                .bonusValue(request.getBonusValue())
                .item(item)
                .build();

        //Zapisanie kamienia
        return gemRepository.save(newGem);
    }
}