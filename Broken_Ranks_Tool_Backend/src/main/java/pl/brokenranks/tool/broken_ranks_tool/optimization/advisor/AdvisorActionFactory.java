package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSlotData.*;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorAction;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorAction.*;

/** Describes an already validated single transition without parsing message text. */
final class AdvisorActionFactory {
    AdvisorAction create(AdvisorSearch.Node parent, Map<String, SlotData> after) {
        List<Stone> removed = new ArrayList<>(), added = new ArrayList<>();
        for (String key : after.keySet().stream().sorted().toList()) {
            SlotData before = parent.slots().get(key), next = after.get(key);
            if (!Objects.equals(before.getItemId(), next.getItemId()))
                return new AdvisorAction(
                        Type.REPLACE_ITEM,
                        key,
                        before.getItemId(),
                        next.getItemId(),
                        stars(before),
                        stars(next),
                        List.of());
            if (stars(before) != stars(next))
                return new AdvisorAction(
                        Type.UPGRADE_STARS,
                        key,
                        before.getItemId(),
                        next.getItemId(),
                        stars(before),
                        stars(next),
                        List.of());
            for (int i = 0; i < Math.max(size(before), size(next)); i++) {
                if (Objects.equals(id(before, i), id(next, i))
                        && (id(before, i) == null || level(before, i) == level(next, i))) continue;
                if (id(before, i) != null)
                    removed.add(new Stone(new Location(key, i), id(before, i), level(before, i)));
                if (id(next, i) != null)
                    added.add(new Stone(new Location(key, i), id(next, i), level(next, i)));
            }
        }
        List<DrifChange> changes = new ArrayList<>();
        for (Stone stone : removed) {
            Stone destination =
                    added.stream()
                            .filter(next -> next.id.equals(stone.id) && next.level == stone.level)
                            .findFirst()
                            .orElseGet(
                                    () ->
                                            added.stream()
                                                    .filter(
                                                            next ->
                                                                    next.id.equals(stone.id)
                                                                            && next.location.equals(
                                                                                    stone.location))
                                                    .findFirst()
                                                    .orElse(null));
            if (destination == null)
                throw new IllegalArgumentException("Advisor cannot remove a drif");
            added.remove(destination);
            changes.add(
                    new DrifChange(
                            identity(parent, stone.location, stone.id),
                            stone.id,
                            stone.location,
                            destination.location,
                            stone.level,
                            destination.level));
        }
        for (Stone purchased : added)
            changes.add(
                    new DrifChange(
                            "purchase:"
                                    + parent.actions().size()
                                    + ":"
                                    + purchased.location.slotKey()
                                    + ":"
                                    + purchased.location.socketIndex(),
                            purchased.id,
                            null,
                            purchased.location,
                            null,
                            purchased.level));
        if (changes.isEmpty()) throw new IllegalArgumentException("Empty advisor action");
        Type type =
                changes.getFirst().from() == null
                        ? Type.PURCHASE_DRIF
                        : changes.size() > 1
                                ? Type.SWAP
                                : changes.getFirst().from().equals(changes.getFirst().to())
                                        ? Type.UPGRADE_DRIF
                                        : Type.MOVE;
        return new AdvisorAction(
                type, changes.getFirst().to().slotKey(), null, null, null, null, changes);
    }

    String identity(AdvisorSearch.Node parent, Location location, Long id) {
        for (AdvisorAction action : parent.actionDetails().reversed()) {
            for (DrifChange change : action.drifs()) {
                if (location.equals(change.to()) && id.equals(change.drifId()))
                    return change.identity();
            }
        }
        return "initial:" + location.slotKey() + ":" + location.socketIndex();
    }

    private record Stone(Location location, Long id, int level) {}
}
