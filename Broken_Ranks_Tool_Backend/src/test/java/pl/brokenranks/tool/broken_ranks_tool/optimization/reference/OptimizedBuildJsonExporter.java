package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

/** Writes an oracle result in the same versioned format accepted by the build importer. */
public final class OptimizedBuildJsonExporter {
    private static final String FORMAT = "broken-ranks-tool-build";
    private static final int VERSION = 1;

    private final ObjectMapper objectMapper;

    public OptimizedBuildJsonExporter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Path export(Path source, Path destination, EquipmentRequest optimizedSetup)
            throws IOException {
        JsonNode parsed = objectMapper.readTree(Files.readString(source));
        if (!(parsed instanceof ObjectNode root)
                || !FORMAT.equals(root.path("format").asText())
                || root.path("version").asInt() != VERSION
                || !(root.path("build") instanceof ObjectNode build)) {
            throw new IllegalArgumentException("Source is not a supported build export");
        }

        root.put("exportedAt", Instant.now().toString());
        build.set("requestData", objectMapper.valueToTree(optimizedSetup));
        Path absoluteDestination = destination.toAbsolutePath().normalize();
        Path parent = absoluteDestination.getParent();
        if (parent != null) Files.createDirectories(parent);
        objectMapper
                .writerWithDefaultPrettyPrinter()
                .writeValue(absoluteDestination.toFile(), root);
        return absoluteDestination;
    }

    public Path export(Path destination, EquipmentRequest optimizedSetup) throws IOException {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("format", FORMAT);
        root.put("version", VERSION);
        root.put("exportedAt", Instant.now().toString());
        ObjectNode build = root.putObject("build");
        build.set("requestData", objectMapper.valueToTree(optimizedSetup));
        build.putNull("characterConfig");
        build.putArray("lockedSlots");
        build.putObject("lockedDrifs");
        Path absoluteDestination = destination.toAbsolutePath().normalize();
        Path parent = absoluteDestination.getParent();
        if (parent != null) Files.createDirectories(parent);
        objectMapper
                .writerWithDefaultPrettyPrinter()
                .writeValue(absoluteDestination.toFile(), root);
        return absoluteDestination;
    }

    public static Path defaultDestination(Path source) {
        Path absolute = source.toAbsolutePath().normalize();
        String filename = absolute.getFileName().toString();
        int extension =
                filename.toLowerCase(java.util.Locale.ROOT).endsWith(".json")
                        ? filename.length() - 5
                        : filename.length();
        return absolute.resolveSibling(filename.substring(0, extension) + "-optimized.json");
    }
}
