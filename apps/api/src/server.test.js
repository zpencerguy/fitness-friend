import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryRepository } from "./repository.js";
import { createConfiguredRepository, handleApiRequest } from "./server.js";
import { mapCompletedMovement, mapEquipment } from "./postgres-mappers.js";

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

test("server uses memory repository when no database URL is configured", async () => {
  const repository = await createConfiguredRepository({});
  const equipment = repository.createEquipment("dev-user", {
    name: "Dumbbells",
    category: "Weights",
  });

  assert.equal(equipment.name, "Dumbbells");
});

test("postgres mappers return API-shaped records", () => {
  const createdAt = new Date("2026-06-15T12:00:00.000Z");

  assert.deepEqual(
    mapEquipment({
      id: "equipment-id",
      user_id: "user-id",
      name: "Barbell",
      category: "Weights",
      detail: "45 lb",
      selected: true,
      created_at: createdAt,
      updated_at: createdAt,
    }),
    {
      id: "equipment-id",
      userId: "user-id",
      name: "Barbell",
      category: "Weights",
      detail: "45 lb",
      selected: true,
      createdAt: "2026-06-15T12:00:00.000Z",
      updatedAt: "2026-06-15T12:00:00.000Z",
    },
  );

  assert.equal(
    mapCompletedMovement({
      id: "movement-id",
      completed_workout_id: "workout-id",
      position: 1,
      move_name: "Goblet Squat",
      pattern: "Squat",
      target: "8-12 reps",
      weight_value: "35",
      weight_unit: "lb",
      reps_completed: 10,
      difficulty: 7,
      notes: "",
      primary_muscles: ["Quadriceps"],
      secondary_muscles: ["Gluteus maximus"],
    }).weightValue,
    35,
  );
});
