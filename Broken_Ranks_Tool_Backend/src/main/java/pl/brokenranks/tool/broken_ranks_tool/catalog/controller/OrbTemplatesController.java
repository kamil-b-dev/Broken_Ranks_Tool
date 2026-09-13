package pl.brokenranks.tool.broken_ranks_tool.catalog.controller;

import static pl.brokenranks.tool.broken_ranks_tool.core.web.PublicDataResponse.ok;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.OrbTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;

/** Exposes API endpoints for retrieving orb templates. */
@RestController
@RequestMapping("/api/orbs")
@RequiredArgsConstructor
public class OrbTemplatesController {

    private final OrbTemplateRepository orbRepository;

    /** @return HTTP 200 with all orb templates. */
    @GetMapping
    @Cacheable("allOrbs")
    public ResponseEntity<List<OrbTemplateDto>> getAllOrbs() {
        return ok(orbRepository.findAll().stream().map(OrbTemplateDto::fromEntity).toList());
    }
}
