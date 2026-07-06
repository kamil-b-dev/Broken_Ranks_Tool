package pl.brokenranks.tool.broken_ranks_tool.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import javax.sql.DataSource;

/**
 * Klasa konfiguracyjna dla połączenia z bazą danych SQLite.
 */
@Configuration
public class SQLiteConfig {

    /**
     * Tworzy i konfiguruje bean {@link DataSource}, który będzie używany
     * przez Springa do zarządzania połączeniami z bazą danych.
     *
     * @return Skonfigurowane źródło danych dla bazy SQLite.
     */
    @Bean
    public DataSource dataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.sqlite.JDBC");
        dataSource.setUrl("jdbc:sqlite:broken_ranks.db");
        return dataSource;
    }
}
