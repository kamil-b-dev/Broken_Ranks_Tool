package pl.brokenranks.tool.broken_ranks_tool.catalog.controller;

import static pl.brokenranks.tool.broken_ranks_tool.core.web.PublicDataResponse.ok;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

/** Exposes API endpoints for the core translation dictionaries. */
@RestController
@RequestMapping("/api/dictionaries")
public class DictionaryController {

    /** @return Translations for item categories keyed by enum name. */
    @GetMapping("/categories")
    public ResponseEntity<Map<String, String>> getCategoryDictionary() {
        return ok(
                Arrays.stream(ITEM_CATEGORY.values())
                        .collect(Collectors.toMap(Enum::name, ITEM_CATEGORY::getDescription)));
    }

    /** @return Translations for orb categories keyed by enum name. */
    @GetMapping("/orb-categories")
    public ResponseEntity<Map<String, String>> getOrbCategoryDictionary() {
        return ok(
                Arrays.stream(ORB_CATEGORY.values())
                        .collect(Collectors.toMap(Enum::name, ORB_CATEGORY::getDescription)));
    }

    /** @return Translations for drif categories keyed by enum name. */
    @GetMapping("/drif-categories")
    public ResponseEntity<Map<String, String>> getDrifCategoryDictionary() {
        return ok(
                Arrays.stream(DRIF_CATEGORY.values())
                        .collect(Collectors.toMap(Enum::name, DRIF_CATEGORY::getDescription)));
    }
}
