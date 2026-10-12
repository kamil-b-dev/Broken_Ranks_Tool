package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

class ModifierValueRulesTests {
    @Test
    void negativeDirectionAndNaturalCapAreIndependentOfAnExplicitTarget() {
        var type = DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION;
        double directed = ModifierValueRules.directed(type, -80);
        assertEquals(80, directed);
        assertEquals(60, ModifierValueRules.bounded(directed, ModifierValueRules.naturalCap(type)));
        assertEquals(40, ModifierValueRules.bounded(directed, 40.0));
        assertEquals(80, ModifierValueRules.bounded(directed, null));
        assertEquals(30, ModifierValueRules.directed(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30));
        assertNull(ModifierValueRules.naturalCap(DRIF_BONUS_TYPE.DAMAGE_MAGIC));
    }

    @Test
    void calculatorPrecisionAndSupportedTextNumbersAreStable() {
        assertEquals(-1.24, ModifierValueRules.rounded(-1.235));
        assertEquals(0, ModifierValueRules.parse(null));
        assertEquals(0, ModifierValueRules.parse(" "));
        assertEquals(-1.25, ModifierValueRules.parse("-1,25%"));
        assertEquals(2, ModifierValueRules.parse("+2%"));
    }
}
