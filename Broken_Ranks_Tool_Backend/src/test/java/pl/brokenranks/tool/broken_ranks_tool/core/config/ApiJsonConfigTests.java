package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class ApiJsonConfigTests {
    private final ObjectMapper mapper = mapper();

    private ObjectMapper mapper() {
        var builder = JsonMapper.builder();
        new IntegralNumbersConfig().integralNumbers().customize(builder);
        new ApiJsonConfig().apiJsonContract().customize(builder);
        return builder.build();
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "{\"mode\":0}",
                "{\"mode\":0.0}",
                "{\"simpleProfile\":\"\"}",
                "{\"priorities\":{\"12\":15}}",
                "{\"mode\":\"0\"}",
                "{\"configurationMode\":1}",
                "{\"advisor\":{\"goal\":12}}",
                "{\"advisor\":{\"goal\":\"12\"}}",
                "{\"advisor\":{\"purchaseScope\":0}}",
                "{\"advisor\":{\"strategy\":1}}",
                "{\"simpleOptions\":{\"style\":0}}"
            })
    void rejectsEnumIndexesIncludingNumericStrings(String json) {
        assertThatThrownBy(() -> mapper.readValue(json, OptimizationRequest.class))
                .isInstanceOf(JacksonException.class);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "{\"unexpected\":true}",
                "{\"originalSlots\":{\"helmet\":{\"unexpected\":true}}}",
                "{\"advisor\":{\"allowedChanges\":{\"unknown\":true}}}",
                "{\"simplePreferredQuantities\":{\"CRITICAL_CHANCE\":1}}"
            })
    void rejectsUnknownAndServerOnlyFields(String json) {
        assertThatThrownBy(() -> mapper.readValue(json, OptimizationRequest.class))
                .isInstanceOf(JacksonException.class);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "{\"slots\":{},\"slots\":{}}",
                "{\"slots\":{},\"characterStats\":{\"Siła\":1,\"Siła\":2}}"
            })
    void rejectsDuplicateKeysAtEveryDepth(String json) {
        assertThatThrownBy(() -> mapper.readValue(json, EquipmentRequest.class))
                .isInstanceOf(JacksonException.class);
    }

    @Test
    void preservesNamedEnumsBooleanConversionsAndLegacyNumericValues() {
        var request =
                mapper.readValue(
                        """
                {"mode":"ADVISOR","generateVariants":0,"forceMaximizationByDrifBonus":"false",
                 "originalSlots":{"helmet":{"itemId":"13","itemStars":"9"}},
                 "advisor":{"goal":"CRITICAL_CHANCE","allowedChanges":{"stars":1}}}
                """,
                        OptimizationRequest.class);
        assertThat(request.getMode().name()).isEqualTo("ADVISOR");
        assertThat(request.isGenerateVariants()).isFalse();
        assertThat(request.isForceMaximizationByDrifBonus()).isFalse();
        assertThat(request.getOriginalSlots().get("helmet").getItemId()).isEqualTo(13L);
        assertThat(request.getAdvisor().getAllowedChanges().isStars()).isTrue();
    }
}
