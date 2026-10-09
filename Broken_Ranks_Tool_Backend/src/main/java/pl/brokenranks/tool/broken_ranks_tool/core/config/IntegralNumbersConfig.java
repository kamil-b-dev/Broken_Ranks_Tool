package pl.brokenranks.tool.broken_ranks_tool.core.config;

import java.math.BigDecimal;
import java.util.function.Function;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.deser.jdk.NumberDeserializers;
import tools.jackson.databind.deser.std.StdDeserializer;
import tools.jackson.databind.module.SimpleModule;

/** Rejects fractional JSON values before they can be truncated into integer DTO fields. */
@Configuration
public class IntegralNumbersConfig {
    @Bean
    JsonMapperBuilderCustomizer integralNumbers() {
        return builder -> {
            SimpleModule module = new SimpleModule("exact-integral-numbers");
            module.addDeserializer(Integer.class, exactInteger(Integer.class, null));
            module.addDeserializer(int.class, exactInteger(int.class, 0));
            module.addDeserializer(Long.class, exactLong(Long.class, null));
            module.addDeserializer(long.class, exactLong(long.class, 0L));
            builder.addModule(module);
        };
    }

    private ExactIntegralDeserializer<Integer> exactInteger(
            Class<Integer> type, Integer nullValue) {
        return new ExactIntegralDeserializer<>(
                type,
                new NumberDeserializers.IntegerDeserializer(type, nullValue),
                BigDecimal::intValueExact);
    }

    private ExactIntegralDeserializer<Long> exactLong(Class<Long> type, Long nullValue) {
        return new ExactIntegralDeserializer<>(
                type,
                new NumberDeserializers.LongDeserializer(type, nullValue),
                BigDecimal::longValueExact);
    }

    private static final class ExactIntegralDeserializer<T extends Number>
            extends StdDeserializer<T> {
        private final ValueDeserializer<T> fallback;
        private final Function<BigDecimal, T> conversion;

        ExactIntegralDeserializer(
                Class<T> type, ValueDeserializer<T> fallback, Function<BigDecimal, T> conversion) {
            super(type);
            this.fallback = fallback;
            this.conversion = conversion;
        }

        @Override
        public T deserialize(JsonParser parser, DeserializationContext context) {
            if (!parser.hasToken(JsonToken.VALUE_NUMBER_FLOAT))
                return fallback.deserialize(parser, context);
            try {
                return conversion.apply(parser.getDecimalValue());
            } catch (ArithmeticException exception) {
                return context.reportInputMismatch(
                        handledType(),
                        "Wymagana jest liczba całkowita mieszcząca się w zakresie pola.");
            }
        }

        @Override
        public Object getNullValue(DeserializationContext context) {
            return fallback.getNullValue(context);
        }
    }
}
