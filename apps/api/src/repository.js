import { randomUUID } from "node:crypto";

const nowIso = () => new Date().toISOString();

export function createMemoryRepository() {
  const equipment = new Map();
  const moves = new Map();
  const workoutTemplates = new Map();
  const plannedWorkouts = new Map();
  const completedWorkouts = new Map();
  const programs = new Map();

  return {
    listEquipment(userId) {
      return byUser(equipment, userId);
    },

    createEquipment(userId, payload) {
      const item = {
        id: randomUUID(),
        userId,
        name: text(payload.name),
        category: text(payload.category || "Accessory") || "Accessory",
        detail: text(payload.detail),
        selected: payload.selected ?? true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      equipment.set(item.id, item);
      return item;
    },

    updateEquipment(userId, equipmentId, payload) {
      const item = requireOwned(equipment, userId, equipmentId, "Equipment");
      const updatedItem = {
        ...item,
        name: payload.name === undefined ? item.name : text(payload.name),
        category: payload.category === undefined ? item.category : text(payload.category || "Accessory") || "Accessory",
        detail: payload.detail === undefined ? item.detail : text(payload.detail),
        selected: payload.selected === undefined ? item.selected : Boolean(payload.selected),
        updatedAt: nowIso(),
      };

      equipment.set(equipmentId, updatedItem);
      return updatedItem;
    },

    deleteEquipment(userId, equipmentId) {
      requireOwned(equipment, userId, equipmentId, "Equipment");
      equipment.delete(equipmentId);
    },

    listMoves(userId) {
      return [...moves.values()].filter((move) => move.visibility === "public" || move.userId === userId);
    },

    createMove(userId, payload) {
      const move = {
        id: randomUUID(),
        userId,
        name: text(payload.name),
        pattern: text(payload.pattern || "Move") || "Move",
        equipmentCategory: text(payload.equipmentCategory),
        difficulty: text(payload.difficulty || "beginner") || "beginner",
        primaryMuscles: arrayOfStrings(payload.primaryMuscles),
        secondaryMuscles: arrayOfStrings(payload.secondaryMuscles),
        description: text(payload.description),
        cue: text(payload.cue),
        mediaUrl: text(payload.mediaUrl),
        visibility: payload.visibility ?? "private",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      moves.set(move.id, move);
      return move;
    },

    updateMove(userId, moveId, payload) {
      const move = requireOwned(moves, userId, moveId, "Move");
      const updatedMove = {
        ...move,
        name: payload.name === undefined ? move.name : text(payload.name),
        pattern: payload.pattern === undefined ? move.pattern : text(payload.pattern || "Move") || "Move",
        equipmentCategory: payload.equipmentCategory === undefined ? move.equipmentCategory : text(payload.equipmentCategory),
        difficulty: payload.difficulty === undefined ? move.difficulty : text(payload.difficulty || "beginner") || "beginner",
        primaryMuscles: payload.primaryMuscles === undefined ? move.primaryMuscles : arrayOfStrings(payload.primaryMuscles),
        secondaryMuscles: payload.secondaryMuscles === undefined ? move.secondaryMuscles : arrayOfStrings(payload.secondaryMuscles),
        description: payload.description === undefined ? move.description : text(payload.description),
        cue: payload.cue === undefined ? move.cue : text(payload.cue),
        mediaUrl: payload.mediaUrl === undefined ? move.mediaUrl : text(payload.mediaUrl),
        visibility: payload.visibility === undefined ? move.visibility : payload.visibility,
        updatedAt: nowIso(),
      };

      moves.set(moveId, updatedMove);
      return updatedMove;
    },

    deleteMove(userId, moveId) {
      requireOwned(moves, userId, moveId, "Move");
      moves.delete(moveId);
    },

    listWorkoutTemplates(userId) {
      return [...workoutTemplates.values()].filter(
        (template) => template.visibility === "public" || template.userId === userId,
      );
    },

    createWorkoutTemplate(userId, payload) {
      const template = buildTemplate(userId, payload);
      workoutTemplates.set(template.id, template);
      return template;
    },

    updateWorkoutTemplate(userId, templateId, payload) {
      const template = requireOwned(workoutTemplates, userId, templateId, "Workout template");
      const updatedTemplate = buildTemplate(userId, { ...template, ...payload }, template);
      workoutTemplates.set(templateId, updatedTemplate);
      return updatedTemplate;
    },

    deleteWorkoutTemplate(userId, templateId) {
      requireOwned(workoutTemplates, userId, templateId, "Workout template");
      workoutTemplates.delete(templateId);

      [...plannedWorkouts.values()].forEach((plannedWorkout) => {
        if (plannedWorkout.templateId === templateId) {
          plannedWorkouts.set(plannedWorkout.id, {
            ...plannedWorkout,
            templateId: null,
            updatedAt: nowIso(),
          });
        }
      });
    },

    listPlannedWorkouts(userId) {
      return byUser(plannedWorkouts, userId).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
    },

    createPlannedWorkout(userId, payload) {
      const plannedWorkout = buildPlannedWorkout(userId, payload);
      plannedWorkouts.set(plannedWorkout.id, plannedWorkout);
      return plannedWorkout;
    },

    updatePlannedWorkout(userId, plannedWorkoutId, payload) {
      const plannedWorkout = requireOwned(plannedWorkouts, userId, plannedWorkoutId, "Planned workout");
      const updatedPlannedWorkout = buildPlannedWorkout(userId, { ...plannedWorkout, ...payload }, plannedWorkout);
      plannedWorkouts.set(plannedWorkoutId, updatedPlannedWorkout);
      return updatedPlannedWorkout;
    },

    deletePlannedWorkout(userId, plannedWorkoutId) {
      requireOwned(plannedWorkouts, userId, plannedWorkoutId, "Planned workout");
      plannedWorkouts.delete(plannedWorkoutId);
    },

    listCompletedWorkouts(userId) {
      return byUser(completedWorkouts, userId).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    },

    createCompletedWorkout(userId, payload) {
      const workout = buildCompletedWorkout(userId, payload);
      completedWorkouts.set(workout.id, workout);
      return workout;
    },

    updateCompletedWorkout(userId, completedWorkoutId, payload) {
      const workout = requireOwned(completedWorkouts, userId, completedWorkoutId, "Completed workout");
      const updatedWorkout = buildCompletedWorkout(userId, { ...workout, ...payload }, workout);
      completedWorkouts.set(completedWorkoutId, updatedWorkout);
      return updatedWorkout;
    },

    deleteCompletedWorkout(userId, completedWorkoutId) {
      requireOwned(completedWorkouts, userId, completedWorkoutId, "Completed workout");
      completedWorkouts.delete(completedWorkoutId);

      [...plannedWorkouts.values()].forEach((plannedWorkout) => {
        if (plannedWorkout.completedWorkoutId === completedWorkoutId) {
          plannedWorkouts.set(plannedWorkout.id, {
            ...plannedWorkout,
            status: "planned",
            completedWorkoutId: null,
            updatedAt: nowIso(),
          });
        }
      });
    },

    listPrograms(userId) {
      return [...programs.values()].filter((program) => program.visibility === "public" || program.userId === userId);
    },

    createProgram(userId, payload) {
      const program = buildProgram(userId, payload);
      programs.set(program.id, program);
      return program;
    },

    updateProgram(userId, programId, payload) {
      const program = requireOwned(programs, userId, programId, "Program");
      const updatedProgram = buildProgram(userId, { ...program, ...payload }, program);
      programs.set(programId, updatedProgram);
      return updatedProgram;
    },

    deleteProgram(userId, programId) {
      requireOwned(programs, userId, programId, "Program");
      programs.delete(programId);
    },
  };
}

function buildTemplate(userId, payload, existingTemplate = null) {
  const createdAt = existingTemplate?.createdAt ?? nowIso();

  return {
    id: existingTemplate?.id ?? randomUUID(),
    userId,
    name: text(payload.name),
    description: text(payload.description),
    source: payload.source ?? "custom",
    cycles: Number(payload.cycles) || 1,
    tags: arrayOfStrings(payload.tags),
    visibility: payload.visibility ?? "private",
    movements: arrayOfObjects(payload.movements).map((movement, index) => ({
      id: movement.id ?? randomUUID(),
      position: index + 1,
      moveId: movement.moveId ?? null,
      moveName: text(movement.moveName ?? movement.move),
      target: text(movement.target || "30 sec") || "30 sec",
      pattern: text(movement.pattern || "Move") || "Move",
      cue: text(movement.cue),
      primaryMuscles: arrayOfStrings(movement.primaryMuscles),
      secondaryMuscles: arrayOfStrings(movement.secondaryMuscles),
    })),
    createdAt,
    updatedAt: nowIso(),
  };
}

function buildPlannedWorkout(userId, payload, existingPlannedWorkout = null) {
  const createdAt = existingPlannedWorkout?.createdAt ?? nowIso();

  return {
    id: existingPlannedWorkout?.id ?? randomUUID(),
    userId,
    plannedDate: text(payload.plannedDate ?? payload.date),
    templateId: payload.templateId ?? null,
    workoutName: text(payload.workoutName ?? payload.name),
    focus: text(payload.focus || "Full body") || "Full body",
    plannedRounds: Number(payload.plannedRounds ?? payload.rounds) || 1,
    plannedDurationSeconds: Number(payload.plannedDurationSeconds) || 60,
    status: payload.status ?? "planned",
    completedWorkoutId: payload.completedWorkoutId ?? null,
    createdAt,
    updatedAt: nowIso(),
  };
}

function buildCompletedWorkout(userId, payload, existingWorkout = null) {
  const createdAt = existingWorkout?.createdAt ?? nowIso();

  return {
    id: existingWorkout?.id ?? randomUUID(),
    userId,
    plannedWorkoutId: payload.plannedWorkoutId ?? null,
    templateId: payload.templateId ?? null,
    name: text(payload.name),
    type: payload.type ?? "EMOM",
    rounds: Number(payload.rounds),
    durationSeconds: Number(payload.durationSeconds),
    plannedDurationSeconds: Number(payload.plannedDurationSeconds),
    workSecondsPerRound: Number(payload.workSecondsPerRound ?? 30),
    restSecondsPerRound: Number(payload.restSecondsPerRound ?? 30),
    tags: arrayOfStrings(payload.tags),
    notes: text(payload.notes),
    movements: arrayOfObjects(payload.movements).map((movement, index) => ({
      id: movement.id ?? randomUUID(),
      position: index + 1,
      moveId: movement.moveId ?? null,
      moveName: text(movement.moveName ?? movement.move),
      pattern: text(movement.pattern),
      target: text(movement.target),
      weightValue: movement.weightValue ?? null,
      weightUnit: movement.weightUnit ?? "lb",
      repsCompleted: movement.repsCompleted ?? null,
      difficulty: movement.difficulty ?? movement.effort ?? null,
      notes: text(movement.notes),
      primaryMuscles: arrayOfStrings(movement.primaryMuscles),
      secondaryMuscles: arrayOfStrings(movement.secondaryMuscles),
    })),
    completedAt: payload.completedAt ?? nowIso(),
    createdAt,
    updatedAt: nowIso(),
  };
}

function buildProgram(userId, payload, existingProgram = null) {
  const createdAt = existingProgram?.createdAt ?? nowIso();

  return {
    id: existingProgram?.id ?? randomUUID(),
    userId,
    name: text(payload.name),
    description: text(payload.description),
    goal: text(payload.goal || "build_muscle") || "build_muscle",
    level: text(payload.level || "beginner") || "beginner",
    durationWeeks: Number(payload.durationWeeks) || 1,
    weeklyWorkouts: Number(payload.weeklyWorkouts) || 3,
    equipment: arrayOfStrings(payload.equipment),
    tags: arrayOfStrings(payload.tags),
    visibility: payload.visibility ?? "private",
    days: arrayOfObjects(payload.days).map((day, index) => ({
      id: day.id ?? randomUUID(),
      position: index + 1,
      weekNumber: Number(day.weekNumber) || 1,
      dayNumber: Number(day.dayNumber) || index + 1,
      workoutName: text(day.workoutName ?? day.name),
      focus: text(day.focus || "Full body") || "Full body",
      templateId: day.templateId ?? null,
      locked: Boolean(day.locked),
      notes: text(day.notes),
    })),
    createdAt,
    updatedAt: nowIso(),
  };
}

function byUser(map, userId) {
  return [...map.values()].filter((item) => item.userId === userId);
}

function requireOwned(map, userId, itemId, label) {
  const item = map.get(itemId);

  if (!item || item.userId !== userId) {
    const error = new Error(`${label} not found.`);
    error.statusCode = 404;
    throw error;
  }

  return item;
}

function text(value) {
  return String(value ?? "").trim();
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function arrayOfObjects(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}
