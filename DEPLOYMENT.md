# Railway deployment

Operational monitoring, release and rollback procedures, browser-library recovery,
and the Railway settings still requiring dashboard verification are documented in
[`docs/utrzymanie-produkcji.md`](docs/utrzymanie-produkcji.md).

The production topology contains one Railway service. Its Docker image includes the React
frontend, Spring Boot API, and the read-only SQLite catalogue. No Railway database or volume is
required while the application does not persist user data.

## Prerequisites

- Node.js 22.13 or newer (Vite requires at least 22.12; the root ESLint requires 22.13)
- Docker Desktop for the local smoke test
- Railway CLI 5.42.1 or newer
- access to `kamil-b-dev/Broken_Ranks_Tool` in Railway

## Verify locally

Run the complete container smoke test from the repository root:

```powershell
.\scripts\smoke-test.ps1
```

The test builds the image, starts it with a 4 GB memory limit, checks readiness, frontend and
initial data, runs an optimization, and checks that its setup passes the calculator with matching
statistics. Overlapping requests and HTTP 429 are covered separately by backend tests and the
real-backend Playwright integration suite.

## Create or update Railway infrastructure

Install the pinned Infrastructure as Code SDK dependency:

```powershell
npm ci
```

Authenticate and link the desired Railway workspace/environment, then review the plan before
applying it:

```powershell
railway login
railway link
npm run railway:plan
npm run railway:apply
```

`.railway/railway.ts` declares one replica in the EU region, the production Spring profile,
readiness healthcheck, JVM memory limits, and optimizer concurrency. Railway detects the root
`Dockerfile` automatically. Infrastructure as Code follows the repository's `master` branch, so
deploy these commits there before applying the plan.

## Railway dashboard limits

Configure settings that are scoped to the Railway workspace and billing account in the dashboard:

- service memory limit: 4 GB
- service CPU limit: 1 vCPU
- compute usage email alert: 10 USD
- compute usage hard limit: 15 USD
- disable pull-request environments unless they are explicitly needed
- generate one public Railway domain for the service

## Repository security

In the GitHub repository settings, enable private vulnerability reporting before making the
application public. This is a repository setting, independent of Railway.

Dependency security checks run on every pull request and push to `dev` or `master`, in merge
queues, and daily even without code changes. Keep these checks required in the branch rules:
`Audit backend dependencies / osv-scan`, `Scan production container`, `Audit frontend dependencies`, and
`Audit infrastructure dependencies`, alongside the quality checks. Do not bypass failed scans.

Dependabot checks Maven dependencies daily on both `dev` and the default branch, including the
Spring Boot parent and explicit Jackson BOM/Tomcat security overrides. Minor and patch updates
are grouped; major updates get separate pull requests so compatibility changes are tested.
Enable the dependency graph, Dependabot alerts, and Dependabot security updates in GitHub's
repository settings; these settings are separate from `.github/dependabot.yml`. Merge tested
updates into `dev` promptly and keep the default branch aligned. New CVEs can still require a
new update; a past successful scan does not guarantee future scanner results.

## Runtime safeguards

The application reads Railway's injected `PORT`. The versioned catalog database from
`Broken_Ranks_Tool_Backend/database/catalog/broken_ranks.db` is copied to `/app/data/broken_ranks.db`
inside every immutable image. Do not attach a volume unless the application starts persisting user
data; at that point migrate those writes to PostgreSQL instead of relying on image-local SQLite.
The production JDBC URL opens this catalogue in read-only mode. The image stores the application
directory, JAR, catalogue directory, and database without write permission and assigns them to root.
Treat a startup failure caused by a write attempt as a defect instead of making these paths
writable; the JVM can still use the container's temporary directory.
SQLite JDBC loads its native shared library from the JVM temporary directory. When running
with a read-only root filesystem and a tmpfs at `/tmp`, explicitly use
`--tmpfs /tmp:rw,exec,nosuid,size=128m`; Docker's default `noexec` tmpfs prevents this library
from loading. The catalogue and application paths remain read-only.

The image itself supplies `JAVA_TOOL_OPTIONS` for a 4 GB container: a 128 MB initial heap,
2 GB maximum heap, 256 MB maximum metaspace, and G1 GC. The heap grows as needed;
the application does not reserve 2 GB of physical RAM at startup. After at least 60 seconds
without a GC pause, periodic G1 collections can advance the collection cycle, allowing unused committed heap to be returned
to the operating system during quiet periods. This preserves the 2 GB peak heap and all search
budgets. It adds a small amount of background GC work; it does not call `System.gc()` or request
periodic stop-the-world Full GC. See [G1 periodic collections](https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html).
Railway may override this variable; keep room
for non-heap memory when changing it. `-XX:+ExitOnOutOfMemoryError` is also enforced
in the image entrypoint, so a heap failure terminates the process instead of leaving
a live JVM with a failed HTTP poller. Configure Railway to restart failed deployments;
the readiness endpoint alone cannot restart a process that fails after startup.

Optimizer memoization is local to a run and bounded: at most 8192 evaluations per
search context, 512 numeric calculations per session, and 512 formatted calculations.
Focused variants share the calculator session but have separate bounded evaluation
caches. Eviction recalculates a candidate without reducing search budgets or discarding
the best build. These bounds reduce retained memory; they are not a guarantee against
all possible allocation spikes or memory leaks.

Both optimizer modes reject new work with HTTP 503 and code `OPTIMIZER_MEMORY_PRESSURE`
when used JVM heap reaches 85% of its maximum. The worker permit is released immediately;
no search starts and no valid result in progress is discarded. Admission resumes when
usage falls below the threshold. This is a check of current heap occupancy, including
objects not yet collected, rather than a prediction of the next search's allocations.
The admission check does not trigger GC. `OPTIMIZER_MEMORY_MAX_HEAP_USAGE_PERCENT` may override the threshold
within 1–95%. Internal metrics `optimizer.memory.rejected` and
`optimizer.memory.headroom.bytes` track rejections and remaining heap capacity.

Advisor caches retain at most 2048 slot contributions and 1024 entries each for equipment
values, item values and drif values. Evicted entries are recalculated using the same
catalogue snapshot; search deduplication and proof candidates are not evicted.

The production HTTP server has at most 64 worker threads (8 spare), 512 connections,
and an accept backlog of 64. Bodies are received with non-blocking servlet I/O before
security and MVC parse them, with a 256 KiB limit, a 15-second total receive timeout,
at most 8 pending bodies and at most 2 per identified client. Slow senders do not occupy
HTTP workers. The servlet timeout check can add approximately one second of scheduling
granularity. Rejected unfinished bodies are not drained on worker threads.
`REQUEST_BODY_TIMEOUT`, `REQUEST_BODY_MAX_PENDING_REQUESTS` and
`REQUEST_BODY_MAX_PENDING_PER_CLIENT` tune these bounds. Standard Spring variables such as
`SERVER_TOMCAT_THREADS_MAX` can override these limits when measured throughput requires it.

The image and Railway IaC use the following limits for the 4 GB service. If the Railway
dashboard already has a `JAVA_TOOL_OPTIONS` value, update it to match when deploying
this version; an older dashboard value can override the Docker image defaults:

```text
JAVA_TOOL_OPTIONS=-Xms128m -Xmx2g -XX:MaxMetaspaceSize=256m -XX:+UseG1GC -XX:G1PeriodicGCInterval=60000 -XX:+G1PeriodicGCInvokesConcurrent -XX:+ExitOnOutOfMemoryError
```

This gives the heap 2 GB while reserving room for native JVM memory, thread stacks,
and the rest of the container. It does not change the automatic exit-on-OOM entrypoint.

The production SQLite pool keeps one idle connection rather than ten. It can still grow to
ten connections during request bursts and retires surplus idle connections after 60 seconds
(plus the pool housekeeping delay). This reduces idle native SQLite caches without limiting
the existing peak connection capacity. Standard `SPRING_DATASOURCE_HIKARI_*` environment
variables can override these settings.

To compare runtime memory and CPU locally, package the backend and run this PowerShell 7
benchmark from the repository root with JDK 21 selected in `JAVA_HOME`:

```powershell
./scripts/measure-hosting-resources.ps1
```

The script starts two isolated local JVMs in sequence with the same JAR, catalogue, heap limit,
and Archer workload. It compares the previous runtime settings against periodic concurrent GC
and a single warm SQLite connection, measures ten minutes of idle time, and verifies the next
request after idle. Every build and variant is checked against the calculator and compared
across runs. It writes process memory samples, CPU/request timings, GC logs, and a summary to
`tmp/hosting-resources/`. It never requests Full GC. Windows process memory is diagnostic;
use Railway memory and CPU measurements after deployment to establish actual billing savings.
The benchmark does not simulate sustained concurrent traffic or all optimizer inputs.
G1 may need several periodic cycles to finish mixed collections and reclaim the idle heap;
a shorter `-IdleSeconds` run can end before memory is returned. Do not interpret the periodic
interval as a guarantee that the process shrinks within one minute.

Local verification on 2026-10-27 used the production Linux image with a 4 GB limit and 1 vCPU.
After an Archer search with variants, Docker reported 875.5 MiB, falling to 548.1 MiB after
146 seconds of idle time (about 37% below the post-search sample). This measures reclamation
within the updated process, rather than a monthly cost reduction. A separate before/after
Windows run returned identical builds, statistics and variants, including requests after idle;
its 130-second idle window was too short to demonstrate reclamation. Use the longer default
benchmark window and Railway's average memory/CPU usage to assess production savings.

The manual Archer benchmark can verify repeated searches under a constrained heap
after compiling the backend normally:

```powershell
cd Broken_Ranks_Tool_Backend
$env:JAVA_TOOL_OPTIONS = "-Xmx128m"
./mvnw.cmd -Dtest=OptimizationArcherPerformanceBenchmark -Doptimizer.memory.repetitions=3 test
Remove-Item Env:JAVA_TOOL_OPTIONS
```

The manual `EquipmentCalculationPerformanceBenchmark` measures CPU and allocations in the
shared prepared calculator. See the [calculator measurements](docs/wydajnosc-kalkulatora-2026-10-28.md)
for the procedure, observed reductions, and limits of the local comparison.

Neighborhood beam selection uses the same ranking and width with bounded top-k selection.
See the [search measurements](docs/wydajnosc-wyszukiwania-2026-10-28.md) for the selection
benchmark and the before/after build and search-budget comparison.

Search-state signatures also reuse immutable slot ordering and avoid temporary per-slot
strings. See the [state-signature measurements](docs/wydajnosc-sygnatur-stanow-2026-10-28.md)
for allocation measurements and the exact-output comparison.

Public endpoints have per-client and whole-instance one-minute request limits. Optimizer and
progression requests have two budgets: ingress (including malformed input) and admission to heavy
work after JSON parsing and DTO validation. Malformed JSON and invalid DTOs cannot consume the
20-per-minute global analysis allowance. Requests rejected as busy or under memory pressure also
do not consume it. Semantic checks inside an admitted analysis still count as work.
Ingress defaults to 60 requests per client and 600 globally; analysis admission defaults to 5
per client and 20 globally. Calculator, control and public-read defaults are respectively
120/600, 30/300 and 300/3000 per client/globally.
Requests larger than 256 KiB are rejected before JSON parsing, including requests
streamed without a `Content-Length` header. Tune the limits with
`OPTIMIZER_INGRESS_CLIENT_REQUESTS_PER_MINUTE`, `OPTIMIZER_INGRESS_GLOBAL_REQUESTS_PER_MINUTE`,
`OPTIMIZER_CLIENT_REQUESTS_PER_MINUTE`,
`OPTIMIZER_GLOBAL_REQUESTS_PER_MINUTE`, `CALCULATOR_CLIENT_REQUESTS_PER_MINUTE`,
`CALCULATOR_GLOBAL_REQUESTS_PER_MINUTE`, `CONTROL_CLIENT_REQUESTS_PER_MINUTE`,
`CONTROL_GLOBAL_REQUESTS_PER_MINUTE`, `PUBLIC_DATA_CLIENT_REQUESTS_PER_MINUTE`,
`PUBLIC_DATA_GLOBAL_REQUESTS_PER_MINUTE`, and `ABUSE_PROTECTION_MAX_REQUEST_BYTES`. A rejected
rate limit response uses HTTP 429 and includes `Retry-After`.
For optimizer modes and progression planning, the frontend uses the returned seconds to show
a countdown beside the run button and disable further calculation requests until that deadline.
The cooldown is shared across these views in the open application and resynchronizes when the
browser tab becomes active. Expiry enables manual retry; other users may still exhaust the global
quota. Missing or invalid headers leave manual retry available. Requests are never retried automatically.

The limiter is intentionally process-local. Keep the declared Railway service at one replica. Do
not enable horizontal scaling until these counters are moved to a shared store or equivalent limits
are enforced at the edge; otherwise every replica would grant a separate allowance.

By default, client-supplied forwarding headers are ignored; native forwarded addresses are trusted
only from loopback or exact proxy addresses configured in `TRUSTED_PROXY_REGEX`. Never trust whole
private, link-local or carrier-grade NAT ranges. An unidentified private intermediary receives
the global pending-body bound so its users are not all restricted to two simultaneous uploads.

The production service has been confirmed to be reachable **exclusively through Railway's
public HTTP/HTTPS edge**. Its IaC sets `TRUST_RAILWAY_CLIENT_IP=true` and the per-client
budgets above; no local opt-in variable is needed when planning or applying this configuration.
The application uses Railway's single numeric `X-Real-IP`, normalizing IPv4 and IPv6 without
resolving hostnames. Missing, malformed or duplicate values fall back to the transport address.
This mode is unsafe if an untrusted caller can reach the application through a TCP proxy or a
direct connection, because that caller could forge `X-Real-IP`. Do not enable it for an additional
CDN/proxy without verifying which address Railway reports. Deployments outside the declared
Railway topology keep this feature disabled by default.

If the network topology changes, disable this header trust before exposing a direct or TCP path
and configure the new trust boundary. The separated analysis budget and non-blocking body bounds
still apply without header trust, but separate client-IP quotas need trusted client addresses.
No application-level setting guarantees protection against a distributed flood;
keep an operational WAF/edge response available.

Advisor cancellation requires both its random run identifier and a separate random cancellation
token sent in `X-Advisor-Cancellation-Token`. Treat both values as short-lived secrets and never
write request bodies or this header to logs.

Successful public catalogue responses use `Cache-Control: public, max-age=3600`. Vite's
content-hashed files under `/assets/` use a one-year public immutable cache, while HTML, write and
error responses remain uncached. Railway Edge Rules may use a longer cache TTL for immutable GET
API endpoints if traffic grows.

## Production checks

After deployment verify:

```text
GET /actuator/health/readiness
GET /
GET /api/initial-data
```

Every response contains `X-Request-ID`. Error responses repeat that value as `requestId`, which can
be used to find the corresponding Railway log entry. Production console logs use structured
Logstash JSON; MDC fields place the same `requestId` in a searchable top-level field.

Spring Security keeps actuator metrics private on the public service. Inspect optimizer metrics
from an authenticated Railway shell or export them to a dedicated monitoring backend before they
need to be queried outside the application process.
