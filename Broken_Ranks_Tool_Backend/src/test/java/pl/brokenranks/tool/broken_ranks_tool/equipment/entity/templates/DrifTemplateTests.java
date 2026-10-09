package pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class DrifTemplateTests {
    @ParameterizedTest
    @ValueSource(strings = {"NaN", "Infinity", "1e309", "bad"})
    void catalogLoadValidationIdentifiesTheCorruptedTemplate(String value) {
        DrifTemplate template =
                DrifTemplate.builder().id(42L).baseValue(value).increment("1%").build();
        assertTrue(
                assertThrows(IllegalArgumentException.class, template::validateNumericValues)
                        .getMessage()
                        .contains("id=42"));
        template.setBaseValue("-2,5%");
        template.setIncrement("0,5%");
        assertDoesNotThrow(template::validateNumericValues);
    }
}
