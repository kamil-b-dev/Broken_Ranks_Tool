package pl.brokenranks.tool.broken_ranks_tool.core.execution;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.management.MemoryUsage;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiException;

class HeavyCalculationGateTests {
    @ParameterizedTest
    @CsvSource({"0,85", "-1,85", "1,0", "1,96"})
    void rejectsInvalidAdmissionLimits(int workers, int percent) {
        assertThrows(
                IllegalArgumentException.class, () -> new HeavyCalculationGate(workers, percent));
    }

    @Test
    void treatsTheExactThresholdAsPressureAndAllowsRecoveryWithoutConsumingAPermit() {
        var heap = new AtomicReference<>(new MemoryUsage(0, 849, 1000, 1000));
        var gate = new HeavyCalculationGate(1, 85, heap::get);
        assertDoesNotThrow(gate::ensureMemoryAvailable);
        heap.set(new MemoryUsage(0, 850, 1000, 1000));
        assertThrows(ApiException.class, gate::ensureMemoryAvailable);
        assertTrue(gate.tryAcquire());
        assertFalse(gate.tryAcquire());
        gate.release();
        heap.set(new MemoryUsage(0, 900, 1000, 1000));
        assertThrows(ApiException.class, gate::ensureMemoryAvailable);
        heap.set(new MemoryUsage(0, 100, 1000, 1000));
        assertDoesNotThrow(gate::ensureMemoryAvailable);
        assertTrue(gate.tryAcquire());
        gate.release();
    }

    @Test
    void anUnknownHeapMaximumDoesNotRejectWork() {
        var gate = new HeavyCalculationGate(2, 1, () -> new MemoryUsage(0, 900, 1000, -1));
        assertDoesNotThrow(gate::ensureMemoryAvailable);
        assertTrue(gate.tryAcquire());
        assertTrue(gate.tryAcquire());
        assertFalse(gate.tryAcquire());
        gate.release();
        assertTrue(gate.tryAcquire());
    }
}
