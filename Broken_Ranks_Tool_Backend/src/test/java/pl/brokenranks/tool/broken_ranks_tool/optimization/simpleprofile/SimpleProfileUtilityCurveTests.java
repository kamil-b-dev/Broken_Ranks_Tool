package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class SimpleProfileUtilityCurveTests {

    @Test
    void rewardsEarlyProgressMoreThanStackingPastUsefulTarget() {
        double earlyGain =
                SimpleProfileUtilityCurve.utility(5, 10) - SimpleProfileUtilityCurve.utility(0, 10);
        double lateGain =
                SimpleProfileUtilityCurve.utility(15, 10)
                        - SimpleProfileUtilityCurve.utility(10, 10);

        assertTrue(earlyGain > lateGain);
        assertEquals(1.0, SimpleProfileUtilityCurve.utility(10, 10));
        assertTrue(SimpleProfileUtilityCurve.utility(1000, 10) <= 1.2);
    }

    @Test
    void ignoresNonPositiveValuesAndTargets() {
        assertEquals(0.0, SimpleProfileUtilityCurve.utility(10, 0));
        assertEquals(0.0, SimpleProfileUtilityCurve.utility(-1, 10));
    }
}
