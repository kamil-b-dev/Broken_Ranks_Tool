package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

/** Rejects orb combinations that violate item integrity constraints. */
@Component
@Slf4j
public class OrbSecurityValidator {

    public void validate(ItemTemplate item, List<OrbTemplate> orbs) {
        if (orbs == null || orbs.isEmpty()) return;
        if (orbs.size() > 1 && item.getRarity() != RARITY.LEGENDARY) {
            throw new IllegalArgumentException(
                    "Tylko przedmioty legendarne mogą mieć więcej niż jeden orb.");
        }
        if (orbs.size() > 2)
            throw new IllegalArgumentException("Przedmiot nie może mieć więcej niż dwóch orbów.");
        Set<ORB_BONUS_TYPE> bonuses =
                orbs.stream().map(OrbTemplate::getBonusType).collect(Collectors.toSet());
        if (bonuses.size() < orbs.size()) {
            log.error("[SECURITY] Wykryto próbę użycia dwóch orbów z tym samym bonusem.");
            throw new IllegalArgumentException("Nie można użyć dwóch orbów z tym samym bonusem.");
        }
    }
}
