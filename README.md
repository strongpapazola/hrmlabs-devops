# HRM Labs DevOps assessment

Candidate: Bintang Cahya Putra

Assessment date: October 14, 2026

This repository contains the runnable mini project for Part I of the assessment.
The application uses Node.js 24 and its built-in HTTP server.
It has no third-party dependencies and does not require a database.

## Requirements

- Docker Engine or Docker Desktop with the Docker Compose v2 plugin.
- Git and curl for cloning and verification.
- Node.js 24 with npm only if running tests outside Docker.
- Internet access on the first build to download the public container images.

Install Docker using https://docs.docker.com/engine/install/ or Docker Desktop.
Check `docker --version` and `docker compose version`. On Linux, use an account
authorized to access Docker; follow your organization's access policy.

## Project structure

```text
application/
  package.json
  package-lock.json
  src/server.js
  test/server.test.js
Dockerfile
docker-compose.yml
nginx/
  nginx.conf
  hrmlabs-https.conf
.github/workflows/ci.yml
.env.example
.gitignore
.dockerignore
README.md
VALIDATION.md
```

## Build and start

Run these commands from the submission directory:

```bash
cp .env.example .env
docker compose config --quiet
docker compose up --build --detach --wait --wait-timeout 120
docker compose ps
curl --fail http://localhost:3000/
curl --fail http://localhost:8080/
curl --fail http://localhost:8080/healthz
```

`http://localhost:3000` reaches the application directly. `http://localhost:8080`
passes through Nginx. Both published ports bind to the local host for this demo.
The application listens on `0.0.0.0:3000` inside its container so Nginx can reach
it using the Docker service name `app`.

Edit `APP_MESSAGE` in `.env`, then run `docker compose up --detach` to recreate
the service with its updated environment. `.env.example` contains a harmless
example message. This project does not contain or need production credentials.

## Logs, stop, restart, and rebuild

```bash
docker compose logs --follow --tail 100 app nginx
docker compose stop
docker compose start
docker compose restart app
docker compose up --build --detach --wait --wait-timeout 120
docker compose down
```

Application request logs are JSON written to stdout, with method, path, status,
and duration. Nginx writes access logs to stdout and errors to stderr. Docker
rotates each service's logs at 10 MB and retains three files. Secrets, request
bodies, and URL query strings are excluded from application logs.

The app runs as the unprivileged `node` user. Nginx runs as the `nginx` user on
container port 8080. Both use read-only root filesystems, a temporary writable
directory, dropped Linux capabilities, and `no-new-privileges`.

## Tests

With Node.js 24 and npm installed:

```bash
cd application
npm ci --ignore-scripts
npm test
```

Or, from the submission root, use a disposable Node container:

```bash
docker run --rm --user "$(id -u):$(id -g)" \
  -e npm_config_cache=/tmp/npm-cache \
  -v "$PWD/application:/app" -w /app node:24-alpine \
  sh -c 'npm ci --ignore-scripts && npm test'
```

Tests verify the configurable response, health endpoint, unknown route,
unsupported HTTP method, and HEAD responses. `/healthz` reports process health;
there is no database dependency in this mini project. A production service with
a database should distinguish liveness from readiness and check required
dependencies in its readiness endpoint.

## CI pipeline

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests targeting
`main` or `develop`, and manual dispatch. It installs dependencies using the
lockfile, runs tests, validates Compose, builds the image, starts both services,
and checks the direct and proxied health endpoints. Container logs and a build
summary are collected even if a step fails. Containers are then removed.

A failed test prevents the build/start step. A failed Docker build or health
check marks the workflow failed. There is no automated deployment in this
basic workflow. The workflow requests only read access to repository contents.

## Troubleshooting

1. **Cannot access Docker:** check the daemon with `docker info` and confirm the
   current account is permitted to use it.
2. **Port already allocated:** run `ss -ltnp` and check ports 3000 and 8080. Stop
   the conflicting local demo or set `APP_PORT`/`PROXY_PORT` to available ports
   in `.env`. Use those ports in curl checks.
3. **Application unhealthy:** run `docker compose ps -a` and
   `docker compose logs --tail 100 app`. Confirm `PORT=3000` and inspect
   `docker inspect` for the app container's health-check output.
4. **Nginx returns 502:** check app health and run
   `docker compose exec nginx wget -qO- http://app:3000/healthz`. Confirm both
   services share the `frontend` network. Nginx re-resolves the app name every
   10 seconds when the container IP changes.
5. **Nginx configuration error:** run `docker compose exec nginx nginx -t`.
   The included `nginx.conf` is a complete local HTTP configuration.
6. **Settings did not change:** `docker compose restart` does not reload changed
   environment values. Run `docker compose up --detach` to recreate the service.

`restart: unless-stopped` restarts a container when its process exits. Docker
does not restart an otherwise running container solely because its health check
becomes unhealthy. Health failures need monitoring and an operator or an
orchestrator's remediation policy. `depends_on: service_healthy` controls the
initial start order; it does not provide ongoing dependency recovery.

## HTTPS configuration for Part E

`nginx/hrmlabs-https.conf` is a separate **host-installed Nginx** template. Its
upstream is `127.0.0.1:3000`, matching Part E. It is not mounted into the local
Compose proxy: a container's `localhost` would refer to that container.

`hrmlabs.example.com` is a reserved example hostname. A publicly trusted
certificate cannot be issued for a domain the candidate does not control.
To deploy HTTPS, replace it with a real hostname, configure DNS, allow the
appropriate ACME challenge and HTTPS traffic, obtain a certificate, and only
then enable this template. Do not commit the private key.

For a real hostname on an Ubuntu host with Nginx and Certbot installed, first
configure an HTTP server block for that hostname and verify that DNS reaches
the server. Then use `sudo certbot --nginx -d <real-hostname>`. Keep the generated
configuration or adapt the provided template to its certificate paths.
Verify `sudo nginx -t`, reload Nginx, and run `sudo certbot renew --dry-run`.
Enable HSTS after verifying HTTPS; add subdomain or preload directives only
after reviewing every affected hostname. Real TLS issuance is outside this
local demo and is not claimed as completed.

## Validation

Review `VALIDATION.md` for the checks performed and deployment limitations.
