package pl.brokenranks.tool.broken_ranks_tool.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ITEM_CATEGORY;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dictionaries")
@CrossOrigin(origins = "*")
public class DictionaryController {

    @GetMapping("/categories")
    public Map<String, String> getCategoryDictionary() {
        return Arrays.stream(ITEM_CATEGORY.values())
                .collect(Collectors.toMap(
                        Enum::name,
                        ITEM_CATEGORY::getDescription
                ));
    }
}