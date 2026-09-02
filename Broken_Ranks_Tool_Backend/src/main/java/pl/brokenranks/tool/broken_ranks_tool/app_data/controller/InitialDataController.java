package pl.brokenranks.tool.broken_ranks_tool.app_data.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.InitialDataDto;
import pl.brokenranks.tool.broken_ranks_tool.app_data.service.InitialDataService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InitialDataController {

    private final InitialDataService initialDataService;

    /**
     * Returns cached startup data required by the frontend.
     * @return HTTP 200 with item, orb, drif, rule, and dictionary data.
     */
    @GetMapping("/initial-data")
    @Cacheable("initialData")
    public ResponseEntity<InitialDataDto> getInitialData() {
        return ResponseEntity.ok(initialDataService.getInitialData());
    }
}
