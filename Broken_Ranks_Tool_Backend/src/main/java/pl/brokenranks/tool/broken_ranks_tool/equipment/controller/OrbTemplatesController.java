package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import org.springframework.cache.annotation.Cacheable;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;

import java.util.List;

/**
 * Udostępnia endpointy API do pobierania szablonów orbów.
 */
@RestController
@RequestMapping("/api/orbs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrbTemplatesController {

    private final OrbTemplateRepository orbRepository;

    /**
     * @return ResponseEntity z listą wszystkich szablonów orbów.
     */
    @GetMapping
    @Cacheable("allOrbs")
    public ResponseEntity<List<OrbTemplate>> getAllOrbs() {
        return ResponseEntity.ok(orbRepository.findAll());
    }
}
