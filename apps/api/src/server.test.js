import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryRepository } from "./repository.js";
import { handleApiRequest } from "./server.js";

test("health endpoint returns service status", async () => {
  const response = await handleApiRequest({ path: "/health" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, "bellforge-api");
});

test("equipment can be created and listed per user", async () => {
  const repository = createMemoryRepository();
  const createResponse = await handleApiRequest({
    repository,
    method: "POST",
    path: "/v1/equipment",
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      name: "Kettlebell",
      category: "Weights",
      detail: "35 lb",
    }),
  });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.name, "Kettlebell");

  const listResponse = await handleApiRequest({
    repository,
    path: "/v1/equipment",
    headers: {
      "x-user-id": "user-a",
    },
  });

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.data.length, 1);
  assert.equal(listResponse.body.data[0].detail, "35 lb");
});

test("completed workouts can include movement-level logs", async () => {
  const repository = createMemoryRepository();
  const response = await handleApiRequest({
    repository,
    method: "POST",
    path: "/v1/completed-workouts",
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      name: "Garage EMOM",
      rounds: 10,
      durationSeconds: 570,
      plannedDurationSeconds: 570,
      movements: [
        {
          moveName: "Goblet Squat",
          target: "8-12 reps",
          pattern: "Squat",
          weightValue: 35,
          repsCompleted: 10,
          difficulty: 7,
          primaryMuscles: ["Quadriceps", "Gluteus maximus"],
        },
      ],
    }),
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.data.movements.length, 1);
  assert.equal(response.body.data.movements[0].weightValue, 35);
});
