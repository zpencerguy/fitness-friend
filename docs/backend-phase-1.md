# BellForge Backend Phase 1

Phase 1 starts the shared backend rails for the web app and future iOS app.

The goal is not to replace the current browser-local app yet. The goal is to establish a portable API, database schema, and deployment shape that both clients can use.

## Architecture

```text
Web app / iOS app
       |
       v
BellForge API
Docker container, Cloud Run-ready
       |
       v
Postgres
Cloud SQL, Supabase, Neon, or another portable Postgres host
```

## Current Scaffold

- API app: `apps/api`
- API entry point: `apps/api/src/server.js`
- OpenAPI contract: `apps/api/openapi.yaml`
- Database schema: `apps/api/db/migrations/001_initial_schema.sql`
- Local services: `docker-compose.yml`
- API Dockerfile: `apps/api/Dockerfile`

The API can run with either:

- An in-memory repository when `DATABASE_URL` is not set.
- A Postgres repository when `DATABASE_URL` is present.

The in-memory repository keeps tests and frontend prototyping lightweight. The Postgres repository is the production path.

## Local Development

Run the API directly:

```sh
npm run api:dev
```

By default this uses the in-memory repository.

Run against Postgres:

```sh
DATABASE_URL=postgres://bellforge:bellforge@localhost:5432/bellforge npm run api:dev
```

Run the API and Postgres with Docker:

```sh
docker compose up --build
```

Health check:

```sh
curl http://localhost:8080/health
```

Development auth uses `x-user-id` as a temporary user identity:

```sh
curl http://localhost:8080/v1/equipment \
  -H "x-user-id: dev-user"
```

Create equipment:

```sh
curl http://localhost:8080/v1/equipment \
  -H "content-type: application/json" \
  -H "x-user-id: dev-user" \
  -d '{"name":"Kettlebell","category":"Weights","detail":"35 lb"}'
```

## Phase 1 Endpoints

- `GET /health`
- `GET /v1/equipment`
- `POST /v1/equipment`
- `GET /v1/workout-templates`
- `POST /v1/workout-templates`
- `GET /v1/completed-workouts`
- `POST /v1/completed-workouts`

## Database Model

Initial tables:

- `app_users`
- `profiles`
- `equipment`
- `moves`
- `workout_templates`
- `template_moves`
- `weekly_plans`
- `planned_workouts`
- `completed_workouts`
- `completed_movements`
- `favorites`
- `subscriptions`
- `entitlements`

Important choice: completed workouts support movement-level logs from the start. This enables progression tracking later:

- Weight used
- Reps completed
- Difficulty
- Muscle volume
- Last-time comparison
- Progressive overload recommendations

## Deployment Direction

The API is built to run as a container.

Preferred early deployment target:

- Cloud Run for API
- Artifact Registry for images
- Cloud SQL Postgres or portable managed Postgres
- Secret Manager for database URL and auth secrets
- GitHub Actions or Cloud Build for CI/CD

Portability rules:

- Keep schema migrations in the repo.
- Use standard Postgres.
- Keep API contract in OpenAPI.
- Keep auth JWT-based.
- Put business rules behind the API instead of directly in web or iOS clients.

## Next Backend Step

Install dependencies and exercise the Postgres adapter against Docker Postgres:

```sh
npm install
docker compose up --build
```

Then verify:

```sh
curl http://localhost:8080/health
curl http://localhost:8080/v1/equipment -H "x-user-id: dev-user"
```

After that:

1. Add real auth provider validation.
2. Add a web API client.
3. Migrate browser-local equipment/templates/history into backend records after login.
4. Add planned workout endpoints.
5. Add progress endpoints.
