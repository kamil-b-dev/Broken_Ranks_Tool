package pl.brokenranks.tool.broken_ranks_tool.core.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/** Enables catalog caching in the application context without coupling MVC slices to a cache. */
@Configuration(proxyBeanMethods = false)
@EnableCaching
public class CacheConfig {}
