package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.DrifTemplateRepository;

import java.util.List;

/**
 * Udostępnia endpointy API do pobierania szablonów drifów.
 */
@RestController
@RequestMapping("/api/drifs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DrifTemplatesController {

    private final DrifTemplateRepository drifRepository;

    /**
     * @return ResponseEntity z listą wszystkich szablonów drifów.
     */
    @GetMapping
    @Cacheable("allDrifs")
    public ResponseEntity<List<DrifTemplate>> getAllDrifs() {
        return ResponseEntity.ok(drifRepository.findAll());
    }
}
