package pl.brokenranks.tool.broken_ranks_tool.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.repository.DrifTemplateRepository;

import java.util.List;

@RestController
@RequestMapping("/api/drifs") // <--- Adres dla drifów
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GetDrifTemplatesController {

    private final DrifTemplateRepository drifRepository;

    @GetMapping
    public List<DrifTemplate> getAllDrifs() {
        return drifRepository.findAll();
    }
}