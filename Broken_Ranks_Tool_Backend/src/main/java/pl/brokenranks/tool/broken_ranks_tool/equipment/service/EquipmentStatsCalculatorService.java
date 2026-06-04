package pl.brokenranks.tool.broken_ranks_tool.equipment.service;

import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import java.util.Map;

public interface EquipmentStatsCalculatorService {

    Map<String, String> calculateTotalStats(EquipmentRequest request);

}