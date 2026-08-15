package pl.brokenranks.tool.broken_ranks_tool.optimization.constraints;

import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Applies user locks so optimization changes only unlocked equipment elements. */
@Component
public class OptimizationLockService {

    /**
     * Applies locks to an independent copy of the candidate equipment setup.
     * @param originalSlots User's original equipment setup.
     * @param candidateSlots Setup produced by the optimizer.
     * @param request Optimization request containing lock definitions.
     * @return Candidate setup with locked values preserved.
     */
    public Map<String, EquipmentRequest.SlotData> enforce(
            Map<String, EquipmentRequest.SlotData> originalSlots,
            Map<String, EquipmentRequest.SlotData> candidateSlots,
            OptimizationRequest request) {

        Map<String, EquipmentRequest.SlotData> result = deepCopySlots(candidateSlots);
        if (originalSlots == null || request == null) {
            return result;
        }

        Set<String> lockedSlots = request.getLockedSlots() != null
                ? request.getLockedSlots()
                : Set.of();

        for (String slotKey : lockedSlots) {
            EquipmentRequest.SlotData original = originalSlots.get(slotKey);
            if (original != null) {
                result.put(slotKey, copySlot(original));
            }
        }

        Map<String, Set<Integer>> lockedDrifs = request.getLockedDrifs() != null
                ? request.getLockedDrifs()
                : Map.of();

        for (Map.Entry<String, Set<Integer>> entry : lockedDrifs.entrySet()) {
            String slotKey = entry.getKey();
            if (lockedSlots.contains(slotKey)) {
                continue;
            }

            EquipmentRequest.SlotData original = originalSlots.get(slotKey);
            EquipmentRequest.SlotData candidate = result.get(slotKey);
            if (original == null || candidate == null || entry.getValue() == null) {
                continue;
            }

            preserveLockedDrifs(original, candidate, entry.getValue());
        }

        return result;
    }

    /**
     * Verifies that the candidate did not change any locked element.
     * @param originalSlots User's original equipment setup.
     * @param candidateSlots Setup produced by the optimizer.
     * @param request Optimization request containing lock definitions.
     * @return Whether all locked values are unchanged.
     */
    public boolean isValid(
            Map<String, EquipmentRequest.SlotData> originalSlots,
            Map<String, EquipmentRequest.SlotData> candidateSlots,
            OptimizationRequest request) {

        Map<String, EquipmentRequest.SlotData> enforced = enforce(originalSlots, candidateSlots, request);
        return slotsEqual(enforced, candidateSlots, request);
    }

    private void preserveLockedDrifs(
            EquipmentRequest.SlotData original,
            EquipmentRequest.SlotData candidate,
            Set<Integer> lockedIndices) {

        List<Long> originalIds = original.getDrifIds() != null ? original.getDrifIds() : List.of();
        List<Long> candidateIds = candidate.getDrifIds() != null
                ? new ArrayList<>(candidate.getDrifIds())
                : new ArrayList<>();

        Map<String, Integer> originalLevels = original.getDrifLevels() != null
                ? original.getDrifLevels()
                : Map.of();
        Map<String, Integer> candidateLevels = candidate.getDrifLevels() != null
                ? new HashMap<>(candidate.getDrifLevels())
                : new HashMap<>();

        for (Integer index : lockedIndices) {
            if (index == null || index < 0 || index >= originalIds.size()) {
                continue;
            }

            ensureSize(candidateIds, index + 1);
            candidateIds.set(index, originalIds.get(index));

            String levelKey = String.valueOf(index);
            if (originalLevels.containsKey(levelKey)) {
                candidateLevels.put(levelKey, originalLevels.get(levelKey));
            } else {
                candidateLevels.remove(levelKey);
            }
        }

        candidate.setDrifIds(candidateIds);
        candidate.setDrifLevels(candidateLevels);
    }

    private boolean slotsEqual(
            Map<String, EquipmentRequest.SlotData> expected,
            Map<String, EquipmentRequest.SlotData> actual,
            OptimizationRequest request) {

        if (actual == null || request == null) {
            return false;
        }

        Set<String> lockedSlots = request.getLockedSlots() != null
                ? request.getLockedSlots()
                : Set.of();
        for (String slotKey : lockedSlots) {
            if (!slotEquals(expected.get(slotKey), actual.get(slotKey))) {
                return false;
            }
        }

        Map<String, Set<Integer>> lockedDrifs = request.getLockedDrifs() != null
                ? request.getLockedDrifs()
                : Map.of();
        for (Map.Entry<String, Set<Integer>> entry : lockedDrifs.entrySet()) {
            EquipmentRequest.SlotData expectedSlot = expected.get(entry.getKey());
            EquipmentRequest.SlotData actualSlot = actual.get(entry.getKey());
            if (expectedSlot == null || actualSlot == null) {
                return false;
            }
            for (Integer index : entry.getValue() != null ? entry.getValue() : Set.<Integer>of()) {
                if (index == null || !java.util.Objects.equals(
                        valueAt(expectedSlot.getDrifIds(), index),
                        valueAt(actualSlot.getDrifIds(), index))) {
                    return false;
                }
                Integer expectedLevel = levelAt(expectedSlot.getDrifLevels(), index);
                Integer actualLevel = levelAt(actualSlot.getDrifLevels(), index);
                if (expectedLevel == null ? actualLevel != null : !expectedLevel.equals(actualLevel)) {
                    return false;
                }
            }
        }
        return true;
    }

    private Map<String, EquipmentRequest.SlotData> deepCopySlots(
            Map<String, EquipmentRequest.SlotData> slots) {
        Map<String, EquipmentRequest.SlotData> copy = new HashMap<>();
        if (slots != null) {
            slots.forEach((key, value) -> copy.put(key, copySlot(value)));
        }
        return copy;
    }

    private EquipmentRequest.SlotData copySlot(EquipmentRequest.SlotData source) {
        if (source == null) {
            return null;
        }
        EquipmentRequest.SlotData copy = new EquipmentRequest.SlotData();
        copy.setItemId(source.getItemId());
        copy.setItemStars(source.getItemStars());
        copy.setOrbIds(source.getOrbIds() != null ? new ArrayList<>(source.getOrbIds()) : null);
        copy.setOrbLevels(source.getOrbLevels() != null ? new ArrayList<>(source.getOrbLevels()) : null);
        copy.setDrifIds(source.getDrifIds() != null ? new ArrayList<>(source.getDrifIds()) : null);
        copy.setDrifLevels(source.getDrifLevels() != null ? new HashMap<>(source.getDrifLevels()) : null);
        return copy;
    }

    private void ensureSize(List<Long> values, int size) {
        while (values.size() < size) {
            values.add(null);
        }
    }

    private boolean slotEquals(EquipmentRequest.SlotData first, EquipmentRequest.SlotData second) {
        if (first == null || second == null) {
            return first == second;
        }
        return java.util.Objects.equals(first.getItemId(), second.getItemId())
                && java.util.Objects.equals(first.getItemStars(), second.getItemStars())
                && java.util.Objects.equals(first.getOrbIds(), second.getOrbIds())
                && java.util.Objects.equals(first.getOrbLevels(), second.getOrbLevels())
                && java.util.Objects.equals(first.getDrifIds(), second.getDrifIds())
                && java.util.Objects.equals(first.getDrifLevels(), second.getDrifLevels());
    }

    private Long valueAt(List<Long> values, int index) {
        return values != null && index >= 0 && index < values.size() ? values.get(index) : null;
    }

    private Integer levelAt(Map<String, Integer> levels, int index) {
        return levels != null ? levels.get(String.valueOf(index)) : null;
    }
}
