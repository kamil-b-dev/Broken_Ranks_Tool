package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

class OptimizationExecutionGuardTests {

    @Test
    void rejectsAnOverlappingOptimizationAndReleasesThePermit() throws Exception {
        ModsOptimizationService service = Mockito.mock(ModsOptimizationService.class);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        OptimizationResponse response = new OptimizationResponse(null, null);
        when(service.optimize(any()))
                .thenAnswer(
                        invocation -> {
                            entered.countDown();
                            release.await(2, TimeUnit.SECONDS);
                            return response;
                        });
        OptimizationExecutionGuard guard = new OptimizationExecutionGuard(service);
        ExecutorService executor = Executors.newSingleThreadExecutor();

        try {
            var first = executor.submit(() -> guard.optimize(new OptimizationRequest()));
            entered.await(2, TimeUnit.SECONDS);

            assertThrows(
                    OptimizerBusyException.class,
                    () -> guard.optimize(new OptimizationRequest()));

            release.countDown();
            first.get(2, TimeUnit.SECONDS);
            guard.optimize(new OptimizationRequest());
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }
}
