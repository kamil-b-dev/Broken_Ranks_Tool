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

The application reads Railway's injected `PORT`. SQLite is copied to `/app/data/broken_ranks.db`
inside every immutable image. Do not attach a volume unless the application starts persisting user
data; at that point migrate those writes to PostgreSQL instead of relying on image-local SQLite.

## Production checks

After deployment verify:

```text
GET /actuator/health/readiness
GET /
GET /api/initial-data
```

Every response contains `X-Request-ID`. Error responses repeat that value as `requestId`, which can
be used to find the corresponding Railway log entry.

Spring Security keeps actuator metrics private on the public service. Inspect optimizer metrics
from an authenticated Railway shell or export them to a dedicated monitoring backend before they
need to be queried outside the application process.
