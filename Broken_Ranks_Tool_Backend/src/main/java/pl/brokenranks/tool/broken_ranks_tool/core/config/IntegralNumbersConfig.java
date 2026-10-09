package pl.brokenranks.tool.broken_ranks_tool.core.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.deser.std.NumberDeserializers;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.function.Function;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Rejects fractional JSON values before they can be truncated into integer DTO fields. */
@Configuration
public class IntegralNumbersConfig {
    @Bean
    Jackson2ObjectMapperBuilderCustomizer integralNumbers() {
        return builder ->
                builder.postConfigurer(
                        mapper -> {
                            SimpleModule module = new SimpleModule("exact-integral-numbers");
                            module.addDeserializer(
                                    Integer.class, exactInteger(Integer.class, null));
                            module.addDeserializer(int.class, exactInteger(int.class, 0));
                            module.addDeserializer(Long.class, exactLong(Long.class, null));
                            module.addDeserializer(long.class, exactLong(long.class, 0L));
                            mapper.registerModule(module);
                        });
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
        private final JsonDeserializer<T> fallback;
        private final Function<BigDecimal, T> conversion;

        ExactIntegralDeserializer(
                Class<T> type, JsonDeserializer<T> fallback, Function<BigDecimal, T> conversion) {
            super(type);
            this.fallback = fallback;
            this.conversion = conversion;
        }

        @Override
        public T deserialize(JsonParser parser, DeserializationContext context) throws IOException {
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
        public T getNullValue(DeserializationContext context) throws JsonMappingException {
            return fallback.getNullValue(context);
        }
    }
}
