package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Placement;

/** Restores an exported optimizer build as a CP-SAT starting hint. */
@RequiredArgsConstructor
public final class BuildStateJsonHintLoader {
    private final ObjectMapper objectMapper;

    public BuildState load(String json, OptimizationContext context) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        JsonNode slots = root.at("/build/requestData/slots");
        if (slots.isMissingNode()) slots = root.at("/requestData/slots");
        if (!slots.isObject()) {
            throw new IllegalArgumentException("Build hint does not contain requestData.slots");
        }

        BuildState result = new BuildState();
        for (var slot : context.slots()) {
            JsonNode slotNode = slots.path(slot.key());
            JsonNode ids = slotNode.path("drifIds");
            JsonNode levels = slotNode.path("drifLevels");
            List<Placement> placements = new ArrayList<>();
            if (ids.isArray()) {
                for (int index = 0; index < ids.size(); index++) {
                    JsonNode idNode = ids.get(index);
                    if (idNode == null || idNode.isNull()) {
                        placements.add(null);
                        continue;
                    }
                    long id = idNode.asLong();
                    var drif = context.drifs().get(id);
                    if (drif == null) {
                        throw new IllegalArgumentException("Unknown drif in build hint: " + id);
                    }
                    placements.add(
                            new Placement(
                                    drif, levels.path(String.valueOf(index)).asInt(1), false));
                }
            }
            while (placements.size() < slot.maxDrifs()) placements.add(null);
            result.putSlot(slot.key(), placements);
        }
        return result;
    }
}
