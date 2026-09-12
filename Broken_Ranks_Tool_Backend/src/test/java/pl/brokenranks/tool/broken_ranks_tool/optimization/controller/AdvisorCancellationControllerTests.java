package pl.brokenranks.tool.broken_ranks_tool.optimization.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorRunRegistry;

@ExtendWith(MockitoExtension.class)
class AdvisorCancellationControllerTests {

    @Mock private AdvisorRunRegistry runs;

    @Test
    void returnsWhetherTheRequestedRunWasCancelled() {
        UUID runId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        when(runs.cancel(runId.toString())).thenReturn(true);
        AdvisorCancellationController controller = new AdvisorCancellationController(runs);

        Map<String, Boolean> response = controller.cancel(runId);

        assertThat(response).containsExactly(Map.entry("cancelled", true));
        verify(runs).cancel("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    }

    @Test
    void reportsWhenTheRunIsNoLongerActive() {
        UUID runId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        AdvisorCancellationController controller = new AdvisorCancellationController(runs);

        assertThat(controller.cancel(runId)).containsExactly(Map.entry("cancelled", false));
    }
}
