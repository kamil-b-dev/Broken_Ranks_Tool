package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;

/** Exposes the API endpoint for global game rules and dictionaries. */
@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class RulesController {

    private final EquipmentRulesRegistry registry;

    /** @return HTTP 200 with aggregated game rules and translation dictionaries. */
    @GetMapping
    @Cacheable("gameRules")
    public ResponseEntity<Map<String, Object>> getGameRules() {
        Map<String, Object> response = new HashMap<>();

        Map<String, String> orbTranslations =
                Arrays.stream(ORB_BONUS_TYPE.values())
                        .collect(Collectors.toMap(Enum::name, ORB_BONUS_TYPE::getDescription));

        Map<String, String> drifTranslations =
                Arrays.stream(DRIF_BONUS_TYPE.values())
                        .collect(Collectors.toMap(Enum::name, DRIF_BONUS_TYPE::getDescription));

        Map<String, String> allTranslations =
                Stream.concat(
                                orbTranslations.entrySet().stream(),
                                drifTranslations.entrySet().stream())
                        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        Map<String, Integer> drifBasePowers =
                Arrays.stream(DRIF_BONUS_TYPE.values())
                        .collect(Collectors.toMap(Enum::name, DRIF_BONUS_TYPE::getBasePower));

        response.put("bonusTranslations", allTranslations);
        response.put("drifBasePowers", drifBasePowers);
        response.put("slotOrbRules", registry.getSlotOrbRules());
        response.put("elementalTypes", registry.getElementalDamageTypes());
        response.put("epicBuiltInDrifs", EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS);

        return ResponseEntity.ok(response);
    }
}
