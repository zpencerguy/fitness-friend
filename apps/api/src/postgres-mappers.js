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

export function mapMove(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    pattern: row.pattern,
    equipmentCategory: row.equipment_category ?? "",
    difficulty: row.difficulty ?? "beginner",
    primaryMuscles: row.primary_muscles ?? [],
    secondaryMuscles: row.secondary_muscles ?? [],
    description: row.description ?? "",
    cue: row.cue ?? "",
    mediaUrl: row.media_url ?? "",
    visibility: row.visibility ?? "private",
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
    moveId: row.move_id,
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
    notes: row.notes ?? "",
    movements: [],
    completedAt: row.completed_at?.toISOString?.() ?? row.completed_at,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export function mapCompletedMovement(row) {
  return {
    id: row.id,
    completedWorkoutId: row.completed_workout_id,
    moveId: row.move_id,
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

export function mapPlannedWorkout(row) {
  return {
    id: row.id,
    userId: row.user_id,
    plannedDate: row.planned_date?.toISOString?.()?.slice(0, 10) ?? row.planned_date,
    templateId: row.template_id,
    workoutName: row.workout_name,
    focus: row.focus,
    plannedRounds: row.planned_rounds,
    plannedDurationSeconds: row.planned_duration_seconds,
    status: row.status,
    completedWorkoutId: row.completed_workout_id,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export function mapProgram(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? "",
    goal: row.goal,
    level: row.level,
    durationWeeks: row.duration_weeks,
    weeklyWorkouts: row.weekly_workouts,
    equipment: row.equipment ?? [],
    tags: row.tags ?? [],
    visibility: row.visibility,
    days: [],
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export function mapProgramDay(row) {
  return {
    id: row.id,
    programId: row.program_id,
    position: row.position,
    weekNumber: row.week_number,
    dayNumber: row.day_number,
    workoutName: row.workout_name,
    focus: row.focus,
    templateId: row.template_id,
    locked: row.locked,
    notes: row.notes ?? "",
  };
}
