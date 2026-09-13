# Security policy

## Supported version

Security fixes are applied to the current `master` branch. The `dev` branch is
the integration branch and may contain changes that have not reached production.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue. Use GitHub's
private **Report a vulnerability** form in the repository Security tab and
include:

- the affected endpoint or component and commit/version;
- reproducible steps or a minimal proof of concept;
- the expected impact and any known prerequisites;
- suggested remediation, if available.

Avoid accessing data that is not yours, degrading the hosted service, or running
high-volume tests. Maintainers should acknowledge a complete report within seven
days, provide a status update within fourteen days, and coordinate disclosure
after a fix is available.

Dependency alerts and automated scanner results are triaged using the same
process. A scanner finding is not considered exploitable until its affected code
path and production configuration have been reviewed.
