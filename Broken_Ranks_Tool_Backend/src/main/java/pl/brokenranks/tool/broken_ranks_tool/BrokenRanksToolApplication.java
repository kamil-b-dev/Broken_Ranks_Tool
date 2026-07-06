package pl.brokenranks.tool.broken_ranks_tool;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * Główna klasa aplikacji Spring Boot.
 * Inicjalizuje i uruchamia całą aplikację.
 * Adnotacja {@link EnableCaching} włącza mechanizm cachowania w aplikacji.
 */
@SpringBootApplication
@EnableCaching
public class BrokenRanksToolApplication {

	public static void main(String[] args) {
		SpringApplication.run(BrokenRanksToolApplication.class, args);
	}

}
