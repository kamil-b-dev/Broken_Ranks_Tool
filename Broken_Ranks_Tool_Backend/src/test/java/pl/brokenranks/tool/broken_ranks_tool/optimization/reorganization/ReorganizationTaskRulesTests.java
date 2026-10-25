package pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

class ReorganizationTaskRulesTests {
    private OptimizationRequest request() {
        var request = new OptimizationRequest();
        request.setMode(OptimizationMode.REORGANIZE);
        var options = new ReorganizationOptions();
        options.setTask(ReorganizationOptions.Task.UPGRADE);
        options.setUpgrades(List.of(new ReorganizationOptions.Upgrade()));
        request.setReorganization(options);
        return request;
    }

    @Test
    void rejectsEachIncompatibleShapeBeforeRewritingSearchControls() {
        List<Consumer<ReorganizationOptions>> invalid =
                List.of(
                        o -> o.setTask(null),
                        o -> o.setUpgrade(new ReorganizationOptions.Upgrade()),
                        o -> o.setUpgrades(List.of()),
                        o -> o.setUpgrades(Arrays.asList((ReorganizationOptions.Upgrade) null)),
                        o ->
                                o.setUpgrades(
                                        Collections.nCopies(
                                                37, new ReorganizationOptions.Upgrade())),
                        o -> o.setInsertions(List.of()),
                        o -> o.setInsertions(Arrays.asList((ReorganizationOptions.Insertion) null)),
                        o -> o.setReservation(new ReorganizationOptions.Reservation()),
                        o -> o.setTask(ReorganizationOptions.Task.RESERVE),
                        o -> {
                            o.setTask(ReorganizationOptions.Task.ARRANGE);
                            o.setGoal(null);
                        },
                        o -> {
                            o.setTask(ReorganizationOptions.Task.INSERT);
                            o.setInsertEntryId("one");
                            o.setInsertions(List.of(new ReorganizationOptions.Insertion()));
                        },
                        o -> {
                            o.setTask(ReorganizationOptions.Task.INSERT);
                            o.setInsertions(
                                    Collections.nCopies(37, new ReorganizationOptions.Insertion()));
                        },
                        o -> {
                            var first = new ReorganizationOptions.Upgrade();
                            first.setMaximizeLevel(true);
                            o.setUpgrades(List.of(first, new ReorganizationOptions.Upgrade()));
                        });
        for (var change : invalid) {
            var request = request();
            var priorities = Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30);
            request.setPriorities(priorities);
            change.accept(request.getReorganization());
            assertNotNull(ReorganizationTaskRules.configure(request));
            assertSame(priorities, request.getPriorities());
        }
        var wrongMode = request();
        wrongMode.setMode(OptimizationMode.BUILD_FROM_SCRATCH);
        assertNotNull(ReorganizationTaskRules.configure(wrongMode));
    }

    @Test
    void acceptsInclusiveListBoundariesAndOnlyFiniteNonnegativeProtectionLoss() {
        var request = request();
        request.getReorganization()
                .setUpgrades(Collections.nCopies(36, new ReorganizationOptions.Upgrade()));
        assertNull(ReorganizationTaskRules.configure(request));
        request.getReorganization().setTask(ReorganizationOptions.Task.INSERT);
        request.getReorganization()
                .setInsertions(Collections.nCopies(36, new ReorganizationOptions.Insertion()));
        assertNull(ReorganizationTaskRules.configure(request));
        for (double value :
                new double[] {
                    -0.1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY
                }) {
            var protection = new ReorganizationOptions.Protection();
            protection.setLoss(value);
            request.getReorganization()
                    .setProtectedModifiers(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, protection));
            assertNotNull(ReorganizationTaskRules.configure(request));
        }
        var valid = new ReorganizationOptions.Protection();
        valid.setLoss(0);
        request.getReorganization()
                .setProtectedModifiers(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, valid));
        assertNull(ReorganizationTaskRules.configure(request));
        var map = new HashMap<DRIF_BONUS_TYPE, ReorganizationOptions.Protection>();
        map.put(DRIF_BONUS_TYPE.CRITICAL_CHANCE, null);
        request.getReorganization().setProtectedModifiers(map);
        assertNotNull(ReorganizationTaskRules.configure(request));
        map.clear();
        map.put(null, valid);
        assertNotNull(ReorganizationTaskRules.configure(request));
    }
}
