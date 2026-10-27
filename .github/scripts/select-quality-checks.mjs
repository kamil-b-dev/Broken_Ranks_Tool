import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const allChecks = (enabled) => ({
  backend: enabled,
  frontend: enabled,
  infrastructure: enabled,
  integration: enabled,
});

export function classifyChanges(paths) {
  const checks = allChecks(false);
  for (const path of paths) {
    if (
      path.endsWith(".md") ||
      (path.startsWith("docs/") && path.endsWith(".csv")) ||
      ["LICENSE", "NOTICE"].includes(path)
    ) {
      continue;
    }
    if (path.startsWith("Broken_Ranks_Tool_Backend/")) {
      checks.backend = checks.infrastructure = checks.integration = true;
    } else if (path.startsWith("Broken_Ranks_Tool_Frontend/")) {
      checks.frontend = checks.infrastructure = checks.integration = true;
    } else if (path.startsWith(".railway/")) {
      checks.infrastructure = true;
    } else if (["package.json", "package-lock.json"].includes(path)) {
      checks.infrastructure = checks.integration = true;
    } else {
      // Shared contracts, CI, build configuration and unknown paths get full coverage.
      return allChecks(true);
    }
  }
  return checks;
}

export function readChangedFiles(base, cwd = process.cwd()) {
  if (!/^[a-f0-9]{40}$/.test(base) || /^0+$/.test(base)) {
    throw new Error("Missing comparison commit");
  }
  return execFileSync(
    "git",
    ["diff", "--name-only", "--no-renames", "-z", base, "HEAD", "--"],
    {
      cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  )
    .split("\0")
    .filter(Boolean);
}

export function selectQualityChecks(
  { eventName, ref, event },
  changedFiles = readChangedFiles,
) {
  if (
    !["pull_request", "push"].includes(eventName) ||
    ref === "refs/heads/master" ||
    event.pull_request?.base?.ref === "master"
  ) {
    return {
      checks: allChecks(true),
      reason:
        "Full verification for release, merge queue or manual/scheduled run.",
    };
  }
  try {
    // HEAD is the tested merge tree on a PR; comparing with its base covers the whole PR.
    const base =
      eventName === "pull_request"
        ? event.pull_request?.base?.sha
        : event.before;
    const checks = classifyChanges(changedFiles(base));
    return { checks, reason: "Checks selected from the complete Git diff." };
  } catch {
    // Missing history must increase verification, never silently skip tests.
    return {
      checks: allChecks(true),
      reason: "Comparison unavailable; running all quality checks.",
    };
  }
}

export async function findCoveringPullRequest(
  { eventName, ref, sha, repository, token, apiUrl = "https://api.github.com" },
  request = fetch,
) {
  if (
    eventName !== "push" ||
    ref !== "refs/heads/dev" ||
    !sha ||
    !repository ||
    !token
  ) {
    return null;
  }
  try {
    const url = new URL(`/repos/${repository}/pulls`, apiUrl);
    url.search = new URLSearchParams({
      state: "open",
      base: "master",
      head: `${repository.split("/")[0]}:dev`,
      per_page: "100",
    });
    const options = {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10_000),
    };
    const response = await request(url, options);
    if (!response.ok) return null;
    const pulls = await response.json();
    if (!Array.isArray(pulls)) return null;
    const matchesPush = (pull) =>
      Number.isSafeInteger(pull?.number) &&
      pull.number > 0 &&
      pull.state === "open" &&
      pull.head?.sha === sha &&
      pull.head?.ref === "dev" &&
      pull.head?.repo?.full_name === repository &&
      pull.base?.ref === "master" &&
      pull.base?.repo?.full_name === repository;
    const covering = pulls.find(matchesPush);
    if (!covering) return null;
    // GitHub does not start pull_request workflows for conflicting PRs. The list
    // endpoint omits mergeability, so confirm it and the SHA in the detail response.
    const detailResponse = await request(
      new URL(`/repos/${repository}/pulls/${covering.number}`, apiUrl),
      options,
    );
    if (!detailResponse.ok) return null;
    const detail = await detailResponse.json();
    return matchesPush(detail) &&
      detail.number === covering.number &&
      detail.mergeable === true
      ? covering.number
      : null;
  } catch {
    // API outages or missing permissions must preserve the push checks.
    return null;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const context = {
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")),
  };
  let result = selectQualityChecks(context);
  const coveringPullRequest = await findCoveringPullRequest({
    ...context,
    sha: process.env.GITHUB_SHA,
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GH_TOKEN,
    apiUrl: process.env.GITHUB_API_URL,
  });
  if (coveringPullRequest !== null) {
    result = {
      checks: allChecks(false),
      reason: `Full verification of this exact commit runs in PR #${coveringPullRequest} to master; skipping duplicate push checks.`,
    };
  }
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(result.checks)
      .map(([name, enabled]) => `${name}=${enabled}\n`)
      .join(""),
  );
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Quality checks\n\n${result.reason}\n\n| Area | Run |\n| --- | --- |\n` +
      Object.entries(result.checks)
        .map(([name, enabled]) => `| ${name} | ${enabled} |\n`)
        .join(""),
  );
}
