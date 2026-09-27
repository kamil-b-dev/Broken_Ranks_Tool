package pl.brokenranks.tool.broken_ranks_tool.optimization.reference.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

@SpringBootTest
class FireMageEndgameFixtureTests {
    @Autowired private ItemTemplateRepository items;

    @Test
    void resolvesReviewedEquipmentAndGoalsFromTheCatalog() {
        FireMageEndgameFixture fixture = new FireMageEndgameFixture(items);
        var request = fixture.request();

        assertEquals(12, request.getOriginalSlots().size());
        request.getOriginalSlots().values().forEach(slot -> assertEquals(9, slot.getItemStars()));
        assertEquals(
                request.getOriginalSlots().get("ring1").getItemId(),
                request.getOriginalSlots().get("ring2").getItemId());
        assertEquals(
                new OptimizationRequest.QuantityRange(1, 1),
                request.getTargetQuantities().get(DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION));
        assertEquals(120.0, fixture.minimumValues().get(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED));
        assertEquals(
                java.util.List.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED),
                fixture.maximizationOrder());
    }
}
