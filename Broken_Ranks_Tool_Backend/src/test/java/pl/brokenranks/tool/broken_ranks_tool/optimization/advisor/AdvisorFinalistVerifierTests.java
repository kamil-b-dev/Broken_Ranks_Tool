package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
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
                                mock(EquipmentStatsCalculatorService.class)::calculateWithSources,
                                System.nanoTime() - 1);

        assertFalse(result.proofComplete());
        assertTrue(result.timeLimitReached());
        assertEquals(0, result.verifiedCandidates());
        assertEquals(1, result.candidateCount());
    }

    @Test
    void calculatorFinishingAfterDeadlineCannotProduceAProof() {
        AdvisorSearch search = exactSearch();
        CalculationResultDto calculation = mock(CalculationResultDto.class);
        when(calculation.stats()).thenReturn(Map.of());
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateWithSources(any())).thenReturn(calculation);
        AtomicInteger clockReads = new AtomicInteger();
        AdvisorFinalistVerifier verifier =
                new AdvisorFinalistVerifier(() -> clockReads.getAndIncrement() == 0 ? 0 : 2);

        AdvisorFinalistVerifier.Result result =
                verifier.verify(
                        List.of(candidate()),
                        mock(AdvisorEquipmentModel.class),
                        search,
                        calculator::calculateWithSources,
                        1);

        assertFalse(result.proofComplete());
        assertTrue(result.timeLimitReached());
        assertEquals(1, result.verifiedCandidates());
    }

    @Test
    void cancellationReturnsAnAuthoritativelyVerifiedPlanWithoutAnOptimalityProof() {
        AdvisorSearch search = exactSearch();
        when(search.cancelled()).thenReturn(true);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        CalculationResultDto calculation = mock(CalculationResultDto.class);
        when(calculation.stats()).thenReturn(Map.of());
        when(calculator.calculateWithSources(any())).thenReturn(calculation);

        AdvisorFinalistVerifier.Result result =
                new AdvisorFinalistVerifier(() -> 0)
                        .verify(
                                List.of(candidate()),
                                mock(AdvisorEquipmentModel.class),
                                search,
                                calculator::calculateWithSources,
                                1);

        assertFalse(result.proofComplete());
        assertFalse(result.timeLimitReached());
        assertEquals(1, result.verifiedCandidates());
        assertEquals(1, result.selected().size());
        assertSame(calculation, result.selected().getFirst().calculation());
        verify(calculator).calculateWithSources(any());
    }

    @Test
    void cancellationLimitsFinalVerificationToSixCandidates() {
        AdvisorSearch search = exactSearch();
        when(search.cancelled()).thenReturn(true);
        CalculationResultDto calculation = mock(CalculationResultDto.class);
        when(calculation.stats()).thenReturn(Map.of());
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateWithSources(any())).thenReturn(calculation);

        AdvisorFinalistVerifier.Result result =
                new AdvisorFinalistVerifier(() -> 0)
                        .verify(
                                IntStream.range(0, 20).mapToObj(index -> candidate()).toList(),
                                mock(AdvisorEquipmentModel.class),
                                search,
                                calculator::calculateWithSources,
                                1);

        assertFalse(result.proofComplete());
        assertEquals(6, result.verifiedCandidates());
        verify(calculator, times(6)).calculateWithSources(any());
    }

    @Test
    void cancellationDoesNotExtendTheVerificationDeadline() {
        AdvisorSearch search = exactSearch();
        when(search.cancelled()).thenReturn(true);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);

        AdvisorFinalistVerifier.Result result =
                new AdvisorFinalistVerifier(() -> 2)
                        .verify(
                                List.of(candidate()),
                                mock(AdvisorEquipmentModel.class),
                                search,
                                calculator::calculateWithSources,
                                1);

        assertFalse(result.proofComplete());
        assertTrue(result.timeLimitReached());
        assertEquals(0, result.verifiedCandidates());
        verifyNoInteractions(calculator);
    }

    private AdvisorSearch exactSearch() {
        AdvisorSearch search = mock(AdvisorSearch.class);
        when(search.exhaustive()).thenReturn(true);
        Comparator<AdvisorSearch.Node> ranking =
                Comparator.comparingInt(node -> node.actions().size());
        when(search.ranking()).thenReturn(ranking);
        when(search.minimumChangeRanking()).thenReturn(ranking);
        when(search.bestResultRanking()).thenReturn(ranking);
        when(search.deficit(any(double[].class))).thenReturn(0.0);
        when(search.gain(any(double[].class))).thenReturn(1.0);
        return search;
    }

    private AdvisorSearch.Node candidate() {
        return new AdvisorSearch.Node(Map.of(), new double[0], List.of("action"), Set.of(), 1, 0);
    }
}
