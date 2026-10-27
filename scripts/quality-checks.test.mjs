import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  classifyChanges,
  findCoveringPullRequest,
  readChangedFiles,
  selectQualityChecks,
} from "../.github/scripts/select-quality-checks.mjs";

const workflow = parse(
  readFileSync(
    new URL("../.github/workflows/quality.yml", import.meta.url),
    "utf8",
  ),
);
const all = {
  backend: true,
  frontend: true,
  infrastructure: true,
  integration: true,
};
const none = {
  backend: false,
  frontend: false,
  infrastructure: false,
  integration: false,
};
const context = {
  eventName: "pull_request",
  ref: "refs/pull/7/merge",
  event: { pull_request: { base: { ref: "dev", sha: "a".repeat(40) } } },
};

test("documentation skips application tests, but executable contracts still run everything", () => {
  assert.deepEqual(
    classifyChanges([
      "README.md",
      "docs/report.csv",
      "docs/rules.md",
      "LICENSE",
      "NOTICE",
    ]),
    none,
  );
  for (const path of [
    "docs/openapi.yaml",
    "docs/build-file-v3.schema.json",
    "docs/new-fixture.json",
  ]) {
    assert.deepEqual(classifyChanges([path]), all, path);
  }
});

test("application changes include integration and consumers of the save-file contract", () => {
  assert.deepEqual(
    classifyChanges(["Broken_Ranks_Tool_Frontend/src/app/App.jsx"]),
    { ...all, backend: false },
  );
  for (const path of [
    "Broken_Ranks_Tool_Backend/src/main/java/App.java",
    "Broken_Ranks_Tool_Backend/database/catalog/broken_ranks.db",
    "Broken_Ranks_Tool_Backend/pom.xml",
  ]) {
    assert.deepEqual(
      classifyChanges([path]),
      { ...all, frontend: false },
      path,
    );
  }
  assert.deepEqual(
    classifyChanges([
      "Broken_Ranks_Tool_Backend/src/test/Test.java",
      "Broken_Ranks_Tool_Frontend/src/app/App.jsx",
    ]),
    all,
  );
});

test("infrastructure dependency changes keep API integration and unknown paths fail safe", () => {
  for (const path of ["package.json", "package-lock.json"]) {
    assert.deepEqual(classifyChanges([path]), {
      ...none,
      infrastructure: true,
      integration: true,
    });
  }
  assert.deepEqual(classifyChanges([".railway/railway.ts"]), {
    ...none,
    infrastructure: true,
  });
  for (const path of [
    "Dockerfile",
    ".dockerignore",
    ".github/workflows/quality.yml",
    ".github/scripts/select-quality-checks.mjs",
    "scripts/check-api-contract.mjs",
    "new-shared-module/file.js",
  ]) {
    assert.deepEqual(classifyChanges([path]), all, path);
  }
});

test("release branches, merge queue and manual/scheduled runs always verify everything", () => {
  const unexpectedDiff = () => {
    throw new Error("Full runs must not depend on the diff");
  };
  for (const fullContext of [
    { ...context, eventName: "workflow_dispatch" },
    { ...context, eventName: "schedule" },
    { ...context, eventName: "merge_group" },
    { ...context, eventName: "push", ref: "refs/heads/master" },
    { ...context, event: { pull_request: { base: { ref: "master" } } } },
  ]) {
    assert.deepEqual(
      selectQualityChecks(fullContext, unexpectedDiff).checks,
      all,
    );
  }
  assert.ok(Object.hasOwn(workflow.on, "workflow_dispatch"));
  assert.ok(workflow.on.schedule.length > 0);
  assert.ok(Object.hasOwn(workflow.on, "merge_group"));
  for (const event of ["push", "pull_request"]) {
    assert.equal(workflow.on[event].paths, undefined);
    assert.equal(workflow.on[event]["paths-ignore"], undefined);
  }
});

test("a PR compares its whole merge tree with the base and a push uses the previous tip", () => {
  let actualBase;
  const files = (base) => {
    actualBase = base;
    return ["README.md"];
  };
  assert.deepEqual(selectQualityChecks(context, files).checks, none);
  assert.equal(actualBase, context.event.pull_request.base.sha);
  const before = "b".repeat(40);
  assert.deepEqual(
    selectQualityChecks(
      { eventName: "push", ref: "refs/heads/dev", event: { before } },
      files,
    ).checks,
    none,
  );
  assert.equal(actualBase, before);
  const result = selectQualityChecks(context, () => {
    throw new Error("Unavailable history");
  });
  assert.deepEqual(result.checks, all);
  assert.match(result.reason, /unavailable/);
});

test("Git diff covers multiple commits, both sides of a move and more than 300 files", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "broken-ranks-ci-"));
  t.after(() => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  });
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const commit = () => {
    git("add", ".");
    git(
      "-c",
      "user.name=CI tests",
      "-c",
      "user.email=ci@example.invalid",
      "commit",
      "-qm",
      "fixture",
    );
  };
  git("init", "-q");
  mkdirSync(join(directory, "Broken_Ranks_Tool_Backend"));
  mkdirSync(join(directory, "Broken_Ranks_Tool_Frontend"));
  writeFileSync(
    join(directory, "Broken_Ranks_Tool_Backend/old.txt"),
    "same contents\n",
  );
  writeFileSync(join(directory, "README.md"), "initial\n");
  commit();
  const base = git("rev-parse", "HEAD");
  renameSync(
    join(directory, "Broken_Ranks_Tool_Backend/old.txt"),
    join(directory, "Broken_Ranks_Tool_Frontend/new.txt"),
  );
  commit();
  mkdirSync(join(directory, "docs"));
  for (let i = 0; i < 310; i++)
    writeFileSync(join(directory, `docs/report-${i}.md`), "report\n");
  commit();
  const paths = readChangedFiles(base, directory);
  assert.equal(paths.length, 312);
  assert.ok(paths.includes("Broken_Ranks_Tool_Backend/old.txt"));
  assert.ok(paths.includes("Broken_Ranks_Tool_Frontend/new.txt"));
  assert.deepEqual(classifyChanges(paths), all);
  assert.throws(
    () => readChangedFiles("0".repeat(40), directory),
    /comparison commit/,
  );
  assert.throws(
    () => readChangedFiles("--help", directory),
    /comparison commit/,
  );
  const result = selectQualityChecks(context, () =>
    readChangedFiles("f".repeat(40), directory),
  );
  assert.deepEqual(result.checks, all);

  const eventPath = join(directory, "event.json");
  const outputPath = join(directory, "output.txt");
  const summaryPath = join(directory, "summary.md");
  writeFileSync(eventPath, JSON.stringify({ before: base }));
  execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL(
          "../.github/scripts/select-quality-checks.mjs",
          import.meta.url,
        ),
      ),
    ],
    {
      cwd: directory,
      env: {
        ...process.env,
        GH_TOKEN: "",
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: "refs/heads/dev",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: summaryPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  assert.equal(
    readFileSync(outputPath, "utf8"),
    "backend=true\nfrontend=true\ninfrastructure=true\nintegration=true\n",
  );
  assert.match(
    readFileSync(summaryPath, "utf8"),
    /Checks selected from the complete Git diff/,
  );
});

const pushContext = {
  eventName: "push",
  ref: "refs/heads/dev",
  sha: "c".repeat(40),
  repository: "owner/project",
  token: "test-token",
};
const coveringPull = {
  number: 7,
  state: "open",
  mergeable: true,
  head: {
    sha: pushContext.sha,
    ref: "dev",
    repo: { full_name: pushContext.repository },
  },
  base: { ref: "master", repo: { full_name: pushContext.repository } },
};
const pullsResponse =
  (pulls, detail = coveringPull) =>
  async (url) => ({
    ok: true,
    json: async () => (url.pathname.endsWith("/7") ? detail : pulls),
  });

test("only a PR to master for the exact pushed commit replaces duplicate dev checks", async () => {
  let requests = 0;
  const number = await findCoveringPullRequest(
    pushContext,
    async (url, options) => {
      requests++;
      assert.equal(url.origin, "https://api.github.com");
      if (requests === 1) {
        assert.equal(url.pathname, "/repos/owner/project/pulls");
        assert.equal(url.searchParams.get("head"), "owner:dev");
        assert.equal(url.searchParams.get("base"), "master");
        assert.equal(url.searchParams.get("state"), "open");
      } else {
        assert.equal(url.pathname, "/repos/owner/project/pulls/7");
      }
      assert.equal(options.headers.Authorization, "Bearer test-token");
      return {
        ok: true,
        json: async () => (requests === 1 ? [coveringPull] : coveringPull),
      };
    },
  );
  assert.equal(requests, 2);
  assert.equal(number, 7);
  assert.equal(
    await findCoveringPullRequest(pushContext, pullsResponse([])),
    null,
  );
});

test("conflicting PRs, unknown mergeability and a racing head update keep push verification", async () => {
  for (const detail of [
    { ...coveringPull, mergeable: false },
    { ...coveringPull, mergeable: null },
    { ...coveringPull, mergeable: undefined },
    { ...coveringPull, number: 8 },
    { ...coveringPull, state: "closed" },
    { ...coveringPull, head: { ...coveringPull.head, sha: "d".repeat(40) } },
  ]) {
    assert.equal(
      await findCoveringPullRequest(
        pushContext,
        pullsResponse([coveringPull], detail),
      ),
      null,
    );
  }
  assert.equal(
    await findCoveringPullRequest(pushContext, async (url) =>
      url.pathname.endsWith("/7")
        ? { ok: false }
        : { ok: true, json: async () => [coveringPull] },
    ),
    null,
  );
});

test("stale, closed, fork and other-target PRs cannot suppress push verification", async () => {
  const mismatches = [
    { ...coveringPull, number: "7" },
    { ...coveringPull, state: "closed" },
    { ...coveringPull, head: { ...coveringPull.head, sha: "d".repeat(40) } },
    { ...coveringPull, head: { ...coveringPull.head, ref: "feature" } },
    {
      ...coveringPull,
      head: { ...coveringPull.head, repo: { full_name: "fork/project" } },
    },
    { ...coveringPull, base: { ...coveringPull.base, ref: "dev" } },
    {
      ...coveringPull,
      base: { ...coveringPull.base, repo: { full_name: "other/project" } },
    },
  ];
  for (const pull of mismatches) {
    assert.equal(
      await findCoveringPullRequest(pushContext, pullsResponse([pull])),
      null,
    );
  }
});

test("API errors, timeouts and malformed responses keep the push checks", async () => {
  for (const request of [
    async () => {
      throw new Error("Network timeout");
    },
    async () => ({ ok: false }),
    async () => ({
      ok: true,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    }),
    pullsResponse({ message: "Not a pull request list" }),
    pullsResponse([null, {}]),
  ]) {
    assert.equal(await findCoveringPullRequest(pushContext, request), null);
  }
});

test("PRs, master, merge queue, manual and scheduled runs never check for duplicate pushes", async () => {
  for (const overrides of [
    { eventName: "pull_request" },
    { eventName: "merge_group" },
    { eventName: "schedule" },
    { eventName: "workflow_dispatch" },
    { ref: "refs/heads/master" },
    { token: "" },
    { sha: "" },
    { repository: "" },
  ]) {
    let requested = false;
    const result = await findCoveringPullRequest(
      { ...pushContext, ...overrides },
      async () => {
        requested = true;
        return { ok: true, json: async () => [coveringPull] };
      },
    );
    assert.equal(result, null);
    assert.equal(requested, false);
  }
  assert.equal(workflow.jobs.changes.permissions["pull-requests"], "read");
  assert.equal(
    workflow.jobs.changes.steps.find((step) => step.id === "select").env
      .GH_TOKEN,
    "${{ github.token }}",
  );
});

// Conditions here use the JS-compatible subset of GitHub expressions: booleans,
// comparisons, needs.* and cancelled(). Exercise the job graph as well as the selector.
function condition(expression, needs, cancelled = false) {
  return Boolean(
    new Function(
      "needs",
      "cancelled",
      `return (${expression.replace(/^\$\{\{\s*|\s*\}\}$/g, "")});`,
    )(needs, () => cancelled),
  );
}

function dependencies(checks, result = "success", backend = "success") {
  return {
    changes: {
      result,
      outputs: Object.fromEntries(
        Object.entries(checks).map(([key, value]) => [key, String(value)]),
      ),
    },
    backend: { result: backend },
  };
}

test("frontend-only changes package the integration backend without backend tests or benchmark", () => {
  const needs = dependencies(
    classifyChanges(["Broken_Ranks_Tool_Frontend/src/app/App.jsx"]),
  );
  assert.ok(condition(workflow.jobs.backend.if, needs));
  assert.ok(condition(workflow.jobs.integration.if, needs));
  const steps = workflow.jobs.backend.steps;
  for (const name of [
    "Verify backend",
    "Verify repeated optimization under constrained heap",
  ]) {
    assert.equal(
      condition(steps.find((step) => step.name === name).if, needs),
      false,
    );
  }
  for (const name of [
    "Package backend for frontend-only integration",
    "Upload backend for API integration tests",
  ]) {
    assert.ok(condition(steps.find((step) => step.name === name).if, needs));
  }
});

test("documentation skips quality jobs and backend changes skip the mocked frontend suite", () => {
  for (const name of ["backend", "frontend", "infrastructure", "integration"]) {
    assert.equal(
      condition(
        workflow.jobs[name].if,
        dependencies(none, "success", "skipped"),
      ),
      false,
      name,
    );
  }
  const needs = dependencies(
    classifyChanges(["Broken_Ranks_Tool_Backend/pom.xml"]),
  );
  assert.equal(condition(workflow.jobs.frontend.if, needs), false);
  for (const name of ["backend", "infrastructure", "integration"])
    assert.ok(condition(workflow.jobs[name].if, needs), name);
  assert.equal(
    condition(
      workflow.jobs.integration.if,
      dependencies(all, "success", "failure"),
    ),
    false,
  );
});

test("selector failures run the full quality suite while cancellation stops new jobs", () => {
  for (const name of ["backend", "frontend", "infrastructure", "integration"]) {
    assert.ok(
      condition(workflow.jobs[name].if, dependencies({}, "failure")),
      name,
    );
    assert.equal(
      condition(workflow.jobs[name].if, dependencies(all), true),
      false,
      name,
    );
  }
  const steps = workflow.jobs.backend.steps;
  for (const name of [
    "Verify backend",
    "Verify repeated optimization under constrained heap",
    "Upload backend for API integration tests",
  ]) {
    assert.ok(
      condition(
        steps.find((step) => step.name === name).if,
        dependencies({}, "failure"),
      ),
      name,
    );
  }
});

test("all workflows cancel only outdated PR runs and keep other events independent", () => {
  for (const name of ["quality", "security", "codeql"]) {
    const config = parse(
      readFileSync(
        new URL(`../.github/workflows/${name}.yml`, import.meta.url),
        "utf8",
      ),
    );
    assert.match(config.concurrency.group, /github.workflow/);
    assert.match(config.concurrency.group, /github.event_name/);
    assert.match(
      config.concurrency.group,
      /github.event.pull_request.number \|\| github.run_id/,
    );
    assert.equal(
      config.concurrency["cancel-in-progress"],
      "${{ github.event_name == 'pull_request' }}",
    );
  }
});
