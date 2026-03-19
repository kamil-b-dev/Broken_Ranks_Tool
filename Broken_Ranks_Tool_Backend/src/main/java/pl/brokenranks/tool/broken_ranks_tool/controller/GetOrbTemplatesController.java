package pl.brokenranks.tool.broken_ranks_tool.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.repository.OrbTemplateRepository;

import java.util.List;

@RestController
@RequestMapping("/api/orbs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GetOrbTemplatesController {

    private final OrbTemplateRepository orbRepository;

    @GetMapping
    public List<OrbTemplate> getAllOrbs() {
        return orbRepository.findAll();
    }
}