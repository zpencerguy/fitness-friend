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

      const equipmentMatch = url.pathname.match(/^\/v1\/equipment\/([^/]+)$/);

      if (equipmentMatch && isUpdateMethod(request.method)) {
        const payload = await readJson(request);
        sendJson(response, 200, { data: await repository.updateEquipment(userId, equipmentMatch[1], payload) });
        return;
      }

      if (equipmentMatch && request.method === "DELETE") {
        await repository.deleteEquipment(userId, equipmentMatch[1]);
        sendEmpty(response, 204);
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/moves") {
        sendJson(response, 200, { data: await repository.listMoves(userId) });
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/moves") {
        const payload = await readJson(request);
        requireFields(payload, ["name"]);
        sendJson(response, 201, { data: await repository.createMove(userId, payload) });
        return;
      }

      const moveMatch = url.pathname.match(/^\/v1\/moves\/([^/]+)$/);

      if (moveMatch && isUpdateMethod(request.method)) {
        const payload = await readJson(request);
        sendJson(response, 200, { data: await repository.updateMove(userId, moveMatch[1], payload) });
        return;
      }

      if (moveMatch && request.method === "DELETE") {
        await repository.deleteMove(userId, moveMatch[1]);
        sendEmpty(response, 204);
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

      const templateMatch = url.pathname.match(/^\/v1\/workout-templates\/([^/]+)$/);

      if (templateMatch && isUpdateMethod(request.method)) {
        const payload = await readJson(request);
        sendJson(response, 200, { data: await repository.updateWorkoutTemplate(userId, templateMatch[1], payload) });
        return;
      }

      if (templateMatch && request.method === "DELETE") {
        await repository.deleteWorkoutTemplate(userId, templateMatch[1]);
        sendEmpty(response, 204);
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/planned-workouts") {
        sendJson(response, 200, { data: await repository.listPlannedWorkouts(userId) });
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/planned-workouts") {
        const payload = await readJson(request);
        requireFields(payload, ["plannedDate", "workoutName", "plannedDurationSeconds"]);
        sendJson(response, 201, { data: await repository.createPlannedWorkout(userId, payload) });
        return;
      }

      const plannedWorkoutMatch = url.pathname.match(/^\/v1\/planned-workouts\/([^/]+)$/);

      if (plannedWorkoutMatch && isUpdateMethod(request.method)) {
        const payload = await readJson(request);
        sendJson(response, 200, {
          data: await repository.updatePlannedWorkout(userId, plannedWorkoutMatch[1], payload),
        });
        return;
      }

      if (plannedWorkoutMatch && request.method === "DELETE") {
        await repository.deletePlannedWorkout(userId, plannedWorkoutMatch[1]);
        sendEmpty(response, 204);
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

      const completedWorkoutMatch = url.pathname.match(/^\/v1\/completed-workouts\/([^/]+)$/);

      if (completedWorkoutMatch && isUpdateMethod(request.method)) {
        const payload = await readJson(request);
        sendJson(response, 200, {
          data: await repository.updateCompletedWorkout(userId, completedWorkoutMatch[1], payload),
        });
        return;
      }

      if (completedWorkoutMatch && request.method === "DELETE") {
        await repository.deleteCompletedWorkout(userId, completedWorkoutMatch[1]);
        sendEmpty(response, 204);
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/programs") {
        sendJson(response, 200, { data: await repository.listPrograms(userId) });
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/programs") {
        const payload = await readJson(request);
        requireFields(payload, ["name"]);
        sendJson(response, 201, { data: await repository.createProgram(userId, payload) });
        return;
      }

      const programMatch = url.pathname.match(/^\/v1\/programs\/([^/]+)$/);

      if (programMatch && isUpdateMethod(request.method)) {
        const payload = await readJson(request);
        sendJson(response, 200, { data: await repository.updateProgram(userId, programMatch[1], payload) });
        return;
      }

      if (programMatch && request.method === "DELETE") {
        await repository.deleteProgram(userId, programMatch[1]);
        sendEmpty(response, 204);
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

  const equipmentMatch = path.match(/^\/v1\/equipment\/([^/]+)$/);

  if (equipmentMatch && isUpdateMethod(method)) {
    return {
      statusCode: 200,
      body: { data: await repository.updateEquipment(userId, equipmentMatch[1], parseJsonText(body)) },
    };
  }

  if (equipmentMatch && method === "DELETE") {
    await repository.deleteEquipment(userId, equipmentMatch[1]);
    return { statusCode: 204, body: null };
  }

  if (method === "GET" && path === "/v1/moves") {
    return { statusCode: 200, body: { data: await repository.listMoves(userId) } };
  }

  if (method === "POST" && path === "/v1/moves") {
    const payload = parseJsonText(body);
    requireFields(payload, ["name"]);
    return { statusCode: 201, body: { data: await repository.createMove(userId, payload) } };
  }

  const moveMatch = path.match(/^\/v1\/moves\/([^/]+)$/);

  if (moveMatch && isUpdateMethod(method)) {
    return { statusCode: 200, body: { data: await repository.updateMove(userId, moveMatch[1], parseJsonText(body)) } };
  }

  if (moveMatch && method === "DELETE") {
    await repository.deleteMove(userId, moveMatch[1]);
    return { statusCode: 204, body: null };
  }

  if (method === "GET" && path === "/v1/workout-templates") {
    return { statusCode: 200, body: { data: await repository.listWorkoutTemplates(userId) } };
  }

  if (method === "POST" && path === "/v1/workout-templates") {
    const payload = parseJsonText(body);
    requireFields(payload, ["name"]);
    return { statusCode: 201, body: { data: await repository.createWorkoutTemplate(userId, payload) } };
  }

  const templateMatch = path.match(/^\/v1\/workout-templates\/([^/]+)$/);

  if (templateMatch && isUpdateMethod(method)) {
    return {
      statusCode: 200,
      body: { data: await repository.updateWorkoutTemplate(userId, templateMatch[1], parseJsonText(body)) },
    };
  }

  if (templateMatch && method === "DELETE") {
    await repository.deleteWorkoutTemplate(userId, templateMatch[1]);
    return { statusCode: 204, body: null };
  }

  if (method === "GET" && path === "/v1/planned-workouts") {
    return { statusCode: 200, body: { data: await repository.listPlannedWorkouts(userId) } };
  }

  if (method === "POST" && path === "/v1/planned-workouts") {
    const payload = parseJsonText(body);
    requireFields(payload, ["plannedDate", "workoutName", "plannedDurationSeconds"]);
    return { statusCode: 201, body: { data: await repository.createPlannedWorkout(userId, payload) } };
  }

  const plannedWorkoutMatch = path.match(/^\/v1\/planned-workouts\/([^/]+)$/);

  if (plannedWorkoutMatch && isUpdateMethod(method)) {
    return {
      statusCode: 200,
      body: { data: await repository.updatePlannedWorkout(userId, plannedWorkoutMatch[1], parseJsonText(body)) },
    };
  }

  if (plannedWorkoutMatch && method === "DELETE") {
    await repository.deletePlannedWorkout(userId, plannedWorkoutMatch[1]);
    return { statusCode: 204, body: null };
  }

  if (method === "GET" && path === "/v1/completed-workouts") {
    return { statusCode: 200, body: { data: await repository.listCompletedWorkouts(userId) } };
  }

  if (method === "POST" && path === "/v1/completed-workouts") {
    const payload = parseJsonText(body);
    requireFields(payload, ["name", "rounds", "durationSeconds", "plannedDurationSeconds"]);
    return { statusCode: 201, body: { data: await repository.createCompletedWorkout(userId, payload) } };
  }

  const completedWorkoutMatch = path.match(/^\/v1\/completed-workouts\/([^/]+)$/);

  if (completedWorkoutMatch && isUpdateMethod(method)) {
    return {
      statusCode: 200,
      body: { data: await repository.updateCompletedWorkout(userId, completedWorkoutMatch[1], parseJsonText(body)) },
    };
  }

  if (completedWorkoutMatch && method === "DELETE") {
    await repository.deleteCompletedWorkout(userId, completedWorkoutMatch[1]);
    return { statusCode: 204, body: null };
  }

  if (method === "GET" && path === "/v1/programs") {
    return { statusCode: 200, body: { data: await repository.listPrograms(userId) } };
  }

  if (method === "POST" && path === "/v1/programs") {
    const payload = parseJsonText(body);
    requireFields(payload, ["name"]);
    return { statusCode: 201, body: { data: await repository.createProgram(userId, payload) } };
  }

  const programMatch = path.match(/^\/v1\/programs\/([^/]+)$/);

  if (programMatch && isUpdateMethod(method)) {
    return { statusCode: 200, body: { data: await repository.updateProgram(userId, programMatch[1], parseJsonText(body)) } };
  }

  if (programMatch && method === "DELETE") {
    await repository.deleteProgram(userId, programMatch[1]);
    return { statusCode: 204, body: null };
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

function isUpdateMethod(method) {
  return method === "PUT" || method === "PATCH";
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
