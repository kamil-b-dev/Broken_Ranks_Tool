package pl.brokenranks.tool.broken_ranks_tool;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

/** Main entry point and configuration class for the Spring Boot application. */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class BrokenRanksToolApplication {

    public static void main(String[] args) {
        SpringApplication.run(BrokenRanksToolApplication.class, args);
    }
}
