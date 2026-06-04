package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.rules.EquipmentRulesRegistry;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/rules")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RulesController {

    private final EquipmentRulesRegistry registry;

    @GetMapping
    public Map<String, Object> getGameRules() {
        Map<String, Object> response = new HashMap<>();

        Map<String, String> translations = new HashMap<>();
        Map<String, Integer> drifBasePowers = new HashMap<>();

        for (ORB_BONUS_TYPE type : ORB_BONUS_TYPE.values()) {
            translations.put(type.name(), type.getName());
        }
        for (DRIF_BONUS_TYPE type : DRIF_BONUS_TYPE.values()) {
            translations.put(type.name(), type.getDescription());
            drifBasePowers.put(type.name(), type.getBasePower());
        }

        response.put("bonusTranslations", translations);
        response.put("drifBasePowers", drifBasePowers);
        response.put("slotOrbRules", registry.getSlotOrbRules());
        response.put("elementalTypes", registry.getElementalDamageTypes());

        response.put("epicBuiltInDrifs", EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS);

        return response;
    }
}