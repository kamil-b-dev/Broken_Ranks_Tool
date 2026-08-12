package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.DrifTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;

import java.util.List;
import java.util.stream.Collectors;

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
     * @return ResponseEntity z listą wszystkich szablonów drifów jako DTO.
     */
    @GetMapping
    @Cacheable("allDrifs")
    public ResponseEntity<List<DrifTemplateDto>> getAllDrifs() {
        List<DrifTemplateDto> drifDtos = drifRepository.findAll().stream()
                .map(DrifTemplateDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(drifDtos);
    }
}
