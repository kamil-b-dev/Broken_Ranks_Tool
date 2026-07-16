package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DictionariesDto {
    private Map<String, String> itemCategories;
    private Map<String, String> orbCategories;
    private Map<String, String> drifCategories;
}
