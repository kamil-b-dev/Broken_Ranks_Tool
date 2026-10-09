package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Reads the supported exported configuration without dropping its hard constraints. */
public final class RealBuildOracleInput {
    private final ObjectMapper objectMapper;

    public RealBuildOracleInput(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public OptimizationRequest read(Path buildPath, Path configPath) throws Exception {
        JsonNode buildRoot = objectMapper.readTree(Files.readString(buildPath)).path("build");
        JsonNode requestData = buildRoot.path("requestData");
        JsonNode configRoot = objectMapper.readTree(Files.readString(configPath));
        Map<String, EquipmentRequest.SlotData> slots =
                objectMapper.convertValue(
                        requestData.path("slots"),
                        new TypeReference<Map<String, EquipmentRequest.SlotData>>() {});
        Map<String, Integer> characterStats =
                objectMapper.convertValue(
                        requestData.path("characterStats"),
                        new TypeReference<Map<String, Integer>>() {});

        JsonNode settings = configRoot.path("settings");
        if (!settings.path("mode").asText("BUILD_FROM_SCRATCH").equals("BUILD_FROM_SCRATCH")
                || !settings.path("configurationMode").asText("ADVANCED").equals("ADVANCED")) {
            throw new IllegalArgumentException(
                    "The exact build oracle accepts only BUILD_FROM_SCRATCH / ADVANCED configurations");
        }
        Map<DRIF_BONUS_TYPE, Map<DRIF_SIZE, OptimizationRequest.QuantityRange>> sizeQuantities =
                new LinkedHashMap<>();
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> quantities = new LinkedHashMap<>();
        Set<DRIF_BONUS_TYPE> caps = new LinkedHashSet<>();
        Set<DRIF_BONUS_TYPE> maximized = new LinkedHashSet<>();
        Map<DRIF_BONUS_TYPE, Double> percentages = new LinkedHashMap<>();
        for (JsonNode priority : configRoot.path("priorities")) {
            DRIF_BONUS_TYPE type = DRIF_BONUS_TYPE.valueOf(priority.path("key").asText());
            Map<DRIF_SIZE, OptimizationRequest.QuantityRange> sizes = new LinkedHashMap<>();
            priority.path("sizeRanges")
                    .properties()
                    .forEach(
                            entry ->
                                    sizes.put(
                                            DRIF_SIZE.valueOf(entry.getKey()),
                                            objectMapper.convertValue(
                                                    entry.getValue(),
                                                    OptimizationRequest.QuantityRange.class)));
            if (!sizes.isEmpty()) sizeQuantities.put(type, sizes);
            priorities.put(type, priority.path("weight").asInt());
            quantities.put(
                    type,
                    new OptimizationRequest.QuantityRange(
                            priority.path("min").asInt(), priority.path("max").asInt()));
            if (priority.path("forceCap").asBoolean()) caps.add(type);
            if (priority.path("maximize").asBoolean()) maximized.add(type);
            if (priority.path("forcePercentage").asBoolean()) {
                percentages.put(type, priority.path("forcedPercentage").asDouble());
            }
        }

        OptimizationRequest request = new OptimizationRequest();
        request.setMode(OptimizationMode.BUILD_FROM_SCRATCH);
        request.setConfigurationMode(BuildConfigurationMode.ADVANCED);
        request.setOriginalSlots(slots);
        request.setCharacterStats(characterStats);
        request.setPriorities(priorities);
        request.setTargetQuantities(quantities);
        request.setDrifSizeQuantities(sizeQuantities);
        request.setForceCapBonuses(caps);
        request.setMaximizeBonuses(maximized);
        request.setForcedPercentageTargets(percentages);
        request.setLockedSlots(stringSet(buildRoot.path("lockedSlots")));
        request.setLockedDrifs(lockedDrifs(buildRoot.path("lockedDrifs")));
        request.setMaxVariantLossPercent(100);
        return request;
    }

    private Set<String> stringSet(JsonNode node) {
        Set<String> values = new LinkedHashSet<>();
        node.forEach(value -> values.add(value.asText()));
        return values;
    }

    private Map<String, Set<Integer>> lockedDrifs(JsonNode node) {
        Map<String, Set<Integer>> result = new LinkedHashMap<>();
        node.properties()
                .forEach(
                        entry -> {
                            Set<Integer> indexes = new LinkedHashSet<>();
                            entry.getValue().forEach(value -> indexes.add(value.asInt()));
                            result.put(entry.getKey(), indexes);
                        });
        return result;
    }
}
