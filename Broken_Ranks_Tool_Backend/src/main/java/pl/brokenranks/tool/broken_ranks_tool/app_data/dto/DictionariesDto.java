package pl.brokenranks.tool.broken_ranks_tool.app_data.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Groups the translation maps required to initialize the frontend. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DictionariesDto {
    /** Translations for item categories, keyed by enum name. */
    private Map<String, String> itemCategories;

    /** Translations for orb categories, keyed by enum name. */
    private Map<String, String> orbCategories;

    /** Translations for drif categories, keyed by enum name. */
    private Map<String, String> drifCategories;
}
