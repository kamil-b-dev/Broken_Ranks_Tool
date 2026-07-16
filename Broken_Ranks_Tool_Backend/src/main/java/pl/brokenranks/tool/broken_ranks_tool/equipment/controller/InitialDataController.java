package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.InitialDataDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.InitialDataService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InitialDataController {

    private final InitialDataService initialDataService;

    /**
     * Zwraca wszystkie dane potrzebne do inicjalizacji aplikacji na frontendzie.
     * Wynik jest cachowany, aby zapewnić szybką odpowiedź przy kolejnych żądaniach.
     *
     * @return ResponseEntity z obiektem DTO zawierającym wszystkie dane startowe.
     */
    @GetMapping("/initial-data")
    @Cacheable("initialData")
    public ResponseEntity<InitialDataDto> getInitialData() {
        return ResponseEntity.ok(initialDataService.getInitialData());
    }
}
