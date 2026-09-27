package pl.brokenranks.tool.broken_ranks_tool.optimization.referencebuild;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.LocalDate;

/** Stores a calendar date in SQLite without introducing a time zone. */
@Converter
class LocalDateTextConverter implements AttributeConverter<LocalDate, String> {
    @Override
    public String convertToDatabaseColumn(LocalDate value) {
        return value == null ? null : value.toString();
    }

    @Override
    public LocalDate convertToEntityAttribute(String value) {
        return value == null ? null : LocalDate.parse(value);
    }
}
