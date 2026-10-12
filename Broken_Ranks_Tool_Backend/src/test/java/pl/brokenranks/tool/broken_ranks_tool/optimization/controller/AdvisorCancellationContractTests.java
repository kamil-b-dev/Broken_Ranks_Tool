package pl.brokenranks.tool.broken_ranks_tool.optimization.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.core.config.ApiJsonConfig;
import pl.brokenranks.tool.broken_ranks_tool.core.config.SecurityConfig;
import pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorRunRegistry;

@WebMvcTest(AdvisorCancellationController.class)
@Import({SecurityConfig.class, ApiJsonConfig.class})
class AdvisorCancellationContractTests {
    private static final String ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    private static final String TOKEN = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    @Autowired private MockMvc mvc;
    @MockitoBean private AdvisorRunRegistry runs;

    @ParameterizedTest
    @ValueSource(strings = {"", "null", " \nnull\t"})
    void acceptsOnlyEmptyOrNullBody(String body) throws Exception {
        mvc.perform(
                        post("/api/optimizer/advisor/" + ID + "/cancel")
                                .header("X-Advisor-Cancellation-Token", TOKEN)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                .andExpect(status().isOk());
        verify(runs).cancel(ID, TOKEN);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {"{}", "[]", "true", "0", "\"text\"", "invalid JSON", "{\"x\":1,\"x\":2}"})
    void rejectsOtherBodiesBeforeCancelling(String body) throws Exception {
        mvc.perform(
                        post("/api/optimizer/advisor/" + ID + "/cancel")
                                .header("X-Advisor-Cancellation-Token", TOKEN)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(runs);
    }

    @Test
    void rejectsShortUuidInEitherCredential() throws Exception {
        mvc.perform(
                        post("/api/optimizer/advisor/1-1-1-1-1/cancel")
                                .header("X-Advisor-Cancellation-Token", TOKEN))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/api/optimizer/advisor/" + ID + "/cancel")
                                .header("X-Advisor-Cancellation-Token", "1-1-1-1-1"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(runs);
    }

    @Test
    void acceptsUppercaseFullUuidAndCanonicalizesItsValue() throws Exception {
        mvc.perform(
                        post("/api/optimizer/advisor/" + ID.toUpperCase() + "/cancel")
                                .header("X-Advisor-Cancellation-Token", TOKEN.toUpperCase()))
                .andExpect(status().isOk());
        verify(runs).cancel(ID, TOKEN);
    }
}
