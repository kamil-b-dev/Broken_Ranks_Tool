package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;

class AdvisorCatalogLoadingTests extends AdvisorOptimizationTestSupport {
    @Test
    void readsOnlyOwnedTemplatesOnceForMovesAndLevelUpgrades() {
        var owned = drif(10, A, "2%");
        owned.setIncrement("1%");
        var fixture =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 10, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "I", 10, 0)),
                        List.of(owned, drif(11, B, "3%")));
        var request = request(A, Map.of("helmet", slot(1, 1, 10L)));
        request.getAdvisor().getAllowedChanges().setDrifUpgrades(true);
        var result = fixture.service.optimize(request);

        assertTrue(result.getSummary().isSuccess());
        assertTrue(result.getAdvisorReport().verifiedCandidates() > 0);
        assertEquals(
                6, result.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
        verify(fixture.items).findAllById(List.of(1L));
        verify(fixture.drifs).findAllById(List.of(10L));
        verifyNoMoreInteractions(fixture.items, fixture.drifs);
        verifyNoInteractions(fixture.orbs);
        verify(fixture.calculator).prepareCalculationWithSources(any(), any(), any());
        verify(fixture.calculator, never()).calculateWithSources(any());
        assertEquals(
                fixture.calculator.calculateWithSources(result.getOptimizedSetup()),
                result.getCalculationResult());
    }

    @Test
    void loadsCandidateCatalogsWhenItemsAndPurchasesAreEnabled() {
        var fixture =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 10, 0),
                                item(2, ITEM_CATEGORY.HELMET, "I", 10, 20)),
                        List.of(drif(10, A, "2%")));
        var request = request(A, Map.of("helmet", slot(1, 1)));
        request.getAdvisor().getAllowedChanges().setItems(true);
        request.getAdvisor().getAllowedChanges().setDrifs(true);
        var result = fixture.service.optimize(request);

        assertTrue(result.getSummary().isSuccess());
        assertFalse(result.getSummary().getNextVariants().isEmpty());
        verify(fixture.items).findAll();
        verify(fixture.drifs).findAll();
        verifyNoMoreInteractions(fixture.items, fixture.drifs);
        verifyNoInteractions(fixture.orbs);
        for (var variant : result.getSummary().getNextVariants()) {
            assertEquals(
                    fixture.calculator.calculateWithSources(variant.setup()),
                    variant.calculationResult());
        }
    }
}
