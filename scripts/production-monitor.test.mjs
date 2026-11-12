import assert from "node:assert/strict";
import test from "node:test";
import {
  checkProduction,
  reconcileIncident,
} from "../.github/scripts/production-monitor.mjs";

const origin = "https://example.test";
const successful = (url) =>
  new URL(url).pathname === "/"
    ? new Response('<title>Broken Ranks Tool</title><div id="root"></div>', {
        headers: { "Content-Type": "text/html" },
      })
    : Response.json(
        new URL(url).pathname.includes("readiness")
          ? { status: "UP" }
          : { items: [{}], orbs: [{}], drifs: [{}], gameRules: {} },
      );

test("checks actual HTML, readiness and populated API data without writing to production", async () => {
  const calls = [];
  const report = await checkProduction(origin, {
    request: async (url, options) => {
      calls.push({ url, options });
      return successful(url);
    },
    pause: () => assert.fail("Healthy checks must not retry"),
  });
  assert.equal(report.healthy, true);
  assert.equal(calls.length, 3);
  assert.ok(
    calls.every(
      ({ options }) => !options.method && options.redirect === "error",
    ),
  );
});

test("retries only failed endpoints and accepts recovery from a transient outage", async () => {
  let attempts = 0;
  const pauses = [];
  const report = await checkProduction(origin, {
    request: async (url) =>
      new URL(url).pathname.includes("readiness") && attempts++ === 0
        ? new Response(null, { status: 503 })
        : successful(url),
    pause: async (ms) => pauses.push(ms),
  });
  assert.equal(report.healthy, true);
  assert.equal(attempts, 2);
  assert.deepEqual(pauses, [10000]);
});

test("does not mistake an SPA fallback, empty catalogue or unready process for a working API", async () => {
  for (const body of [
    { status: "DOWN" },
    { items: [], orbs: [], drifs: [], gameRules: {} },
    "<html>fallback</html>",
  ]) {
    const report = await checkProduction(origin, {
      request: async (url) =>
        new URL(url).pathname === "/" ? successful(url) : Response.json(body),
      pause: async () => {},
    });
    assert.equal(report.healthy, false);
  }
});

test("reports permanent HTTP failures and removes arbitrary network messages from public reports", async () => {
  const report = await checkProduction(origin, {
    request: async (url) => {
      if (new URL(url).pathname === "/")
        return new Response(null, { status: 502 });
      throw new Error("private token or response body");
    },
    pause: async () => {},
  });
  assert.equal(report.healthy, false);
  assert.equal(report.checks[0].error, "HTTP 502");
  assert.ok(!JSON.stringify(report).includes("private token"));
});

test("rejects credentials and non-origin production URLs before making requests", async () => {
  for (const url of [
    "http://example.test",
    "https://user:secret@example.test",
    "https://example.test/path",
    "https://example.test/?token=x",
  ]) {
    await assert.rejects(
      checkProduction(url, {
        request: () => assert.fail("Must not send a request"),
      }),
      /HTTPS origin/,
    );
  }
});

const failure = {
  origin,
  checkedAt: "2026-11-13T00:00:00.000Z",
  healthy: false,
  checks: [{ path: "/", ok: false, error: "HTTP 503" }],
};
const existing = {
  number: 17,
  title: "[Production monitor] Broken Ranks Tool unavailable",
  body: "<!-- broken-ranks-production-monitor -->",
};
const settings = {
  repository: "kamil-b-dev/Broken_Ranks_Tool",
  token: "test-only",
  runUrl: "https://github.com/run",
};

test("opens one assigned incident and leaves an ongoing incident unchanged", async () => {
  const calls = [];
  assert.equal(
    await reconcileIncident(failure, {
      ...settings,
      request: async (url, options) => {
        calls.push({ url, options });
        return Response.json(options.method === "GET" ? [] : { number: 17 });
      },
    }),
    "created",
  );
  const body = JSON.parse(calls[1].options.body);
  assert.deepEqual(body.assignees, ["kamil-b-dev"]);
  assert.ok(body.body.includes("HTTP 503"));
  assert.equal(
    await reconcileIncident(failure, {
      ...settings,
      request: async (_, options) => {
        assert.equal(options.method, "GET");
        return Response.json([existing]);
      },
    }),
    "already-open",
  );
});

test("finds incidents beyond the first issue page without duplicating them", async () => {
  let pages = 0;
  assert.equal(
    await reconcileIncident(failure, {
      ...settings,
      request: async () =>
        Response.json(
          ++pages === 1
            ? Array.from({ length: 100 }, () => ({ title: "Other bot issue" }))
            : [existing],
        ),
    }),
    "already-open",
  );
  assert.equal(pages, 2);
});

test("adds recovery information and closes an open incident; healthy checks create no issues", async () => {
  const methods = [];
  assert.equal(
    await reconcileIncident(
      { ...failure, healthy: true },
      {
        ...settings,
        request: async (_, options) => {
          methods.push(options.method);
          return Response.json(options.method === "GET" ? [existing] : {});
        },
      },
    ),
    "resolved",
  );
  assert.deepEqual(methods, ["GET", "POST", "PATCH"]);
  assert.equal(
    await reconcileIncident(
      { ...failure, healthy: true },
      {
        ...settings,
        request: async (_, options) => {
          assert.equal(options.method, "GET");
          return Response.json([]);
        },
      },
    ),
    "healthy",
  );
});

test("fails visibly if GitHub cannot deliver an incident", async () => {
  await assert.rejects(
    reconcileIncident(failure, {
      ...settings,
      request: async () => new Response(null, { status: 403 }),
    }),
    /HTTP 403/,
  );
});
