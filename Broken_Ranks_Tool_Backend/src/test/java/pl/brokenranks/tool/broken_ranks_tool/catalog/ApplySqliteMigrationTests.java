package pl.brokenranks.tool.broken_ranks_tool.catalog;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URLClassLoader;
import java.nio.file.*;
import java.sql.*;
import javax.tools.ToolProvider;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Compiles and exercises the standalone catalog tool without shipping it in the application. */
class ApplySqliteMigrationTests {
    @TempDir static Path classes;
    @TempDir Path directory;
    private static URLClassLoader loader;
    private static Class<?> tool;
    private Path source;
    private byte[] original;

    @BeforeAll
    static void compileTool() throws Exception {
        assertEquals(
                0,
                ToolProvider.getSystemJavaCompiler()
                        .run(
                                null,
                                null,
                                null,
                                "--release",
                                "21",
                                "-encoding",
                                "UTF-8",
                                "-d",
                                classes.toString(),
                                Path.of("database", "tools", "ApplySqliteMigration.java")
                                        .toString()));
        loader =
                new URLClassLoader(
                        new java.net.URL[] {classes.toUri().toURL()},
                        ApplySqliteMigrationTests.class.getClassLoader());
        tool = Class.forName("ApplySqliteMigration", true, loader);
    }

    @AfterAll
    static void closeLoader() throws Exception {
        if (loader != null) loader.close();
    }

    @BeforeEach
    void createSource() throws Exception {
        source = directory.resolve("source.db");
        try (Connection connection = connect(source);
                Statement statement = connection.createStatement()) {
            statement.executeUpdate(
                    "CREATE TABLE entries(id INTEGER PRIMARY KEY, stats TEXT);"
                            + "INSERT INTO entries(stats) VALUES('base');");
        }
        original = Files.readAllBytes(source);
    }

    @Test
    void handlesSemicolonsCommentsAndMultiStatementTriggersOnANewCopy() throws Exception {
        Path target = directory.resolve("result.db");
        migrate(
                source,
                target,
                script(
                        """
                -- A semicolon in a comment must not split a statement ;
                CREATE TABLE audit(message TEXT);
                INSERT INTO entries(stats) VALUES('PŻ:150;Mana:90');
                CREATE TRIGGER changed AFTER UPDATE ON entries BEGIN
                    INSERT INTO audit VALUES('first;message');
                    INSERT INTO audit VALUES(CASE WHEN NEW.id=2 THEN 'second;message' ELSE 'other' END);
                END;
                /* Another comment ; */
                UPDATE entries SET stats=stats||';suffix' WHERE id=2;
                """));

        assertArrayEquals(original, Files.readAllBytes(source));
        try (Connection connection = connect(target);
                Statement statement = connection.createStatement()) {
            try (ResultSet rows = statement.executeQuery("SELECT stats FROM entries WHERE id=2")) {
                assertTrue(rows.next());
                assertEquals("PŻ:150;Mana:90;suffix", rows.getString(1));
            }
            try (ResultSet rows = statement.executeQuery("SELECT count(*) FROM audit")) {
                assertTrue(rows.next());
                assertEquals(2, rows.getInt(1));
            }
        }
        assertNoWorkingDirectories();
    }

    @ParameterizedTest
    @ValueSource(strings = {"INSERT INTO entries(stats) VALUES('new');", "INVALID SQL;"})
    void neverOverwritesOrDeletesAnExistingTarget(String sql) throws Exception {
        Path target = directory.resolve("existing.db");
        Files.writeString(target, "Existing data must remain unchanged");
        byte[] targetBytes = Files.readAllBytes(target);

        assertThrows(FileAlreadyExistsException.class, () -> migrate(source, target, script(sql)));
        assertArrayEquals(targetBytes, Files.readAllBytes(target));
        assertArrayEquals(original, Files.readAllBytes(source));
        assertNoWorkingDirectories();
    }

    @Test
    void forbidsTheDefaultCatalogPathEvenWhenItDoesNotExist() throws Exception {
        Path target = directory.resolve("database/catalog/broken_ranks.db");
        assertThrows(
                IllegalArgumentException.class,
                () -> migrate(source, target, script("INSERT INTO entries(stats) VALUES('new');")));
        assertFalse(Files.exists(target));
        assertFalse(Files.exists(target.getParent()));
        assertArrayEquals(original, Files.readAllBytes(source));
    }

    @Test
    void canReadTheDefaultCatalogAsSourceWithoutModifyingIt() throws Exception {
        Path catalog = directory.resolve("database/catalog/broken_ranks.db");
        Files.createDirectories(catalog.getParent());
        Files.copy(source, catalog);
        Path target = directory.resolve("working-copy.db");

        migrate(catalog, target, script("INSERT INTO entries(stats) VALUES('new');"));

        assertTrue(Files.exists(target));
        assertArrayEquals(original, Files.readAllBytes(catalog));
        assertArrayEquals(original, Files.readAllBytes(source));
    }

    @Test
    void rejectsTheSourceAsTarget() throws Exception {
        assertThrows(
                IllegalArgumentException.class,
                () -> migrate(source, source, script("DELETE FROM entries;")));
        assertArrayEquals(original, Files.readAllBytes(source));
    }

    @Test
    void sqlFailureDoesNotPublishTheCopyAndRemovesWorkingFiles() throws Exception {
        Path target = directory.resolve("failed.db");
        assertThrows(
                SQLException.class,
                () ->
                        migrate(
                                source,
                                target,
                                script(
                                        "INSERT INTO entries(stats) VALUES('new'); INSERT INTO missing VALUES(1);")));

        assertFalse(Files.exists(target));
        assertArrayEquals(original, Files.readAllBytes(source));
        assertNoWorkingDirectories();
    }

    @Test
    void missingScriptLeavesSourceAndTargetUntouched() throws Exception {
        Path target = directory.resolve("result.db");
        assertThrows(
                NoSuchFileException.class,
                () -> migrate(source, target, directory.resolve("missing.sql")));
        assertFalse(Files.exists(target));
        assertArrayEquals(original, Files.readAllBytes(source));
        assertNoWorkingDirectories();
    }

    @Test
    void rollsBackTheWholeScriptAndLeavesConnectionUsable() throws Exception {
        try (Connection connection = connect(source)) {
            assertThrows(
                    SQLException.class,
                    () ->
                            invoke(
                                    "executeMigration",
                                    new Class<?>[] {Connection.class, String.class},
                                    connection,
                                    "INSERT INTO entries(stats) VALUES('new'); INSERT INTO missing VALUES(1);"));
            try (Statement statement = connection.createStatement();
                    ResultSet rows = statement.executeQuery("SELECT count(*) FROM entries")) {
                assertTrue(rows.next());
                assertEquals(1, rows.getInt(1));
            }
        }
    }

    @Test
    void newTargetAppearingBeforePublicationCannotBeReplaced() throws Exception {
        Path target = directory.resolve("result.db");
        Files.writeString(target, "Created by another operation");
        byte[] targetBytes = Files.readAllBytes(target);

        assertThrows(
                FileAlreadyExistsException.class,
                () ->
                        invoke(
                                "publishNewCopy",
                                new Class<?>[] {Path.class, Path.class},
                                source,
                                target));

        assertArrayEquals(targetBytes, Files.readAllBytes(target));
        assertArrayEquals(original, Files.readAllBytes(source));
    }

    @ParameterizedTest
    @ValueSource(strings = {"BEGIN; INSERT INTO entries(stats) VALUES('new'); COMMIT;", "VACUUM;"})
    void rejectsOperationsOutsideTheManagedTransaction(String sql) throws Exception {
        Path target = directory.resolve("result.db");
        assertThrows(SQLException.class, () -> migrate(source, target, script(sql)));
        assertFalse(Files.exists(target));
        assertArrayEquals(original, Files.readAllBytes(source));
        assertNoWorkingDirectories();
    }

    private Path script(String sql) throws Exception {
        return Files.writeString(directory.resolve("migration.sql"), sql);
    }

    private static Connection connect(Path file) throws SQLException {
        return DriverManager.getConnection("jdbc:sqlite:" + file);
    }

    private void assertNoWorkingDirectories() throws Exception {
        try (var children = Files.list(directory)) {
            assertFalse(
                    children.anyMatch(
                            path ->
                                    path.getFileName()
                                            .toString()
                                            .startsWith(".catalog-migration-")));
        }
    }

    private static void migrate(Path source, Path target, Path script) throws Exception {
        invoke(
                "main",
                new Class<?>[] {String[].class},
                (Object) new String[] {source.toString(), target.toString(), script.toString()});
    }

    private static void invoke(String name, Class<?>[] parameterTypes, Object... arguments)
            throws Exception {
        Method method = tool.getDeclaredMethod(name, parameterTypes);
        method.setAccessible(true);
        try {
            method.invoke(null, arguments);
        } catch (InvocationTargetException exception) {
            if (exception.getCause() instanceof Exception cause) throw cause;
            throw exception;
        }
    }
}
