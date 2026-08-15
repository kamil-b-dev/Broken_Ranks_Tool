package pl.brokenranks.tool.broken_ranks_tool.app_data.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

/** Exposes API endpoints for the core translation dictionaries. */
@RestController
@RequestMapping("/api/dictionaries")
@CrossOrigin(origins = "*")
public class DictionaryController {

    /** @return Translations for item categories keyed by enum name. */
    @GetMapping("/categories")
    public Map<String, String> getCategoryDictionary() {
        return Arrays.stream(ITEM_CATEGORY.values())
                .collect(Collectors.toMap(
                        Enum::name,
                        ITEM_CATEGORY::getDescription
                ));
    }

    /** @return Translations for orb categories keyed by enum name. */
    @GetMapping("/orb-categories")
    public Map<String, String> getOrbCategoryDictionary() {
        return Arrays.stream(ORB_CATEGORY.values())
                .collect(Collectors.toMap(
                        Enum::name,
                        ORB_CATEGORY::getDescription
                ));
    }

    /** @return Translations for drif categories keyed by enum name. */
    @GetMapping("/drif-categories")
    public Map<String, String> getDrifCategoryDictionary() {
        return Arrays.stream(DRIF_CATEGORY.values())
                .collect(Collectors.toMap(
                        Enum::name,
                        DRIF_CATEGORY::getDescription
                ));
    }
}
