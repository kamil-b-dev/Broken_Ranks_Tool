package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_PROFILE;

class ItemProfileClassifierTests {

    @Test
    void classifiesPhysicalAndMagicalAttributeSets() {
        assertThat(ItemProfileClassifier.classify(ITEM_CATEGORY.ARMOR, Map.of("Siła", 20.0)))
                .isEqualTo(ITEM_PROFILE.PHYSICAL);
        assertThat(ItemProfileClassifier.classify(ITEM_CATEGORY.HELMET, Map.of("Wiedza", 20.0)))
                .isEqualTo(ITEM_PROFILE.MAGICAL);
    }

    @Test
    void classifiesMixedAndAttributeFreeItemsAsUniversal() {
        assertThat(
                        ItemProfileClassifier.classify(
                                ITEM_CATEGORY.RING, Map.of("Zręczność", 20.0, "Wiedza", 20.0)))
                .isEqualTo(ITEM_PROFILE.UNIVERSAL);
        assertThat(ItemProfileClassifier.classify(ITEM_CATEGORY.NECKLACE, Map.of("PŻ", 200.0)))
                .isEqualTo(ITEM_PROFILE.UNIVERSAL);
    }

    @Test
    void keepsEveryWeaponProfileUnspecifiedRegardlessOfAttributes() {
        assertThat(
                        ItemProfileClassifier.classify(
                                ITEM_CATEGORY.WEAPON_1H, Map.of("Siła", 20.0, "Moc", 20.0)))
                .isEqualTo(ITEM_PROFILE.UNSPECIFIED);
        assertThat(ItemProfileClassifier.classify(ITEM_CATEGORY.WEAPON_RANGED, Map.of()))
                .isEqualTo(ITEM_PROFILE.UNSPECIFIED);
    }
}
