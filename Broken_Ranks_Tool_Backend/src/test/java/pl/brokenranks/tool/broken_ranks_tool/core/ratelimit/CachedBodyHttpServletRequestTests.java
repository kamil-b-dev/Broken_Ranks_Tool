package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class CachedBodyHttpServletRequestTests {

    @Test
    void exposesIndependentStreamsAndTheCheckedContentLength() throws Exception {
        byte[] body = "zażółć".getBytes(StandardCharsets.UTF_8);
        CachedBodyHttpServletRequest request = request(body, StandardCharsets.UTF_8.name());

        assertThat(request.getContentLength()).isEqualTo(body.length);
        assertThat(request.getContentLengthLong()).isEqualTo(body.length);
        assertThat(request.getInputStream().readAllBytes()).isEqualTo(body);
        assertThat(request.getInputStream().readAllBytes()).isEqualTo(body);
        assertThat(request.getReader().readLine()).isEqualTo("zażółć");
    }

    @Test
    void fallsBackToUtf8ForAnInvalidClientEncoding() throws Exception {
        CachedBodyHttpServletRequest request =
                request("błąd".getBytes(StandardCharsets.UTF_8), "not-a-charset");

        assertThat(request.getReader().readLine()).isEqualTo("błąd");
    }

    @Test
    void reportsNonBlockingStreamLifecycle() throws Exception {
        ServletInputStream stream = request(new byte[] {1, 2, 3}, null).getInputStream();
        AtomicBoolean dataAvailable = new AtomicBoolean();
        AtomicBoolean allDataRead = new AtomicBoolean();

        stream.setReadListener(listener(dataAvailable, allDataRead));
        assertThat(stream.isReady()).isTrue();
        assertThat(stream.isFinished()).isFalse();
        assertThat(dataAvailable).isTrue();
        assertThat(allDataRead).isFalse();

        byte[] target = new byte[3];
        assertThat(stream.read(target, 0, target.length)).isEqualTo(3);
        assertThat(target).containsExactly(1, 2, 3);
        assertThat(stream.isFinished()).isTrue();

        stream.setReadListener(listener(dataAvailable, allDataRead));
        assertThat(allDataRead).isTrue();
        assertThat(stream.read()).isEqualTo(-1);
    }

    @Test
    void rejectsANullReadListener() {
        ServletInputStream stream = request(new byte[0], null).getInputStream();

        assertThatNullPointerException().isThrownBy(() -> stream.setReadListener(null));
    }

    private CachedBodyHttpServletRequest request(byte[] body, String encoding) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        if (encoding != null) request.setCharacterEncoding(encoding);
        return new CachedBodyHttpServletRequest(request, body);
    }

    private ReadListener listener(AtomicBoolean dataAvailable, AtomicBoolean allDataRead) {
        return new ReadListener() {
            @Override
            public void onDataAvailable() {
                dataAvailable.set(true);
            }

            @Override
            public void onAllDataRead() {
                allDataRead.set(true);
            }

            @Override
            public void onError(Throwable throwable) {
                throw new AssertionError(throwable);
            }
        };
    }
}
