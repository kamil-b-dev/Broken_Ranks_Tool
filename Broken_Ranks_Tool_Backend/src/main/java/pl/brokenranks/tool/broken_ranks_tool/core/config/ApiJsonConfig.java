package pl.brokenranks.tool.broken_ranks_tool.core.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.cfg.EnumFeature;
import tools.jackson.databind.type.LogicalType;

/** Strict API field names and enum names, independent of legacy numeric scalar conversions. */
@Configuration
public class ApiJsonConfig {
    @Bean
    JsonMapperBuilderCustomizer apiJsonContract() {
        return builder ->
                builder.enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                        .enable(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES)
                        .enable(EnumFeature.FAIL_ON_NUMBERS_FOR_ENUMS)
                        .disable(EnumFeature.READ_ENUM_KEYS_USING_INDEX)
                        .disable(EnumFeature.READ_ENUMS_USING_TO_STRING)
                        .withCoercionConfig(
                                LogicalType.Enum,
                                config ->
                                        config.setCoercion(
                                                CoercionInputShape.EmptyString,
                                                CoercionAction.Fail))
                        .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION);
    }
}
