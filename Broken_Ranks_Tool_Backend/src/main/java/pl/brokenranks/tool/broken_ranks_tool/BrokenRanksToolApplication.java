package pl.brokenranks.tool.broken_ranks_tool;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;

/** Main entry point and configuration class for the Spring Boot application. */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableCaching
public class BrokenRanksToolApplication {

    public static void main(String[] args) {
        SpringApplication.run(BrokenRanksToolApplication.class, args);
    }
}
