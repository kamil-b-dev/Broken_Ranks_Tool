package pl.brokenranks.tool.broken_ranks_tool.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GemRequest {
    private String name;
    private String bonusStat;
    private int bonusValue;
    private Long itemId;
}