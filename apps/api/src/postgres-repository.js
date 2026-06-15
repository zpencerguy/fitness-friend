import pg from "pg";
import {
  mapCompletedMovement,
  mapCompletedWorkout,
  mapEquipment,
  mapTemplateMovement,
  mapWorkoutTemplate,
} from "./postgres-mappers.js";

const { Pool } = pg;

export function createPostgresRepository({ connectionString, pool } = {}) {
  const db = pool ?? new Pool({ connectionString });

  return {
    async listEquipment(authSubject) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query(
        `
          SELECT id, user_id, name, category, detail, selected, created_at, updated_at
          FROM equipment
          WHERE user_id = $1
          ORDER BY created_at ASC
        `,
        [userId],
      );

      return result.rows.map(mapEquipment);
    },

    async createEquipment(authSubject, payload) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query(
        `
          INSERT INTO equipment (user_id, name, category, detail, selected)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, user_id, name, category, detail, selected, created_at, updated_at
        `,
        [
          userId,
          String(payload.name ?? "").trim(),
          String(payload.category ?? "Accessory").trim() || "Accessory",
          String(payload.detail ?? "").trim(),
          payload.selected ?? true,
        ],
      );

      return mapEquipment(result.rows[0]);
    },

    async listWorkoutTemplates(authSubject) {
      const userId = await ensureUser(db, authSubject);
      const templates = await db.query(
        `
          SELECT id, user_id, name, description, source, cycles, tags, visibility, created_at, updated_at
          FROM workout_templates
          WHERE user_id = $1 OR visibility = 'public'
          ORDER BY created_at ASC
        `,
        [userId],
      );
      const templateIds = templates.rows.map((template) => template.id);
      const movements = templateIds.length
        ? await db.query(
            `
              SELECT id, template_id, position, move_name, target, pattern, cue, primary_muscles, secondary_muscles
              FROM template_moves
              WHERE template_id = ANY($1::uuid[])
              ORDER BY position ASC
            `,
            [templateIds],
          )
        : { rows: [] };
      const movementsByTemplate = groupBy(movements.rows.map(mapTemplateMovement), "templateId");

      return templates.rows.map((row) => ({
        ...mapWorkoutTemplate(row),
        movements: movementsByTemplate.get(row.id) ?? [],
      }));
    },

    async createWorkoutTemplate(authSubject, payload) {
      const userId = await ensureUser(db, authSubject);
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        const templateResult = await client.query(
          `
            INSERT INTO workout_templates (user_id, name, description, source, cycles, tags, visibility)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, user_id, name, description, source, cycles, tags, visibility, created_at, updated_at
          `,
          [
            userId,
            String(payload.name ?? "").trim(),
            String(payload.description ?? "").trim(),
            payload.source ?? "custom",
            Number(payload.cycles) || 1,
            arrayOfStrings(payload.tags),
            payload.visibility ?? "private",
          ],
        );
        const template = mapWorkoutTemplate(templateResult.rows[0]);
        const movements = [];

        for (const [index, movement] of arrayOfObjects(payload.movements).entries()) {
          const movementResult = await client.query(
            `
              INSERT INTO template_moves (
                template_id, position, move_name, target, pattern, cue, primary_muscles, secondary_muscles
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id, template_id, position, move_name, target, pattern, cue, primary_muscles, secondary_muscles
            `,
            [
              template.id,
              index + 1,
              String(movement.moveName ?? movement.move ?? "").trim(),
              String(movement.target ?? "30 sec").trim(),
              String(movement.pattern ?? "Move").trim(),
              String(movement.cue ?? "").trim(),
              arrayOfStrings(movement.primaryMuscles),
              arrayOfStrings(movement.secondaryMuscles),
            ],
          );
          movements.push(mapTemplateMovement(movementResult.rows[0]));
        }

        await client.query("COMMIT");
        return { ...template, movements };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async listCompletedWorkouts(authSubject) {
      const userId = await ensureUser(db, authSubject);
      const workouts = await db.query(
        `
          SELECT
            id, user_id, planned_workout_id, template_id, name, type, rounds,
            duration_seconds, planned_duration_seconds, work_seconds_per_round,
            rest_seconds_per_round, tags, completed_at, created_at
          FROM completed_workouts
          WHERE user_id = $1
          ORDER BY completed_at DESC
        `,
        [userId],
      );
      const workoutIds = workouts.rows.map((workout) => workout.id);
      const movements = workoutIds.length
        ? await db.query(
            `
              SELECT
                id, completed_workout_id, position, move_name, pattern, target, weight_value,
                weight_unit, reps_completed, difficulty, notes, primary_muscles, secondary_muscles
              FROM completed_movements
              WHERE completed_workout_id = ANY($1::uuid[])
              ORDER BY position ASC
            `,
            [workoutIds],
          )
        : { rows: [] };
      const movementsByWorkout = groupBy(movements.rows.map(mapCompletedMovement), "completedWorkoutId");

      return workouts.rows.map((row) => ({
        ...mapCompletedWorkout(row),
        movements: movementsByWorkout.get(row.id) ?? [],
      }));
    },

    async createCompletedWorkout(authSubject, payload) {
      const userId = await ensureUser(db, authSubject);
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        const workoutResult = await client.query(
          `
            INSERT INTO completed_workouts (
              user_id, planned_workout_id, template_id, name, type, rounds, duration_seconds,
              planned_duration_seconds, work_seconds_per_round, rest_seconds_per_round, tags, completed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING
              id, user_id, planned_workout_id, template_id, name, type, rounds, duration_seconds,
              planned_duration_seconds, work_seconds_per_round, rest_seconds_per_round, tags, completed_at, created_at
          `,
          [
            userId,
            payload.plannedWorkoutId ?? null,
            payload.templateId ?? null,
            String(payload.name ?? "").trim(),
            payload.type ?? "EMOM",
            Number(payload.rounds),
            Number(payload.durationSeconds),
            Number(payload.plannedDurationSeconds),
            Number(payload.workSecondsPerRound ?? 30),
            Number(payload.restSecondsPerRound ?? 30),
            arrayOfStrings(payload.tags),
            payload.completedAt ?? new Date().toISOString(),
          ],
        );
        const workout = mapCompletedWorkout(workoutResult.rows[0]);
        const movements = [];

        for (const [index, movement] of arrayOfObjects(payload.movements).entries()) {
          const movementResult = await client.query(
            `
              INSERT INTO completed_movements (
                completed_workout_id, user_id, position, move_name, pattern, target,
                weight_value, weight_unit, reps_completed, difficulty, notes,
                primary_muscles, secondary_muscles
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              RETURNING
                id, completed_workout_id, position, move_name, pattern, target, weight_value,
                weight_unit, reps_completed, difficulty, notes, primary_muscles, secondary_muscles
            `,
            [
              workout.id,
              userId,
              index + 1,
              String(movement.moveName ?? movement.move ?? "").trim(),
              String(movement.pattern ?? "").trim(),
              String(movement.target ?? "").trim(),
              movement.weightValue ?? null,
              movement.weightUnit ?? "lb",
              movement.repsCompleted ?? null,
              movement.difficulty ?? null,
              String(movement.notes ?? "").trim(),
              arrayOfStrings(movement.primaryMuscles),
              arrayOfStrings(movement.secondaryMuscles),
            ],
          );
          movements.push(mapCompletedMovement(movementResult.rows[0]));
        }

        await client.query("COMMIT");
        return { ...workout, movements };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export async function ensureUser(db, authSubject) {
  const subject = String(authSubject || "dev-user");
  const result = await db.query(
    `
      INSERT INTO app_users (auth_subject)
      VALUES ($1)
      ON CONFLICT (auth_subject) DO UPDATE SET updated_at = now()
      RETURNING id
    `,
    [subject],
  );

  return result.rows[0].id;
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function arrayOfObjects(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function groupBy(items, key) {
  const groups = new Map();

  items.forEach((item) => {
    const groupKey = item[key];
    const group = groups.get(groupKey) ?? [];
    group.push(item);
    groups.set(groupKey, group);
  });

  return groups;
}
