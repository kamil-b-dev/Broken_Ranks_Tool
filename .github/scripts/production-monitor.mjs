import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const reportFile = "tmp/production-health.json";
const incidentTitle = "[Production monitor] Broken Ranks Tool unavailable";
const marker = "<!-- broken-ranks-production-monitor -->";

const endpoints = [
  { path: "/", kind: "html" },
  { path: "/actuator/health/readiness", kind: "health" },
  { path: "/api/initial-data", kind: "catalogue" },
];

async function checkEndpoint(origin, { path, kind }, request) {
  try {
    const response = await request(new URL(path, origin), {
      headers: {
        "User-Agent": "Broken-Ranks-Production-Monitor",
        Accept: kind === "html" ? "text/html" : "application/json",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (kind === "html") {
      const html = await response.text();
      if (
        !/text\/html/i.test(response.headers.get("content-type") || "") ||
        !/id=["']root["']/.test(html) ||
        !html.includes("Broken Ranks Tool")
      )
        throw new Error("Expected the application HTML");
    } else {
      const body = await response.json();
      if (kind === "health" && body?.status !== "UP")
        throw new Error("Readiness is not UP");
      if (
        kind === "catalogue" &&
        (!body ||
          !["items", "orbs", "drifs"].every(
            (key) => Array.isArray(body[key]) && body[key].length > 0,
          ) ||
          !body.gameRules ||
          typeof body.gameRules !== "object")
      )
        throw new Error("Expected a populated catalogue and game rules");
    }
    return { path, ok: true };
  } catch (error) {
    // Do not copy response bodies or arbitrary network error messages into public issues.
    return {
      path,
      ok: false,
      error:
        error.name === "TimeoutError"
          ? "Request timed out"
          : /^HTTP \d+$/.test(error.message)
            ? error.message
            : "Unexpected response or connection failure",
    };
  }
}

export async function checkProduction(
  baseUrl,
  { request = fetch, pause = delay, retryDelayMs = 10000 } = {},
) {
  const origin = new URL(baseUrl);
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/"
  )
    throw new Error(
      "PRODUCTION_URL must be an HTTPS origin without credentials, path, query or fragment",
    );
  let checks = await Promise.all(
    endpoints.map((endpoint) => checkEndpoint(origin, endpoint, request)),
  );
  if (checks.some((check) => !check.ok)) {
    await pause(retryDelayMs);
    checks = await Promise.all(
      endpoints.map((endpoint, index) =>
        checks[index].ok
          ? checks[index]
          : checkEndpoint(origin, endpoint, request),
      ),
    );
  }
  return {
    origin: origin.origin,
    checkedAt: new Date().toISOString(),
    healthy: checks.every((check) => check.ok),
    checks,
  };
}

export async function reconcileIncident(
  report,
  { repository, token, runUrl, request = fetch },
) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !token)
    throw new Error("Missing GitHub repository or token");
  const api = async (path, method = "GET", body) => {
    const response = await request(
      `https://api.github.com/repos/${repository}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      },
    );
    if (!response.ok)
      throw new Error(`GitHub incident API: HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  let incident;
  for (let page = 1; ; page++) {
    const issues = await api(
      `/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100&page=${page}`,
    );
    incident = issues.find(
      (issue) =>
        !issue.pull_request &&
        issue.title === incidentTitle &&
        issue.body?.includes(marker),
    );
    if (incident || issues.length < 100) break;
  }
  if (report.healthy) {
    if (!incident) return "healthy";
    await api(`/issues/${incident.number}/comments`, "POST", {
      body: `All production checks recovered at ${report.checkedAt}.\n\n[Workflow run](${runUrl})`,
    });
    await api(`/issues/${incident.number}`, "PATCH", {
      state: "closed",
      state_reason: "completed",
    });
    return "resolved";
  }
  if (incident) return "already-open";
  await api("/issues", "POST", {
    title: incidentTitle,
    assignees: [repository.split("/")[0]],
    body: `${marker}\nAvailability checks failed after retry at ${report.checkedAt}.\n\nOrigin: ${report.origin}\n\n${report.checks
      .filter((check) => !check.ok)
      .map((check) => `- \`${check.path}\`: ${check.error}`)
      .join(
        "\n",
      )}\n\n[Workflow run](${runUrl})\n\nThe monitor will close this incident after all checks recover.`,
  });
  return "created";
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const mode = process.argv[2];
  if (mode === "check") {
    const report = await checkProduction(process.env.PRODUCTION_URL);
    mkdirSync("tmp", { recursive: true });
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    process.exitCode = report.healthy ? 0 : 1;
  } else if (mode === "report") {
    const result = await reconcileIncident(
      JSON.parse(readFileSync(reportFile, "utf8")),
      {
        repository: process.env.GITHUB_REPOSITORY,
        token: process.env.GH_TOKEN,
        runUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
      },
    );
    console.log(`Production incident: ${result}`);
  } else throw new Error("Use check or report");
}
