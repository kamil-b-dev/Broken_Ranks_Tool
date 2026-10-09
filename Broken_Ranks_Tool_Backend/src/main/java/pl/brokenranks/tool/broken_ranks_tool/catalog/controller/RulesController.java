package pl.brokenranks.tool.broken_ranks_tool.catalog.controller;

import static pl.brokenranks.tool.broken_ranks_tool.core.web.PublicDataResponse.ok;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.brokenranks.tool.broken_ranks_tool.catalog.service.GameRulesFactory;

/** Exposes the API endpoint for global game rules and dictionaries. */
@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class RulesController {

    private final GameRulesFactory gameRulesFactory;

    /** @return HTTP 200 with aggregated game rules and translation dictionaries. */
    @GetMapping
    @Cacheable("gameRules")
    public ResponseEntity<Map<String, Object>> getGameRules() {
        return ok(gameRulesFactory.createPublicRules());
    }
}
