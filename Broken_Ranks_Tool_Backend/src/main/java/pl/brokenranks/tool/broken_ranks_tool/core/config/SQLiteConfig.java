package pl.brokenranks.tool.broken_ranks_tool.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import javax.sql.DataSource;

/**
 * Konfiguracja źródła danych (DataSource) dla bazy SQLite.
 */
@Configuration
public class SQLiteConfig {

    /**
     * Definiuje bean {@link DataSource}, aby Spring mógł zarządzać połączeniami z bazą danych.
     * @return Skonfigurowane źródło danych.
     */
    @Bean
    public DataSource dataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.sqlite.JDBC");
        dataSource.setUrl("jdbc:sqlite:broken_ranks.db");
        return dataSource;
    }
}
