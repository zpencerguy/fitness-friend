import pg from "pg";
import {
  mapCompletedMovement,
  mapCompletedWorkout,
  mapEquipment,
  mapMove,
  mapPlannedWorkout,
  mapProgram,
  mapProgramDay,
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

    async updateEquipment(authSubject, equipmentId, payload) {
      const userId = await ensureUser(db, authSubject);
      const existing = await db.query("SELECT id FROM equipment WHERE id = $1 AND user_id = $2", [equipmentId, userId]);

      if (!existing.rowCount) throwNotFound("Equipment");

      const result = await db.query(
        `
          UPDATE equipment
          SET
            name = COALESCE($3, name),
            category = COALESCE($4, category),
            detail = COALESCE($5, detail),
            selected = COALESCE($6, selected),
            updated_at = now()
          WHERE id = $1 AND user_id = $2
          RETURNING id, user_id, name, category, detail, selected, created_at, updated_at
        `,
        [
          equipmentId,
          userId,
          payload.name === undefined ? null : String(payload.name ?? "").trim(),
          payload.category === undefined ? null : String(payload.category ?? "Accessory").trim() || "Accessory",
          payload.detail === undefined ? null : String(payload.detail ?? "").trim(),
          payload.selected === undefined ? null : Boolean(payload.selected),
        ],
      );

      return mapEquipment(result.rows[0]);
    },

    async deleteEquipment(authSubject, equipmentId) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query("DELETE FROM equipment WHERE id = $1 AND user_id = $2", [equipmentId, userId]);
      if (!result.rowCount) throwNotFound("Equipment");
    },

    async listMoves(authSubject) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query(
        `
          SELECT
            id, user_id, name, pattern, equipment_category, difficulty, primary_muscles,
            secondary_muscles, description, cue, media_url, visibility, created_at, updated_at
          FROM moves
          WHERE user_id = $1 OR visibility = 'public'
          ORDER BY name ASC
        `,
        [userId],
      );

      return result.rows.map(mapMove);
    },

    async createMove(authSubject, payload) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query(
        `
          INSERT INTO moves (
            user_id, name, pattern, equipment_category, difficulty, primary_muscles,
            secondary_muscles, description, cue, media_url, visibility
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING
            id, user_id, name, pattern, equipment_category, difficulty, primary_muscles,
            secondary_muscles, description, cue, media_url, visibility, created_at, updated_at
        `,
        [
          userId,
          String(payload.name ?? "").trim(),
          String(payload.pattern ?? "Move").trim() || "Move",
          String(payload.equipmentCategory ?? "").trim(),
          String(payload.difficulty ?? "beginner").trim() || "beginner",
          arrayOfStrings(payload.primaryMuscles),
          arrayOfStrings(payload.secondaryMuscles),
          String(payload.description ?? "").trim(),
          String(payload.cue ?? "").trim(),
          String(payload.mediaUrl ?? "").trim(),
          payload.visibility ?? "private",
        ],
      );

      return mapMove(result.rows[0]);
    },

    async updateMove(authSubject, moveId, payload) {
      const userId = await ensureUser(db, authSubject);
      const existing = await db.query("SELECT id FROM moves WHERE id = $1 AND user_id = $2", [moveId, userId]);

      if (!existing.rowCount) throwNotFound("Move");

      const result = await db.query(
        `
          UPDATE moves
          SET
            name = COALESCE($3, name),
            pattern = COALESCE($4, pattern),
            equipment_category = COALESCE($5, equipment_category),
            difficulty = COALESCE($6, difficulty),
            primary_muscles = COALESCE($7, primary_muscles),
            secondary_muscles = COALESCE($8, secondary_muscles),
            description = COALESCE($9, description),
            cue = COALESCE($10, cue),
            media_url = COALESCE($11, media_url),
            visibility = COALESCE($12, visibility),
            updated_at = now()
          WHERE id = $1 AND user_id = $2
          RETURNING
            id, user_id, name, pattern, equipment_category, difficulty, primary_muscles,
            secondary_muscles, description, cue, media_url, visibility, created_at, updated_at
        `,
        [
          moveId,
          userId,
          payload.name === undefined ? null : String(payload.name ?? "").trim(),
          payload.pattern === undefined ? null : String(payload.pattern ?? "Move").trim() || "Move",
          payload.equipmentCategory === undefined ? null : String(payload.equipmentCategory ?? "").trim(),
          payload.difficulty === undefined ? null : String(payload.difficulty ?? "beginner").trim() || "beginner",
          payload.primaryMuscles === undefined ? null : arrayOfStrings(payload.primaryMuscles),
          payload.secondaryMuscles === undefined ? null : arrayOfStrings(payload.secondaryMuscles),
          payload.description === undefined ? null : String(payload.description ?? "").trim(),
          payload.cue === undefined ? null : String(payload.cue ?? "").trim(),
          payload.mediaUrl === undefined ? null : String(payload.mediaUrl ?? "").trim(),
          payload.visibility ?? null,
        ],
      );

      return mapMove(result.rows[0]);
    },

    async deleteMove(authSubject, moveId) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query("DELETE FROM moves WHERE id = $1 AND user_id = $2", [moveId, userId]);
      if (!result.rowCount) throwNotFound("Move");
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
              SELECT id, template_id, move_id, position, move_name, target, pattern, cue, primary_muscles, secondary_muscles
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
                template_id, move_id, position, move_name, target, pattern, cue, primary_muscles, secondary_muscles
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING id, template_id, move_id, position, move_name, target, pattern, cue, primary_muscles, secondary_muscles
            `,
            [
              template.id,
              movement.moveId ?? null,
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

    async updateWorkoutTemplate(authSubject, templateId, payload) {
      const userId = await ensureUser(db, authSubject);
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        const existing = await client.query("SELECT id FROM workout_templates WHERE id = $1 AND user_id = $2", [
          templateId,
          userId,
        ]);

        if (!existing.rowCount) throwNotFound("Workout template");

        const templateResult = await client.query(
          `
            UPDATE workout_templates
            SET
              name = COALESCE($3, name),
              description = COALESCE($4, description),
              source = COALESCE($5, source),
              cycles = COALESCE($6, cycles),
              tags = COALESCE($7, tags),
              visibility = COALESCE($8, visibility),
              updated_at = now()
            WHERE id = $1 AND user_id = $2
            RETURNING id, user_id, name, description, source, cycles, tags, visibility, created_at, updated_at
          `,
          [
            templateId,
            userId,
            payload.name === undefined ? null : String(payload.name ?? "").trim(),
            payload.description === undefined ? null : String(payload.description ?? "").trim(),
            payload.source ?? null,
            payload.cycles === undefined ? null : Number(payload.cycles) || 1,
            payload.tags === undefined ? null : arrayOfStrings(payload.tags),
            payload.visibility ?? null,
          ],
        );
        const template = mapWorkoutTemplate(templateResult.rows[0]);
        let movements = [];

        if (payload.movements !== undefined) {
          await client.query("DELETE FROM template_moves WHERE template_id = $1", [template.id]);

          for (const [index, movement] of arrayOfObjects(payload.movements).entries()) {
            const movementResult = await client.query(
              `
                INSERT INTO template_moves (
                  template_id, move_id, position, move_name, target, pattern, cue, primary_muscles, secondary_muscles
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, template_id, move_id, position, move_name, target, pattern, cue, primary_muscles, secondary_muscles
              `,
              [
                template.id,
                movement.moveId ?? null,
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
        } else {
          const movementResult = await client.query(
            `
              SELECT id, template_id, move_id, position, move_name, target, pattern, cue, primary_muscles, secondary_muscles
              FROM template_moves
              WHERE template_id = $1
              ORDER BY position ASC
            `,
            [template.id],
          );
          movements = movementResult.rows.map(mapTemplateMovement);
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

    async deleteWorkoutTemplate(authSubject, templateId) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query("DELETE FROM workout_templates WHERE id = $1 AND user_id = $2", [templateId, userId]);
      if (!result.rowCount) throwNotFound("Workout template");
    },

    async listPlannedWorkouts(authSubject) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query(
        `
          SELECT
            id, user_id, planned_date, template_id, workout_name, focus, planned_rounds,
            planned_duration_seconds, status, completed_workout_id, created_at, updated_at
          FROM planned_workouts
          WHERE user_id = $1
          ORDER BY planned_date ASC
        `,
        [userId],
      );

      return result.rows.map(mapPlannedWorkout);
    },

    async createPlannedWorkout(authSubject, payload) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query(
        `
          INSERT INTO planned_workouts (
            user_id, planned_date, template_id, workout_name, focus, planned_rounds,
            planned_duration_seconds, status, completed_workout_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING
            id, user_id, planned_date, template_id, workout_name, focus, planned_rounds,
            planned_duration_seconds, status, completed_workout_id, created_at, updated_at
        `,
        [
          userId,
          payload.plannedDate ?? payload.date,
          payload.templateId ?? null,
          String(payload.workoutName ?? payload.name ?? "").trim(),
          String(payload.focus ?? "Full body").trim() || "Full body",
          Number(payload.plannedRounds ?? payload.rounds) || 1,
          Number(payload.plannedDurationSeconds) || 60,
          payload.status ?? "planned",
          payload.completedWorkoutId ?? null,
        ],
      );

      return mapPlannedWorkout(result.rows[0]);
    },

    async updatePlannedWorkout(authSubject, plannedWorkoutId, payload) {
      const userId = await ensureUser(db, authSubject);
      const existing = await db.query("SELECT id FROM planned_workouts WHERE id = $1 AND user_id = $2", [
        plannedWorkoutId,
        userId,
      ]);

      if (!existing.rowCount) throwNotFound("Planned workout");

      const result = await db.query(
        `
          UPDATE planned_workouts
          SET
            planned_date = COALESCE($3, planned_date),
            template_id = COALESCE($4, template_id),
            workout_name = COALESCE($5, workout_name),
            focus = COALESCE($6, focus),
            planned_rounds = COALESCE($7, planned_rounds),
            planned_duration_seconds = COALESCE($8, planned_duration_seconds),
            status = COALESCE($9, status),
            completed_workout_id = $10,
            updated_at = now()
          WHERE id = $1 AND user_id = $2
          RETURNING
            id, user_id, planned_date, template_id, workout_name, focus, planned_rounds,
            planned_duration_seconds, status, completed_workout_id, created_at, updated_at
        `,
        [
          plannedWorkoutId,
          userId,
          payload.plannedDate ?? payload.date ?? null,
          payload.templateId ?? null,
          payload.workoutName === undefined && payload.name === undefined
            ? null
            : String(payload.workoutName ?? payload.name ?? "").trim(),
          payload.focus === undefined ? null : String(payload.focus ?? "Full body").trim() || "Full body",
          payload.plannedRounds === undefined && payload.rounds === undefined ? null : Number(payload.plannedRounds ?? payload.rounds) || 1,
          payload.plannedDurationSeconds === undefined ? null : Number(payload.plannedDurationSeconds) || 60,
          payload.status ?? null,
          payload.completedWorkoutId ?? null,
        ],
      );

      return mapPlannedWorkout(result.rows[0]);
    },

    async deletePlannedWorkout(authSubject, plannedWorkoutId) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query("DELETE FROM planned_workouts WHERE id = $1 AND user_id = $2", [
        plannedWorkoutId,
        userId,
      ]);

      if (!result.rowCount) throwNotFound("Planned workout");
    },

    async listCompletedWorkouts(authSubject) {
      const userId = await ensureUser(db, authSubject);
      const workouts = await db.query(
        `
          SELECT
            id, user_id, planned_workout_id, template_id, name, type, rounds,
            duration_seconds, planned_duration_seconds, work_seconds_per_round,
            rest_seconds_per_round, tags, notes, completed_at, created_at, updated_at
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
                id, completed_workout_id, move_id, position, move_name, pattern, target, weight_value,
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
              planned_duration_seconds, work_seconds_per_round, rest_seconds_per_round, tags, notes, completed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING
              id, user_id, planned_workout_id, template_id, name, type, rounds, duration_seconds,
              planned_duration_seconds, work_seconds_per_round, rest_seconds_per_round, tags, notes, completed_at, created_at, updated_at
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
            String(payload.notes ?? "").trim(),
            payload.completedAt ?? new Date().toISOString(),
          ],
        );
        const workout = mapCompletedWorkout(workoutResult.rows[0]);
        const movements = [];

        for (const [index, movement] of arrayOfObjects(payload.movements).entries()) {
          const movementResult = await client.query(
            `
              INSERT INTO completed_movements (
                completed_workout_id, user_id, move_id, position, move_name, pattern, target,
                weight_value, weight_unit, reps_completed, difficulty, notes,
                primary_muscles, secondary_muscles
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              RETURNING
                id, completed_workout_id, move_id, position, move_name, pattern, target, weight_value,
                weight_unit, reps_completed, difficulty, notes, primary_muscles, secondary_muscles
            `,
            [
              workout.id,
              userId,
              movement.moveId ?? null,
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

    async updateCompletedWorkout(authSubject, completedWorkoutId, payload) {
      const userId = await ensureUser(db, authSubject);
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        const existing = await client.query("SELECT id FROM completed_workouts WHERE id = $1 AND user_id = $2", [
          completedWorkoutId,
          userId,
        ]);

        if (!existing.rowCount) throwNotFound("Completed workout");

        const workoutResult = await client.query(
          `
            UPDATE completed_workouts
            SET
              planned_workout_id = COALESCE($3, planned_workout_id),
              template_id = COALESCE($4, template_id),
              name = COALESCE($5, name),
              type = COALESCE($6, type),
              rounds = COALESCE($7, rounds),
              duration_seconds = COALESCE($8, duration_seconds),
              planned_duration_seconds = COALESCE($9, planned_duration_seconds),
              work_seconds_per_round = COALESCE($10, work_seconds_per_round),
              rest_seconds_per_round = COALESCE($11, rest_seconds_per_round),
              tags = COALESCE($12, tags),
              notes = COALESCE($13, notes),
              completed_at = COALESCE($14, completed_at),
              updated_at = now()
            WHERE id = $1 AND user_id = $2
            RETURNING
              id, user_id, planned_workout_id, template_id, name, type, rounds, duration_seconds,
              planned_duration_seconds, work_seconds_per_round, rest_seconds_per_round, tags, notes, completed_at, created_at, updated_at
          `,
          [
            completedWorkoutId,
            userId,
            payload.plannedWorkoutId ?? null,
            payload.templateId ?? null,
            payload.name === undefined ? null : String(payload.name ?? "").trim(),
            payload.type ?? null,
            payload.rounds === undefined ? null : Number(payload.rounds),
            payload.durationSeconds === undefined ? null : Number(payload.durationSeconds),
            payload.plannedDurationSeconds === undefined ? null : Number(payload.plannedDurationSeconds),
            payload.workSecondsPerRound === undefined ? null : Number(payload.workSecondsPerRound),
            payload.restSecondsPerRound === undefined ? null : Number(payload.restSecondsPerRound),
            payload.tags === undefined ? null : arrayOfStrings(payload.tags),
            payload.notes === undefined ? null : String(payload.notes ?? "").trim(),
            payload.completedAt ?? null,
          ],
        );
        const workout = mapCompletedWorkout(workoutResult.rows[0]);
        let movements = [];

        if (payload.movements !== undefined) {
          await client.query("DELETE FROM completed_movements WHERE completed_workout_id = $1", [completedWorkoutId]);

          for (const [index, movement] of arrayOfObjects(payload.movements).entries()) {
            const movementResult = await client.query(
              `
                INSERT INTO completed_movements (
                  completed_workout_id, user_id, move_id, position, move_name, pattern, target,
                  weight_value, weight_unit, reps_completed, difficulty, notes,
                  primary_muscles, secondary_muscles
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING
                  id, completed_workout_id, move_id, position, move_name, pattern, target, weight_value,
                  weight_unit, reps_completed, difficulty, notes, primary_muscles, secondary_muscles
              `,
              [
                completedWorkoutId,
                userId,
                movement.moveId ?? null,
                index + 1,
                String(movement.moveName ?? movement.move ?? "").trim(),
                String(movement.pattern ?? "").trim(),
                String(movement.target ?? "").trim(),
                movement.weightValue ?? null,
                movement.weightUnit ?? "lb",
                movement.repsCompleted ?? null,
                movement.difficulty ?? movement.effort ?? null,
                String(movement.notes ?? "").trim(),
                arrayOfStrings(movement.primaryMuscles),
                arrayOfStrings(movement.secondaryMuscles),
              ],
            );
            movements.push(mapCompletedMovement(movementResult.rows[0]));
          }
        } else {
          const movementResult = await client.query(
            `
              SELECT
                id, completed_workout_id, move_id, position, move_name, pattern, target, weight_value,
                weight_unit, reps_completed, difficulty, notes, primary_muscles, secondary_muscles
              FROM completed_movements
              WHERE completed_workout_id = $1
              ORDER BY position ASC
            `,
            [completedWorkoutId],
          );
          movements = movementResult.rows.map(mapCompletedMovement);
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

    async deleteCompletedWorkout(authSubject, completedWorkoutId) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query("DELETE FROM completed_workouts WHERE id = $1 AND user_id = $2", [
        completedWorkoutId,
        userId,
      ]);

      if (!result.rowCount) throwNotFound("Completed workout");
    },

    async listPrograms(authSubject) {
      const userId = await ensureUser(db, authSubject);
      const programResult = await db.query(
        `
          SELECT
            id, user_id, name, description, goal, level, duration_weeks, weekly_workouts,
            equipment, tags, visibility, created_at, updated_at
          FROM programs
          WHERE user_id = $1 OR visibility = 'public'
          ORDER BY created_at ASC
        `,
        [userId],
      );
      const programIds = programResult.rows.map((program) => program.id);
      const dayResult = programIds.length
        ? await db.query(
            `
              SELECT id, program_id, position, week_number, day_number, workout_name, focus, template_id, locked, notes
              FROM program_days
              WHERE program_id = ANY($1::uuid[])
              ORDER BY position ASC
            `,
            [programIds],
          )
        : { rows: [] };
      const daysByProgram = groupBy(dayResult.rows.map(mapProgramDay), "programId");

      return programResult.rows.map((row) => ({
        ...mapProgram(row),
        days: daysByProgram.get(row.id) ?? [],
      }));
    },

    async createProgram(authSubject, payload) {
      const userId = await ensureUser(db, authSubject);
      const client = await db.connect();

      try {
        await client.query("BEGIN");
        const programResult = await upsertProgram(client, userId, payload);
        const program = mapProgram(programResult.rows[0]);
        const days = await replaceProgramDays(client, program.id, payload.days);

        await client.query("COMMIT");
        return { ...program, days };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async updateProgram(authSubject, programId, payload) {
      const userId = await ensureUser(db, authSubject);
      const client = await db.connect();

      try {
        await client.query("BEGIN");
        const existing = await client.query("SELECT id FROM programs WHERE id = $1 AND user_id = $2", [programId, userId]);
        if (!existing.rowCount) throwNotFound("Program");

        const programResult = await client.query(
          `
            UPDATE programs
            SET
              name = COALESCE($3, name),
              description = COALESCE($4, description),
              goal = COALESCE($5, goal),
              level = COALESCE($6, level),
              duration_weeks = COALESCE($7, duration_weeks),
              weekly_workouts = COALESCE($8, weekly_workouts),
              equipment = COALESCE($9, equipment),
              tags = COALESCE($10, tags),
              visibility = COALESCE($11, visibility),
              updated_at = now()
            WHERE id = $1 AND user_id = $2
            RETURNING
              id, user_id, name, description, goal, level, duration_weeks, weekly_workouts,
              equipment, tags, visibility, created_at, updated_at
          `,
          [
            programId,
            userId,
            payload.name === undefined ? null : String(payload.name ?? "").trim(),
            payload.description === undefined ? null : String(payload.description ?? "").trim(),
            payload.goal === undefined ? null : String(payload.goal ?? "build_muscle").trim() || "build_muscle",
            payload.level === undefined ? null : String(payload.level ?? "beginner").trim() || "beginner",
            payload.durationWeeks === undefined ? null : Number(payload.durationWeeks) || 1,
            payload.weeklyWorkouts === undefined ? null : Number(payload.weeklyWorkouts) || 3,
            payload.equipment === undefined ? null : arrayOfStrings(payload.equipment),
            payload.tags === undefined ? null : arrayOfStrings(payload.tags),
            payload.visibility ?? null,
          ],
        );
        const program = mapProgram(programResult.rows[0]);
        const days =
          payload.days === undefined
            ? await listProgramDays(client, program.id)
            : await replaceProgramDays(client, program.id, payload.days);

        await client.query("COMMIT");
        return { ...program, days };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async deleteProgram(authSubject, programId) {
      const userId = await ensureUser(db, authSubject);
      const result = await db.query("DELETE FROM programs WHERE id = $1 AND user_id = $2", [programId, userId]);
      if (!result.rowCount) throwNotFound("Program");
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

async function upsertProgram(client, userId, payload) {
  return client.query(
    `
      INSERT INTO programs (
        user_id, name, description, goal, level, duration_weeks, weekly_workouts,
        equipment, tags, visibility
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id, user_id, name, description, goal, level, duration_weeks, weekly_workouts,
        equipment, tags, visibility, created_at, updated_at
    `,
    [
      userId,
      String(payload.name ?? "").trim(),
      String(payload.description ?? "").trim(),
      String(payload.goal ?? "build_muscle").trim() || "build_muscle",
      String(payload.level ?? "beginner").trim() || "beginner",
      Number(payload.durationWeeks) || 1,
      Number(payload.weeklyWorkouts) || 3,
      arrayOfStrings(payload.equipment),
      arrayOfStrings(payload.tags),
      payload.visibility ?? "private",
    ],
  );
}

async function replaceProgramDays(client, programId, days) {
  await client.query("DELETE FROM program_days WHERE program_id = $1", [programId]);

  const mappedDays = [];

  for (const [index, day] of arrayOfObjects(days).entries()) {
    const result = await client.query(
      `
        INSERT INTO program_days (
          program_id, position, week_number, day_number, workout_name, focus, template_id, locked, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, program_id, position, week_number, day_number, workout_name, focus, template_id, locked, notes
      `,
      [
        programId,
        index + 1,
        Number(day.weekNumber) || 1,
        Number(day.dayNumber) || index + 1,
        String(day.workoutName ?? day.name ?? "").trim(),
        String(day.focus ?? "Full body").trim() || "Full body",
        day.templateId ?? null,
        Boolean(day.locked),
        String(day.notes ?? "").trim(),
      ],
    );
    mappedDays.push(mapProgramDay(result.rows[0]));
  }

  return mappedDays;
}

async function listProgramDays(client, programId) {
  const result = await client.query(
    `
      SELECT id, program_id, position, week_number, day_number, workout_name, focus, template_id, locked, notes
      FROM program_days
      WHERE program_id = $1
      ORDER BY position ASC
    `,
    [programId],
  );

  return result.rows.map(mapProgramDay);
}

function throwNotFound(label) {
  const error = new Error(`${label} not found.`);
  error.statusCode = 404;
  throw error;
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
