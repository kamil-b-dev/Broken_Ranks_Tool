package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.DrifTemplateRepository;

import java.util.List;

@RestController
@RequestMapping("/api/drifs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DrifTemplatesController {

    private final DrifTemplateRepository drifRepository;

    @GetMapping
    public List<DrifTemplate> getAllDrifs() {
        return drifRepository.findAll();
    }
}