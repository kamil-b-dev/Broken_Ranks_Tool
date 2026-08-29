package pl.brokenranks.tool.broken_ranks_tool.app_data.service;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.DictionariesDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

/** Creates user-facing dictionaries for equipment categories. */
@Component
public class DictionariesFactory {
    public DictionariesDto create() {
        return new DictionariesDto(
                enumMap(ITEM_CATEGORY.class, ITEM_CATEGORY::getDescription),
                enumMap(ORB_CATEGORY.class, ORB_CATEGORY::getDescription),
                enumMap(DRIF_CATEGORY.class, DRIF_CATEGORY::getDescription));
    }

    private <T extends Enum<T>> Map<String, String> enumMap(
            Class<T> enumClass, Function<T, String> description) {
        return Arrays.stream(enumClass.getEnumConstants())
                .collect(Collectors.toMap(Enum::name, description));
    }
}
