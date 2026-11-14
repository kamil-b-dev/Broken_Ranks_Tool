package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSearch.slotName;

import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorAction;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorAction.*;

/** Human-readable labels are derived from action data; identity and cost never depend on text. */
final class AdvisorActionRenderer {
    private final AdvisorEquipmentModel model;

    AdvisorActionRenderer(AdvisorEquipmentModel model) {
        this.model = model;
    }

    String render(AdvisorAction action) {
        return switch (action.type()) {
            case REPLACE_ITEM ->
                    "Zmień "
                            + slotName(action.slotKey())
                            + ": "
                            + model.templates.items().get(action.fromItemId()).getName()
                            + " → "
                            + model.templates.items().get(action.toItemId()).getName()
                            + " ("
                            + action.toStars()
                            + "★)";
            case UPGRADE_STARS ->
                    "Podnieś "
                            + slotName(action.slotKey())
                            + " ("
                            + model.templates.items().get(action.fromItemId()).getName()
                            + ") z "
                            + action.fromStars()
                            + "★ do "
                            + action.toStars()
                            + "★";
            case PURCHASE_DRIF ->
                    "Dodaj "
                            + label(action.drifs().getFirst(), true)
                            + " do "
                            + location(action.drifs().getFirst().to());
            case UPGRADE_DRIF -> upgrade(action.drifs().getFirst());
            case MOVE ->
                    "Przenieś "
                            + label(action.drifs().getFirst(), false)
                            + " z "
                            + location(action.drifs().getFirst().from())
                            + " do "
                            + location(action.drifs().getFirst().to());
            case SWAP ->
                    "Zamień "
                            + label(action.drifs().getFirst(), false)
                            + " ("
                            + location(action.drifs().getFirst().from())
                            + ") z "
                            + label(action.drifs().get(1), false)
                            + " ("
                            + location(action.drifs().get(1).from())
                            + ")";
        };
    }

    private String label(DrifChange stone, boolean purchased) {
        var drif = model.templates.drifs().get(purchased ? stone.drifId() : stone.fromDrifId());
        return drif.getSize()
                + " "
                + drif.getName()
                + " "
                + (purchased ? stone.toLevel() : stone.fromLevel());
    }

    private String upgrade(DrifChange stone) {
        String source = "Ulepsz " + label(stone, false) + " w " + location(stone.from());
        return stone.drifId().equals(stone.fromDrifId())
                ? source + " do poziomu " + stone.toLevel()
                : source + " na " + label(stone, true);
    }

    private String location(Location location) {
        return slotName(location.slotKey()) + ", gniazdo " + (location.socketIndex() + 1);
    }
}
