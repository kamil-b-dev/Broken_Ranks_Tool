package pl.brokenranks.tool.broken_ranks_tool.optimization.controller;

import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorRunRegistry;

@RestController
@RequestMapping("/api/optimizer/advisor")
@RequiredArgsConstructor
public class AdvisorCancellationController {
    private final AdvisorRunRegistry runs;

    @PostMapping("/{runId}/cancel")
    public Map<String, Boolean> cancel(@PathVariable UUID runId) {
        return Map.of("cancelled", runs.cancel(runId.toString()));
    }
}
