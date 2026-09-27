package pl.brokenranks.tool.broken_ranks_tool.optimization.referencebuild;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.Instant;

/** Stores an instant in SQLite as an ISO-8601 value with an explicit UTC offset. */
@Converter
class InstantTextConverter implements AttributeConverter<Instant, String> {
    @Override
    public String convertToDatabaseColumn(Instant value) {
        return value == null ? null : value.toString();
    }

    @Override
    public Instant convertToEntityAttribute(String value) {
        return value == null ? null : Instant.parse(value);
    }
}
