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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = selectQualityChecks({
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")),
  });
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
