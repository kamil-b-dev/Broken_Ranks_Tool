package pl.brokenranks.tool.broken_ranks_tool.catalog.controller;

import static pl.brokenranks.tool.broken_ranks_tool.core.web.PublicDataResponse.ok;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.brokenranks.tool.broken_ranks_tool.catalog.service.DictionariesFactory;

/** Exposes API endpoints for the core translation dictionaries. */
@RestController
@RequestMapping("/api/dictionaries")
@RequiredArgsConstructor
public class DictionaryController {
    private final DictionariesFactory dictionariesFactory;

    /** @return Translations for item categories keyed by enum name. */
    @GetMapping("/categories")
    public ResponseEntity<Map<String, String>> getCategoryDictionary() {
        return ok(dictionariesFactory.itemCategories());
    }

    /** @return Translations for orb categories keyed by enum name. */
    @GetMapping("/orb-categories")
    public ResponseEntity<Map<String, String>> getOrbCategoryDictionary() {
        return ok(dictionariesFactory.orbCategories());
    }

    /** @return Translations for drif categories keyed by enum name. */
    @GetMapping("/drif-categories")
    public ResponseEntity<Map<String, String>> getDrifCategoryDictionary() {
        return ok(dictionariesFactory.drifCategories());
    }
}
