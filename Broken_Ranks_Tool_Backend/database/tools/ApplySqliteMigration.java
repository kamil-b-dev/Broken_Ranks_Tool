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
import java.util.Locale;
import java.util.Set;
import org.sqlite.SQLiteConnection;

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
        validateScript(script);

        Files.createDirectories(target.getParent());
        target = target.getParent().toRealPath().resolve(target.getFileName());
        requireWorkingCopyTarget(target);
        Path workDirectory = Files.createTempDirectory(target.getParent(), ".catalog-migration-");
        Path workingCopy = workDirectory.resolve("catalog.db");

        try {
            snapshotSource(source, workingCopy);
            try (Connection connection =
                    DriverManager.getConnection("jdbc:sqlite:" + workingCopy)) {
                executeMigration(connection, script);
                checkpointWorkingCopy(connection);
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

    private static void snapshotSource(Path source, Path target) throws SQLException {
        try (Connection connection =
                DriverManager.getConnection("jdbc:sqlite:" + source.toUri() + "?mode=ro")) {
            int result =
                    connection
                            .unwrap(SQLiteConnection.class)
                            .getDatabase()
                            .backup("main", target.toString(), null);
            if (result != 0) throw new SQLException("SQLite backup failed with code " + result);
        }
    }

    private static void checkpointWorkingCopy(Connection connection) throws SQLException {
        connection.setAutoCommit(true);
        try (Statement statement = connection.createStatement();
                var result = statement.executeQuery("PRAGMA wal_checkpoint(TRUNCATE)")) {
            if (result.next() && result.getInt(1) != 0) {
                throw new SQLException("The working copy could not be checkpointed");
            }
        }
    }

    /** Migration SQL owns only the working database; transaction boundaries belong to this tool. */
    private static void validateScript(String script) {
        Set<String> forbidden =
                Set.of(
                        "ATTACH",
                        "DETACH",
                        "COMMIT",
                        "ROLLBACK",
                        "SAVEPOINT",
                        "RELEASE",
                        "VACUUM",
                        "LOAD_EXTENSION",
                        "WRITABLE_SCHEMA",
                        "TEMP_STORE_DIRECTORY",
                        "DATA_STORE_DIRECTORY");
        boolean creating = false;
        boolean trigger = false;
        boolean triggerBody = false;
        int caseDepth = 0;
        for (int index = 0; index < script.length(); ) {
            char current = script.charAt(index);
            if (current == '-' && index + 1 < script.length() && script.charAt(index + 1) == '-') {
                int end = script.indexOf('\n', index + 2);
                index = end < 0 ? script.length() : end + 1;
                continue;
            }
            if (current == '/' && index + 1 < script.length() && script.charAt(index + 1) == '*') {
                int end = script.indexOf("*/", index + 2);
                index = end < 0 ? script.length() : end + 2;
                continue;
            }
            if (current == '\'' || current == '"' || current == '`' || current == '[') {
                char closing = current == '[' ? ']' : current;
                index++;
                while (index < script.length()) {
                    if (script.charAt(index++) != closing) continue;
                    if (index < script.length() && script.charAt(index) == closing) index++;
                    else break;
                }
                continue;
            }
            if (current == ';') {
                if (!triggerBody) {
                    creating = false;
                    trigger = false;
                }
                index++;
                continue;
            }
            if (!Character.isLetter(current) && current != '_') {
                index++;
                continue;
            }
            int start = index++;
            while (index < script.length()
                    && (Character.isLetterOrDigit(script.charAt(index))
                            || script.charAt(index) == '_')) index++;
            String token = script.substring(start, index).toUpperCase(Locale.ROOT);
            if (forbidden.contains(token))
                throw new IllegalArgumentException("Forbidden migration operation: " + token);
            if (token.equals("CREATE")) creating = true;
            if (token.equals("TRIGGER") && creating) trigger = true;
            if (token.equals("CASE") && triggerBody) caseDepth++;
            if (token.equals("BEGIN")) {
                if (!trigger || triggerBody)
                    throw new IllegalArgumentException(
                            "Migration transaction control is not allowed");
                triggerBody = true;
            }
            if (token.equals("END")) {
                if (triggerBody && caseDepth > 0) caseDepth--;
                else if (triggerBody) {
                    triggerBody = false;
                    trigger = false;
                } else
                    throw new IllegalArgumentException(
                            "Migration transaction control is not allowed");
            }
        }
    }

    private static void requireWorkingCopyTarget(Path target) {
        if (target.endsWith(Path.of("database", "catalog", "broken_ranks.db"))) {
            throw new IllegalArgumentException("The default catalog cannot be a migration target");
        }
    }

    private static void executeMigration(Connection connection, String script) throws SQLException {
        validateScript(script);
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
