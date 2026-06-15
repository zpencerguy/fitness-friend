import http from "node:http";
import { createMemoryRepository } from "./repository.js";
import { getHeaderUserId, getRequestUserId, parseJsonText, readJson, requireFields, sendEmpty, sendJson } from "./http.js";

const DEFAULT_PORT = 8080;

export function createApiServer({ repository = createMemoryRepository() } = {}) {
  return http.createServer(async (request, response) => {
    try {
      if (request.method === "OPTIONS") {
        sendEmpty(response);
        return;
      }

      const url = new URL(request.url ?? "/", "http://localhost");
      const userId = getRequestUserId(request);

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, {
          ok: true,
          service: "bellforge-api",
          version: "0.1.0",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/equipment") {
        sendJson(response, 200, { data: await repository.listEquipment(userId) });
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/equipment") {
        const payload = await readJson(request);
        requireFields(payload, ["name", "category"]);
        sendJson(response, 201, { data: await repository.createEquipment(userId, payload) });
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/workout-templates") {
        sendJson(response, 200, { data: await repository.listWorkoutTemplates(userId) });
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/workout-templates") {
        const payload = await readJson(request);
        requireFields(payload, ["name"]);
        sendJson(response, 201, { data: await repository.createWorkoutTemplate(userId, payload) });
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/completed-workouts") {
        sendJson(response, 200, { data: await repository.listCompletedWorkouts(userId) });
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/completed-workouts") {
        const payload = await readJson(request);
        requireFields(payload, ["name", "rounds", "durationSeconds", "plannedDurationSeconds"]);
        sendJson(response, 201, { data: await repository.createCompletedWorkout(userId, payload) });
        return;
      }

      sendJson(response, 404, {
        error: {
          code: "not_found",
          message: "Route not found.",
        },
      });
    } catch (error) {
      sendJson(response, error.statusCode ?? 500, {
        error: {
          code: error.statusCode ? "bad_request" : "internal_error",
          message: error.message ?? "Unexpected API error.",
        },
      });
    }
  });
}

export async function handleApiRequest({
  repository = createMemoryRepository(),
  method = "GET",
  path = "/",
  headers = {},
  body = "",
} = {}) {
  const userId = getHeaderUserId(headers);

  if (method === "GET" && path === "/health") {
    return {
      statusCode: 200,
      body: {
        ok: true,
        service: "bellforge-api",
        version: "0.1.0",
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (method === "GET" && path === "/v1/equipment") {
    return { statusCode: 200, body: { data: await repository.listEquipment(userId) } };
  }

  if (method === "POST" && path === "/v1/equipment") {
    const payload = parseJsonText(body);
    requireFields(payload, ["name", "category"]);
    return { statusCode: 201, body: { data: await repository.createEquipment(userId, payload) } };
  }

  if (method === "GET" && path === "/v1/workout-templates") {
    return { statusCode: 200, body: { data: await repository.listWorkoutTemplates(userId) } };
  }

  if (method === "POST" && path === "/v1/workout-templates") {
    const payload = parseJsonText(body);
    requireFields(payload, ["name"]);
    return { statusCode: 201, body: { data: await repository.createWorkoutTemplate(userId, payload) } };
  }

  if (method === "GET" && path === "/v1/completed-workouts") {
    return { statusCode: 200, body: { data: await repository.listCompletedWorkouts(userId) } };
  }

  if (method === "POST" && path === "/v1/completed-workouts") {
    const payload = parseJsonText(body);
    requireFields(payload, ["name", "rounds", "durationSeconds", "plannedDurationSeconds"]);
    return { statusCode: 201, body: { data: await repository.createCompletedWorkout(userId, payload) } };
  }

  return {
    statusCode: 404,
    body: {
      error: {
        code: "not_found",
        message: "Route not found.",
      },
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const repository = await createConfiguredRepository();
  const server = createApiServer({ repository });

  server.listen(port, () => {
    console.log(`BellForge API listening on http://localhost:${port}`);
  });
}

export async function createConfiguredRepository(env = process.env) {
  if (!env.DATABASE_URL) return createMemoryRepository();

  const { createPostgresRepository } = await import("./postgres-repository.js");
  return createPostgresRepository({
    connectionString: env.DATABASE_URL,
  });
}
