package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

class IntegralNumbersConfigTests {
    private final ObjectMapper mapper = mapper();

    private ObjectMapper mapper() {
        var builder = Jackson2ObjectMapperBuilder.json();
        new IntegralNumbersConfig().integralNumbers().customize(builder);
        return builder.build();
    }

    @Test
    void acceptsWholeDecimalsScientificNotationAndLegacyIntegerStrings() throws Exception {
        var request =
                mapper.readValue(
                        """
                {"characterStats":{"Siła":12.0},"slots":{"helmet":{"itemId":1e0,"itemStars":"9","drifIds":[92.0],"drifLevels":{"0":6.0}}}}
                """,
                        EquipmentRequest.class);
        assertThat(request.getCharacterStats()).containsEntry("Siła", 12);
        assertThat(request.getSlots().get("helmet").getItemId()).isEqualTo(1L);
        assertThat(request.getSlots().get("helmet").getItemStars()).isEqualTo(9);
    }

    @Test
    void rejectsFractionsAndOverflowInIdsStatsStarsAndStoneLevels() {
        for (String json :
                new String[] {
                    "{\"characterStats\":{\"Siła\":12.9}}",
                    "{\"slots\":{\"helmet\":{\"itemId\":1.9}}}",
                    "{\"slots\":{\"helmet\":{\"itemStars\":9.9}}}",
                    "{\"slots\":{\"helmet\":{\"drifLevels\":{\"0\":6.9}}}}",
                    "{\"characterStats\":{\"Siła\":2147483648.0}}",
                    "{\"slots\":{\"helmet\":{\"itemId\":9223372036854775808.0}}}"
                }) {
            assertThatThrownBy(() -> mapper.readValue(json, EquipmentRequest.class))
                    .isInstanceOf(JsonMappingException.class);
        }
    }

    @Test
    void appliesToPrimitiveRangesWhilePreservingFractionalPercentageTargets() throws Exception {
        assertThatThrownBy(
                        () ->
                                mapper.readValue(
                                        "{\"targetQuantities\":{\"CRITICAL_CHANCE\":{\"min\":1.9,\"max\":2}}}",
                                        OptimizationRequest.class))
                .isInstanceOf(JsonMappingException.class);
        var request =
                mapper.readValue(
                        "{\"targetQuantities\":{\"CRITICAL_CHANCE\":{\"min\":1.0,\"max\":2.0}},\"forcedPercentageTargets\":{\"CRITICAL_CHANCE\":12.5}}",
                        OptimizationRequest.class);
        assertThat(request.getForcedPercentageTargets())
                .containsEntry(
                        pl.brokenranks
                                .tool
                                .broken_ranks_tool
                                .equipment
                                .domain
                                .enums
                                .DRIF_BONUS_TYPE
                                .CRITICAL_CHANCE,
                        12.5);
    }
}
