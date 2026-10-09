package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class OptimizedBuildJsonExporterTests {
    private final ObjectMapper objectMapper = new tools.jackson.databind.json.JsonMapper();

    @Test
    void preservesBuildMetadataAndReplacesOnlyRequestData(@TempDir Path directory)
            throws Exception {
        Path source = directory.resolve("build.json");
        Files.writeString(
                source,
                """
                {
                  "format": "broken-ranks-tool-build",
                  "version": 1,
                  "exportedAt": "2026-01-01T00:00:00Z",
                  "build": {
                    "requestData": {"slots": {}},
                    "characterConfig": {"level": 140},
                    "lockedSlots": ["helmet"],
                    "lockedDrifs": {"helmet": [0]}
                  }
                }
                """);
        EquipmentRequest setup = new EquipmentRequest();
        EquipmentRequest.SlotData helmet = new EquipmentRequest.SlotData();
        helmet.setItemId(7L);
        helmet.setDrifIds(List.of(11L));
        helmet.setDrifLevels(Map.of("0", 21));
        setup.setSlots(Map.of("helmet", helmet));
        setup.setCharacterStats(Map.of("Moc", 135));

        Path output =
                new OptimizedBuildJsonExporter(objectMapper)
                        .export(
                                source,
                                OptimizedBuildJsonExporter.defaultDestination(source),
                                setup);
        JsonNode result = objectMapper.readTree(output.toFile());

        assertEquals("broken-ranks-tool-build", result.path("format").asText());
        assertEquals(1, result.path("version").asInt());
        assertEquals(140, result.at("/build/characterConfig/level").asInt());
        assertEquals("helmet", result.at("/build/lockedSlots/0").asText());
        assertEquals(0, result.at("/build/lockedDrifs/helmet/0").asInt());
        assertEquals(7, result.at("/build/requestData/slots/helmet/itemId").asLong());
        assertEquals(11, result.at("/build/requestData/slots/helmet/drifIds/0").asLong());
        assertEquals(21, result.at("/build/requestData/slots/helmet/drifLevels/0").asInt());
        assertEquals(135, result.at("/build/requestData/characterStats/Moc").asInt());
    }

    @Test
    void derivesAnOptimizedFilenameNextToTheInput() {
        assertEquals(
                Path.of("C:/builds/build-optimized.json").toAbsolutePath().normalize(),
                OptimizedBuildJsonExporter.defaultDestination(Path.of("C:/builds/build.json")));
    }
}
