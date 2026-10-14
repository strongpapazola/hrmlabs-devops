# Validation record

Date: October 14, 2026 (Asia/Jakarta).

## Checks completed

- Generated `application/package-lock.json` with npm and confirmed
  `npm ci --ignore-scripts` succeeds.
- Ran the application tests using the actual `node:24-alpine` runtime,
  Node.js v24.21.0: **5 passed, 0 failed**.
- Validated the Docker Compose configuration.
- Built the supplied Dockerfile successfully.
- Started the app and Nginx using Docker Compose v2 with `--wait`; both
  containers became healthy.
- Verified GET `/`, GET `/healthz`, GET `/missing`, POST `/healthz`, and
  HEAD `/healthz` through both the direct app port and the Nginx proxy.
  Responses were 200, 200, 404, 405, and 200 with no HEAD body, respectively.
- Verified the production environment value, configurable message,
  and proxy security headers.
- Verified app UID 1000 and Nginx UID 101, confirming non-root operation.
- Verified structured application/Nginx request logs.
- Validated the local Nginx configuration using `nginx -t`.
- Validated the separate HTTPS host template with `nginx -t` using an
  ephemeral self-signed certificate. No public certificate was issued.
- Recreated the app with a changed `APP_MESSAGE`, then confirmed the new
  response through both ports, including the already-running proxy.
- Restarted the app and verified the proxied health endpoint recovered.
- Removed the test stack with `docker compose down`.
- The GitHub-hosted `CI` workflow completed successfully, including application
  tests, Docker build, Compose startup, and HTTP integration checks.

The host already used port 8080, so validation set `APP_PORT=13000` and
`PROXY_PORT=18080`. The submitted defaults remain 3000 and 8080. For example:

```bash
APP_PORT=13000 PROXY_PORT=18080 docker compose up --build --detach \
  --wait --wait-timeout 120
```

The test environment used Docker Engine 29.1.3 and Docker Compose 2.40.3.

## Checks not completed

- No public domain, production deployment, or publicly trusted HTTPS
  certificate was configured. `hrmlabs.example.com` is an example domain.
