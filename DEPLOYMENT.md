# Railway deployment

The production topology contains one Railway service. Its Docker image includes the React
frontend, Spring Boot API, and the read-only SQLite catalogue. No Railway database or volume is
required while the application does not persist user data.

## Prerequisites

- Node.js 22 or newer
- Docker Desktop for the local smoke test
- Railway CLI 5.42.1 or newer
- access to `kamil-b-dev/Broken_Ranks_Tool` in Railway

## Verify locally

Run the complete container smoke test from the repository root:

```powershell
.\scripts\smoke-test.ps1
```

The test builds the image, starts it with a 1 GB memory limit, checks readiness, frontend and
initial data, runs a full optimization, and verifies that an overlapping optimization receives
HTTP 429.

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

- service memory limit: 1 GB
- service CPU limit: 1 vCPU
- compute usage email alert: 10 USD
- compute usage hard limit: 15 USD
- disable pull-request environments unless they are explicitly needed
- generate one public Railway domain for the service

## Repository security

In the GitHub repository settings, enable private vulnerability reporting before making the
application public. This is a repository setting, independent of Railway.

## Runtime safeguards

The application reads Railway's injected `PORT`. The versioned catalog database from
`Broken_Ranks_Tool_Backend/database/catalog/broken_ranks.db` is copied to `/app/data/broken_ranks.db`
inside every immutable image. Do not attach a volume unless the application starts persisting user
data; at that point migrate those writes to PostgreSQL instead of relying on image-local SQLite.
The production JDBC URL opens this catalogue in read-only mode. The image stores the application
directory, JAR, catalogue directory, and database without write permission and assigns them to root.
Treat a startup failure caused by a write attempt as a defect instead of making these paths
writable; the JVM can still use the container's temporary directory.

Public calculation endpoints are protected by per-client and whole-instance, one-minute request
limits. The production defaults allow 3 optimizer requests per client and 12 globally, and 120
calculator requests per client and 600 globally. Advisor cancellation is limited to 30 requests
per client and 300 globally. Public API reads are limited to 300 requests per client and 3000
globally. Requests larger than 256 KiB are rejected before JSON parsing, including requests
streamed without a `Content-Length` header. Tune these values with
`OPTIMIZER_CLIENT_REQUESTS_PER_MINUTE`,
`OPTIMIZER_GLOBAL_REQUESTS_PER_MINUTE`, `CALCULATOR_CLIENT_REQUESTS_PER_MINUTE`,
`CALCULATOR_GLOBAL_REQUESTS_PER_MINUTE`, `CONTROL_CLIENT_REQUESTS_PER_MINUTE`,
`CONTROL_GLOBAL_REQUESTS_PER_MINUTE`, `PUBLIC_DATA_CLIENT_REQUESTS_PER_MINUTE`,
`PUBLIC_DATA_GLOBAL_REQUESTS_PER_MINUTE`, and `ABUSE_PROTECTION_MAX_REQUEST_BYTES`. A rejected
rate limit response uses HTTP 429 and includes `Retry-After`.

The limiter is intentionally process-local. Keep the declared Railway service at one replica. Do
not enable horizontal scaling until these counters are moved to a shared store or equivalent limits
are enforced at the edge; otherwise every replica would grant a separate allowance.

The production profile trusts forwarded client addresses only when the direct proxy address
matches private, loopback, link-local, or carrier-grade NAT proxy ranges. Tomcat expects this
allowlist as a Java regular expression, not CIDR notation. Keep the service reachable through
Railway's public proxy; if the hosting topology changes, override `TRUSTED_PROXY_REGEX` with an
exact proxy-address regular expression instead of trusting arbitrary forwarded headers.

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
