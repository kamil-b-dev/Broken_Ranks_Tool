import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;

/** Applies one repository migration to a fresh copy of the versioned SQLite catalog. */
public final class ApplySqliteMigration {
    private ApplySqliteMigration() {}

    public static void main(String[] args) throws Exception {
        if (args.length != 3) {
            throw new IllegalArgumentException(
                    "Usage: ApplySqliteMigration <source.db> <target.db> <migration.sql>");
        }

        Path source = Path.of(args[0]).toAbsolutePath().normalize();
        Path target = Path.of(args[1]).toAbsolutePath().normalize();
        Path migration = Path.of(args[2]).toAbsolutePath().normalize();
        if (source.equals(target)) {
            throw new IllegalArgumentException("Target must be a separate database copy");
        }

        Files.createDirectories(target.getParent());
        Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
        String script = Files.readString(migration);

        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + target)) {
            for (String sql : script.split(";")) {
                if (!sql.isBlank()) connection.createStatement().execute(sql);
            }
        } catch (Exception exception) {
            Files.deleteIfExists(target);
            throw exception;
        }
    }
}
