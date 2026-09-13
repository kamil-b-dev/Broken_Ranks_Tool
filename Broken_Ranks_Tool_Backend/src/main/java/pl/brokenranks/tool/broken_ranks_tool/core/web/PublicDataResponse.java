package pl.brokenranks.tool.broken_ranks_tool.core.web;

import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;

/** Builds cacheable responses for catalogue data that is immutable within a deployment. */
public final class PublicDataResponse {

    private static final CacheControl CACHE_CONTROL =
            CacheControl.maxAge(Duration.ofHours(1)).cachePublic();

    private PublicDataResponse() {}

    public static <T> ResponseEntity<T> ok(T body) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(body);
    }
}
