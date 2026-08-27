package pl.brokenranks.tool.broken_ranks_tool.core.config;

import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/** Configures the SQLite data source. */
@Configuration
public class SQLiteConfig {

    /**
     * Creates the {@link DataSource} managed by Spring.
     * @return Configured SQLite data source.
     */
    @Bean
    public DataSource dataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.sqlite.JDBC");
        dataSource.setUrl("jdbc:sqlite:broken_ranks.db");
        return dataSource;
    }
}
