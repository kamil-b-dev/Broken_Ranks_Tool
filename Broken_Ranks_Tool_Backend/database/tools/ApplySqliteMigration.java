import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

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
        requireWorkingCopyTarget(target);
        if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
            throw new java.nio.file.FileAlreadyExistsException(target.toString());
        }
        String script = Files.readString(migration);

        Files.createDirectories(target.getParent());
        target = target.getParent().toRealPath().resolve(target.getFileName());
        requireWorkingCopyTarget(target);
        Path workDirectory = Files.createTempDirectory(target.getParent(), ".catalog-migration-");
        Path workingCopy = workDirectory.resolve("catalog.db");

        try {
            Files.copy(source, workingCopy);
            try (Connection connection =
                    DriverManager.getConnection("jdbc:sqlite:" + workingCopy)) {
                executeMigration(connection, script);
            }
            publishNewCopy(workingCopy, target);
        } catch (Exception exception) {
            try {
                deleteWorkingCopy(workDirectory);
            } catch (IOException cleanupFailure) {
                exception.addSuppressed(cleanupFailure);
            }
            throw exception;
        }
        deleteWorkingCopy(workDirectory);
    }

    private static void requireWorkingCopyTarget(Path target) {
        if (target.endsWith(Path.of("database", "catalog", "broken_ranks.db"))) {
            throw new IllegalArgumentException("The default catalog cannot be a migration target");
        }
    }

    private static void executeMigration(Connection connection, String script) throws SQLException {
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            // Xerial's executeUpdate uses SQLite's script parser, including trigger bodies.
            statement.executeUpdate(script);
            connection.commit();
        } catch (SQLException exception) {
            try {
                connection.rollback();
            } catch (SQLException rollbackFailure) {
                exception.addSuppressed(rollbackFailure);
            }
            throw exception;
        }
    }

    private static void publishNewCopy(Path source, Path target) throws IOException {
        boolean created = false;
        try (InputStream input = Files.newInputStream(source);
                OutputStream output =
                        Files.newOutputStream(
                                target, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
            created = true;
            input.transferTo(output);
        } catch (IOException exception) {
            if (created) {
                try {
                    Files.deleteIfExists(target);
                } catch (IOException cleanupFailure) {
                    exception.addSuppressed(cleanupFailure);
                }
            }
            throw exception;
        }
    }

    private static void deleteWorkingCopy(Path directory) throws IOException {
        for (String name :
                new String[] {
                    "catalog.db-journal", "catalog.db-wal", "catalog.db-shm", "catalog.db"
                }) {
            Files.deleteIfExists(directory.resolve(name));
        }
        Files.delete(directory);
    }
}
