package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.ArrayList;
import java.util.List;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorAction;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorAction.*;

/** Merges repeated upgrades of one occurrence and moves its final upgrade after intervening moves. */
final class AdvisorActionSequence {
    List<AdvisorAction> append(List<AdvisorAction> previous, AdvisorAction next) {
        List<AdvisorAction> result = new ArrayList<>(previous);
        if (next.type() == Type.UPGRADE_DRIF) {
            DrifChange upgrade = next.drifs().getFirst();
            for (int index = 0; index < result.size(); index++) {
                AdvisorAction earlier = result.get(index);
                if (earlier.type() != Type.UPGRADE_DRIF
                        || !earlier.drifs().getFirst().identity().equals(upgrade.identity()))
                    continue;
                int initialLevel = earlier.drifs().getFirst().fromLevel();
                result.remove(index);
                for (int position = index; position < result.size(); position++) {
                    AdvisorAction action = result.get(position);
                    List<DrifChange> stones =
                            action.drifs().stream()
                                    .map(
                                            stone ->
                                                    stone.identity().equals(upgrade.identity())
                                                            ? new DrifChange(
                                                                    stone.identity(),
                                                                    stone.drifId(),
                                                                    stone.from(),
                                                                    stone.to(),
                                                                    initialLevel,
                                                                    initialLevel)
                                                            : stone)
                                    .toList();
                    result.set(position, withStones(action, stones));
                }
                next =
                        withStones(
                                next,
                                List.of(
                                        new DrifChange(
                                                upgrade.identity(),
                                                upgrade.drifId(),
                                                upgrade.from(),
                                                upgrade.to(),
                                                initialLevel,
                                                upgrade.toLevel())));
                break;
            }
        }
        result.add(next);
        return List.copyOf(result);
    }

    private AdvisorAction withStones(AdvisorAction action, List<DrifChange> stones) {
        return new AdvisorAction(
                action.type(),
                action.slotKey(),
                action.fromItemId(),
                action.toItemId(),
                action.fromStars(),
                action.toStars(),
                stones);
    }
}
