package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class AbuseProtectionPropertiesTests {

    private static final AbuseProtectionProperties.Limit VALID_LIMIT =
            new AbuseProtectionProperties.Limit(2, 10);

    @Test
    void acceptsPositiveConsistentLimits() {
        assertThatCode(
                        () ->
                                new AbuseProtectionProperties(
                                        1024, VALID_LIMIT, VALID_LIMIT, VALID_LIMIT, VALID_LIMIT))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsMissingOrNonPositiveConfiguration() {
        assertThatThrownBy(
                        () ->
                                new AbuseProtectionProperties(
                                        0, VALID_LIMIT, VALID_LIMIT, VALID_LIMIT, VALID_LIMIT))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                new AbuseProtectionProperties(
                                        1024, null, VALID_LIMIT, VALID_LIMIT, VALID_LIMIT))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                new AbuseProtectionProperties(
                                        1024, VALID_LIMIT, VALID_LIMIT, null, VALID_LIMIT))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                new AbuseProtectionProperties(
                                        1024, VALID_LIMIT, VALID_LIMIT, VALID_LIMIT, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AbuseProtectionProperties.Limit(0, 10))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsAGlobalLimitBelowTheClientLimit() {
        assertThatThrownBy(() -> new AbuseProtectionProperties.Limit(10, 9))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
