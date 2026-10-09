import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "yaml";

const readYaml = (name) =>
  parse(readFileSync(new URL(`../.github/${name}`, import.meta.url), "utf8"));
const security = readYaml("workflows/security.yml");

test("security checks cannot skip code-only pull requests or merge queue commits", () => {
  for (const event of ["pull_request", "push", "merge_group"]) {
    assert.ok(
      Object.hasOwn(security.on, event),
      `Missing ${event} security checks`,
    );
    assert.equal(security.on[event]?.paths, undefined);
    assert.equal(security.on[event]?.["paths-ignore"], undefined);
  }
  assert.ok(
    security.on.schedule.some(({ cron }) =>
      cron
        .trim()
        .split(/\s+/)
        .slice(2)
        .every((field) => field === "*"),
    ),
  );
  for (const workflow of ["quality.yml", "codeql.yml"]) {
    assert.ok(
      Object.hasOwn(readYaml(`workflows/${workflow}`).on, "merge_group"),
    );
  }
});

test("container policy fails on fixable high and critical vulnerabilities", () => {
  const job = security.jobs["container-audit"];
  assert.equal(job["continue-on-error"], undefined);
  const gate = job.steps.find(
    ({ name }) => name === "Enforce container vulnerability policy",
  );
  assert.ok(gate);
  assert.equal(gate["continue-on-error"], undefined);
  assert.equal(gate.with["exit-code"], "1");
  assert.equal(gate.with.scanners, "vuln");
  assert.deepEqual(gate.with.severity.split(",").sort(), ["CRITICAL", "HIGH"]);
  assert.equal(gate.with["ignore-unfixed"], true);
  assert.ok(
    job.steps.some(({ run }) =>
      run?.includes("docker build --pull --no-cache"),
    ),
  );
});

test("backend and npm scans remain mandatory", () => {
  const backend = security.jobs["backend-audit"];
  assert.equal(backend["continue-on-error"], undefined);
  assert.match(backend.uses, /^google\/osv-scanner-action\//);
  assert.match(
    backend.with["scan-args"],
    /--lockfile=.*Broken_Ranks_Tool_Backend\/pom\.xml/,
  );
  assert.doesNotMatch(
    backend.with["scan-args"],
    /--no-resolve|--config|--call-analysis/,
  );
  for (const name of ["frontend-audit", "infrastructure-audit"]) {
    const job = security.jobs[name];
    assert.equal(job["continue-on-error"], undefined);
    assert.ok(
      job.steps.some(
        ({ run, ...step }) =>
          run === "npm audit --audit-level=high" && !step["continue-on-error"],
      ),
    );
  }
});

test("Maven updates cover dev and the default branch daily without bundling majors", () => {
  const updates = readYaml("dependabot.yml").updates.filter(
    (entry) => entry["package-ecosystem"] === "maven",
  );
  assert.ok(updates.some((entry) => entry["target-branch"] === "dev"));
  assert.ok(updates.some((entry) => entry["target-branch"] === undefined));
  for (const entry of updates) {
    assert.equal(entry.schedule.interval, "daily");
    for (const group of Object.values(entry.groups)) {
      if (group["applies-to"] === "version-updates") {
        assert.deepEqual([...group["update-types"]].sort(), ["minor", "patch"]);
      }
    }
  }
});
