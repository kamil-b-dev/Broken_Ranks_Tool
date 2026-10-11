package pl.brokenranks.tool.broken_ranks_tool.optimization.controller;

import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorRunRegistry;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/optimizer/advisor")
@RequiredArgsConstructor
public class AdvisorCancellationController {
    static final String CANCELLATION_TOKEN_HEADER = "X-Advisor-Cancellation-Token";

    private final AdvisorRunRegistry runs;

    @PostMapping("/{runId}/cancel")
    public Map<String, Boolean> cancel(
            @PathVariable String runId,
            @RequestHeader(CANCELLATION_TOKEN_HEADER) String cancellationToken,
            @RequestBody(required = false) JsonNode body) {
        String id = canonicalUuid(runId);
        String token = canonicalUuid(cancellationToken);
        if (body != null && !body.isNull()) {
            throw new IllegalArgumentException("Anulowanie wymaga pustej treści albo JSON null.");
        }
        return Map.of("cancelled", runs.cancel(id, token));
    }

    private String canonicalUuid(String value) {
        if (value == null
                || !value.matches(
                        "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
            throw new IllegalArgumentException(
                    "Identyfikator i sekret anulowania muszą być pełnymi UUID.");
        }
        return UUID.fromString(value).toString();
    }
}
