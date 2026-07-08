package pl.brokenranks.tool.broken_ranks_tool;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * Główny punkt wejścia i klasa konfiguracyjna aplikacji Spring Boot.
 */
@SpringBootApplication
@EnableCaching
public class BrokenRanksToolApplication {

	public static void main(String[] args) {
		SpringApplication.run(BrokenRanksToolApplication.class, args);
	}

}
