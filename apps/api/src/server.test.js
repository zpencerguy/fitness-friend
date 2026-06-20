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

  const updateResponse = await handleApiRequest({
    repository,
    method: "PATCH",
    path: `/v1/equipment/${createResponse.body.data.id}`,
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      detail: "44 lb",
      selected: false,
    }),
  });

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.body.data.detail, "44 lb");
  assert.equal(updateResponse.body.data.selected, false);

  const deleteResponse = await handleApiRequest({
    repository,
    method: "DELETE",
    path: `/v1/equipment/${createResponse.body.data.id}`,
    headers: {
      "x-user-id": "user-a",
    },
  });

  assert.equal(deleteResponse.statusCode, 204);
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

  const updateResponse = await handleApiRequest({
    repository,
    method: "PATCH",
    path: `/v1/completed-workouts/${response.body.data.id}`,
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      notes: "Felt strong.",
      movements: [
        {
          moveName: "Goblet Squat",
          target: "8-12 reps",
          pattern: "Squat",
          weightValue: 40,
          repsCompleted: 8,
          difficulty: 8,
        },
      ],
    }),
  });

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.body.data.notes, "Felt strong.");
  assert.equal(updateResponse.body.data.movements[0].weightValue, 40);
});

test("moves support CRUD for exercise library foundation", async () => {
  const repository = createMemoryRepository();
  const createResponse = await handleApiRequest({
    repository,
    method: "POST",
    path: "/v1/moves",
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      name: "Kettlebell Swing",
      pattern: "Hinge",
      equipmentCategory: "Kettlebell",
      primaryMuscles: ["Gluteus maximus", "Hamstrings"],
    }),
  });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.name, "Kettlebell Swing");

  const updateResponse = await handleApiRequest({
    repository,
    method: "PATCH",
    path: `/v1/moves/${createResponse.body.data.id}`,
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      difficulty: "intermediate",
    }),
  });

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.body.data.difficulty, "intermediate");

  const deleteResponse = await handleApiRequest({
    repository,
    method: "DELETE",
    path: `/v1/moves/${createResponse.body.data.id}`,
    headers: {
      "x-user-id": "user-a",
    },
  });

  assert.equal(deleteResponse.statusCode, 204);
});

test("templates, planned workouts, and programs expose CRUD routes", async () => {
  const repository = createMemoryRepository();
  const templateResponse = await handleApiRequest({
    repository,
    method: "POST",
    path: "/v1/workout-templates",
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      name: "Upper Body EMOM",
      cycles: 3,
      movements: [{ moveName: "Floor Press", target: "8 reps", pattern: "Push" }],
    }),
  });

  assert.equal(templateResponse.statusCode, 201);

  const templateUpdate = await handleApiRequest({
    repository,
    method: "PATCH",
    path: `/v1/workout-templates/${templateResponse.body.data.id}`,
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      cycles: 4,
    }),
  });

  assert.equal(templateUpdate.statusCode, 200);
  assert.equal(templateUpdate.body.data.cycles, 4);

  const planResponse = await handleApiRequest({
    repository,
    method: "POST",
    path: "/v1/planned-workouts",
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      plannedDate: "2026-06-20",
      templateId: templateResponse.body.data.id,
      workoutName: "Upper Body EMOM",
      focus: "Upper body",
      plannedRounds: 8,
      plannedDurationSeconds: 480,
    }),
  });

  assert.equal(planResponse.statusCode, 201);
  assert.equal(planResponse.body.data.status, "planned");

  const planUpdate = await handleApiRequest({
    repository,
    method: "PATCH",
    path: `/v1/planned-workouts/${planResponse.body.data.id}`,
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      status: "skipped",
    }),
  });

  assert.equal(planUpdate.statusCode, 200);
  assert.equal(planUpdate.body.data.status, "skipped");

  const programResponse = await handleApiRequest({
    repository,
    method: "POST",
    path: "/v1/programs",
    headers: {
      "x-user-id": "user-a",
    },
    body: JSON.stringify({
      name: "Intro to Home Muscle",
      durationWeeks: 8,
      weeklyWorkouts: 4,
      days: [{ weekNumber: 1, dayNumber: 1, workoutName: "Full Body Starter", focus: "Full body" }],
    }),
  });

  assert.equal(programResponse.statusCode, 201);
  assert.equal(programResponse.body.data.days.length, 1);

  const programDelete = await handleApiRequest({
    repository,
    method: "DELETE",
    path: `/v1/programs/${programResponse.body.data.id}`,
    headers: {
      "x-user-id": "user-a",
    },
  });

  assert.equal(programDelete.statusCode, 204);
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
