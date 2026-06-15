import { randomUUID } from "node:crypto";

const nowIso = () => new Date().toISOString();

export function createMemoryRepository() {
  const equipment = new Map();
  const workoutTemplates = new Map();
  const completedWorkouts = new Map();

  return {
    listEquipment(userId) {
      return [...equipment.values()].filter((item) => item.userId === userId);
    },

    createEquipment(userId, payload) {
      const item = {
        id: randomUUID(),
        userId,
        name: String(payload.name ?? "").trim(),
        category: String(payload.category ?? "Accessory").trim() || "Accessory",
        detail: String(payload.detail ?? "").trim(),
        selected: payload.selected ?? true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      equipment.set(item.id, item);
      return item;
    },

    listWorkoutTemplates(userId) {
      return [...workoutTemplates.values()].filter(
        (template) => template.visibility === "public" || template.userId === userId,
      );
    },

    createWorkoutTemplate(userId, payload) {
      const template = {
        id: randomUUID(),
        userId,
        name: String(payload.name ?? "").trim(),
        description: String(payload.description ?? "").trim(),
        source: payload.source ?? "custom",
        cycles: Number(payload.cycles) || 1,
        tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
        visibility: payload.visibility ?? "private",
        movements: Array.isArray(payload.movements)
          ? payload.movements.map((movement, index) => ({
              id: randomUUID(),
              position: index + 1,
              moveName: String(movement.moveName ?? movement.move ?? "").trim(),
              target: String(movement.target ?? "30 sec").trim(),
              pattern: String(movement.pattern ?? "Move").trim(),
              cue: String(movement.cue ?? "").trim(),
              primaryMuscles: Array.isArray(movement.primaryMuscles) ? movement.primaryMuscles.map(String) : [],
              secondaryMuscles: Array.isArray(movement.secondaryMuscles) ? movement.secondaryMuscles.map(String) : [],
            }))
          : [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      workoutTemplates.set(template.id, template);
      return template;
    },

    listCompletedWorkouts(userId) {
      return [...completedWorkouts.values()]
        .filter((workout) => workout.userId === userId)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    },

    createCompletedWorkout(userId, payload) {
      const workout = {
        id: randomUUID(),
        userId,
        plannedWorkoutId: payload.plannedWorkoutId ?? null,
        templateId: payload.templateId ?? null,
        name: String(payload.name ?? "").trim(),
        type: payload.type ?? "EMOM",
        rounds: Number(payload.rounds),
        durationSeconds: Number(payload.durationSeconds),
        plannedDurationSeconds: Number(payload.plannedDurationSeconds),
        workSecondsPerRound: Number(payload.workSecondsPerRound ?? 30),
        restSecondsPerRound: Number(payload.restSecondsPerRound ?? 30),
        tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
        movements: Array.isArray(payload.movements)
          ? payload.movements.map((movement, index) => ({
              id: randomUUID(),
              position: index + 1,
              moveName: String(movement.moveName ?? movement.move ?? "").trim(),
              pattern: String(movement.pattern ?? "").trim(),
              target: String(movement.target ?? "").trim(),
              weightValue: movement.weightValue ?? null,
              weightUnit: movement.weightUnit ?? "lb",
              repsCompleted: movement.repsCompleted ?? null,
              difficulty: movement.difficulty ?? null,
              notes: String(movement.notes ?? "").trim(),
              primaryMuscles: Array.isArray(movement.primaryMuscles) ? movement.primaryMuscles.map(String) : [],
              secondaryMuscles: Array.isArray(movement.secondaryMuscles) ? movement.secondaryMuscles.map(String) : [],
            }))
          : [],
        completedAt: payload.completedAt ?? nowIso(),
        createdAt: nowIso(),
      };

      completedWorkouts.set(workout.id, workout);
      return workout;
    },
  };
}
