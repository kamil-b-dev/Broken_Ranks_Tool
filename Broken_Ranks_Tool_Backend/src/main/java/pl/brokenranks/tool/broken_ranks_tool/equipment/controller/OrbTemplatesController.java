package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import org.springframework.cache.annotation.Cacheable;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.OrbTemplateRepository;

import java.util.List;

@RestController
@RequestMapping("/api/orbs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrbTemplatesController {

    private final OrbTemplateRepository orbRepository;

    @GetMapping
    @Cacheable("allOrbs")
    public List<OrbTemplate> getAllOrbs() {
        return orbRepository.findAll();
    }
}