export function mapEquipment(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    detail: row.detail ?? "",
    selected: row.selected,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export function mapWorkoutTemplate(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? "",
    source: row.source,
    cycles: row.cycles,
    tags: row.tags ?? [],
    visibility: row.visibility,
    movements: [],
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export function mapTemplateMovement(row) {
  return {
    id: row.id,
    templateId: row.template_id,
    position: row.position,
    moveName: row.move_name,
    target: row.target,
    pattern: row.pattern,
    cue: row.cue ?? "",
    primaryMuscles: row.primary_muscles ?? [],
    secondaryMuscles: row.secondary_muscles ?? [],
  };
}

export function mapCompletedWorkout(row) {
  return {
    id: row.id,
    userId: row.user_id,
    plannedWorkoutId: row.planned_workout_id,
    templateId: row.template_id,
    name: row.name,
    type: row.type,
    rounds: row.rounds,
    durationSeconds: row.duration_seconds,
    plannedDurationSeconds: row.planned_duration_seconds,
    workSecondsPerRound: row.work_seconds_per_round,
    restSecondsPerRound: row.rest_seconds_per_round,
    tags: row.tags ?? [],
    movements: [],
    completedAt: row.completed_at?.toISOString?.() ?? row.completed_at,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export function mapCompletedMovement(row) {
  return {
    id: row.id,
    completedWorkoutId: row.completed_workout_id,
    position: row.position,
    moveName: row.move_name,
    pattern: row.pattern ?? "",
    target: row.target ?? "",
    weightValue: row.weight_value === null || row.weight_value === undefined ? null : Number(row.weight_value),
    weightUnit: row.weight_unit ?? "lb",
    repsCompleted: row.reps_completed,
    difficulty: row.difficulty,
    notes: row.notes ?? "",
    primaryMuscles: row.primary_muscles ?? [],
    secondaryMuscles: row.secondary_muscles ?? [],
  };
}
