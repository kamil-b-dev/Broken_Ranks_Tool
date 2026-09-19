package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;

class AdvisorFinalistVerifierTests {
    @Test
    void expiredVerificationBudgetCannotProduceAProof() {
        AdvisorSearch search = mock(AdvisorSearch.class);
        when(search.exhaustive()).thenReturn(true);
        when(search.ranking()).thenReturn(Comparator.comparingInt(node -> node.actions().size()));
        AdvisorSearch.Node candidate =
                new AdvisorSearch.Node(Map.of(), new double[0], List.of("action"), Set.of(), 1, 0);

        AdvisorFinalistVerifier.Result result =
                new AdvisorFinalistVerifier()
                        .verify(
                                List.of(candidate),
                                mock(AdvisorEquipmentModel.class),
                                search,
                                mock(EquipmentStatsCalculatorService.class),
                                System.nanoTime() - 1);

        assertFalse(result.proofComplete());
        assertTrue(result.timeLimitReached());
        assertEquals(0, result.verifiedCandidates());
        assertEquals(1, result.candidateCount());
    }
}
