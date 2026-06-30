import {
  DEFAULT_REST_SECONDS,
  DEFAULT_WORK_SECONDS,
  ROUND_SECONDS,
  getPlannedDurationSeconds,
  getTimerSnapshot as buildTimerSnapshot,
  normalizeIntervalSeconds,
  normalizeRounds,
} from "./timer.js";
import { expandTemplate, workoutTemplates } from "./templates.js";

const DB_NAME = "fitness-friend";
const DB_VERSION = 4;
const STORE_NAME = "emomWorkouts";
const PLAN_STORE_NAME = "weeklyPlans";
const CUSTOM_TEMPLATES_KEY = "fitness-friend-custom-templates";
const DELETED_TEMPLATES_KEY = "fitness-friend-deleted-templates";
const SOUND_ENABLED_KEY = "fitness-friend-sound-enabled";
const FAVORITE_TEMPLATES_KEY = "fitness-friend-favorite-templates";
const EQUIPMENT_KEY = "fitness-friend-equipment";
const TRANSFORMATION_BASELINE_KEY = "fitness-friend-transformation-baseline";
const API_BASE_URL_KEY = "bellforge-api-base-url";
const API_USER_ID_KEY = "bellforge-api-user-id";
const API_SYNC_TIMEOUT_MS = 3500;
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"];
const DEFAULT_FAVORITE_TEMPLATE_IDS = [
  "science-muscle-full-body",
  "science-muscle-core",
  "science-muscle-legs",
  "science-muscle-upper",
];
const DEFAULT_EQUIPMENT = [
  {
    id: "gear-bodyweight",
    name: "Bodyweight",
    category: "Bodyweight",
    detail: "Floor work, pushups, core",
    selected: true,
    isPreset: true,
  },
  {
    id: "gear-kettlebell",
    name: "Kettlebell",
    category: "Weights",
    detail: "Swings, carries, presses",
    selected: true,
    isPreset: true,
  },
  {
    id: "gear-dumbbells",
    name: "Dumbbells",
    category: "Weights",
    detail: "Pairs or adjustable",
    selected: true,
    isPreset: true,
  },
  {
    id: "gear-barbell",
    name: "Barbell",
    category: "Weights",
    detail: "Barbell strength work",
    selected: true,
    isPreset: true,
  },
  {
    id: "gear-bench",
    name: "Bench",
    category: "Accessory",
    detail: "Presses, rows, step-ups",
    selected: false,
    isPreset: true,
  },
  {
    id: "gear-resistance-bands",
    name: "Resistance Bands",
    category: "Accessory",
    detail: "Warmups, pulls, mobility",
    selected: false,
    isPreset: true,
  },
];
const MOVE_ART = new Map(
  [
    ["Kettlebell Swing", "art-move-01"],
    ["Russian Swings", "art-move-01"],
    ["Goblet Squat", "art-move-02"],
    ["Bent Row (Alt)", "art-move-03"],
    ["Bent Row (L)", "art-move-03"],
    ["Bent Row (R)", "art-move-03"],
    ["Bent-Over Row (L)", "art-move-03"],
    ["Bent-Over Row (R)", "art-move-03"],
    ["One-Arm Row (L)", "art-move-03"],
    ["One-Arm Row (R)", "art-move-03"],
    ["Overhead Press (L)", "art-move-04"],
    ["Overhead Press (R)", "art-move-04"],
    ["Goblet Reverse Lunge (Alt)", "art-move-05"],
    ["Kettlebell Halo", "art-move-06"],
    ["Kettlebell Halos (Alt)", "art-move-06"],
    ["Suitcase March (L)", "art-move-07"],
    ["Suitcase March (R)", "art-move-07"],
    ["Half Turkish Get-Up (L)", "art-move-08"],
    ["Half Turkish Get-Up (R)", "art-move-08"],
    ["Kettlebell Deadlift", "art-move-09"],
    ["Single-Leg Deadlift (L)", "art-move-10"],
    ["Single-Leg Deadlift (R)", "art-move-10"],
    ["Single-Arm Clean (L)", "art-move-11"],
    ["Single-Arm Clean (R)", "art-move-11"],
    ["Lateral Lunge Clean (L)", "art-move-12"],
    ["Lateral Lunge Clean (R)", "art-move-12"],
    ["Goblet Squat to Press", "art-move-13"],
    ["Russian Twists with KB", "art-move-14"],
    ["Pushups", "art-move-15"],
    ["Burpees", "art-move-16"],
  ].map(([move, className]) => [normalizeMoveName(move), className]),
);

const elements = {
  workoutName: document.querySelector("#workout-name"),
  appTitle: document.querySelector("#app-title"),
  rounds: document.querySelector("#rounds"),
  workSeconds: document.querySelector("#work-seconds"),
  restSeconds: document.querySelector("#rest-seconds"),
  tags: document.querySelector("#tags"),
  movementArt: document.querySelector("#movement-art"),
  timerContextDetails: document.querySelector("#timer-context-details"),
  phaseLabel: document.querySelector("#phase-label"),
  phaseCue: document.querySelector("#phase-cue"),
  movementKicker: document.querySelector("#movement-kicker"),
  movementLabel: document.querySelector("#movement-label"),
  timerState: document.querySelector("#timer-state"),
  roundLabel: document.querySelector("#round-label"),
  timeLeft: document.querySelector("#time-left"),
  progressFill: document.querySelector("#progress-fill"),
  elapsedTime: document.querySelector("#elapsed-time"),
  startButton: document.querySelector("#start-button"),
  pauseButton: document.querySelector("#pause-button"),
  resetButton: document.querySelector("#reset-button"),
  soundButton: document.querySelector("#sound-button"),
  completeButton: document.querySelector("#complete-button"),
  exportButton: document.querySelector("#export-button"),
  tabButtons: document.querySelectorAll("[data-tab]"),
  tabPanels: document.querySelectorAll("[data-tab-panel]"),
  planTitle: document.querySelector("#plan-title"),
  plannerGrid: document.querySelector("#planner-grid"),
  plannerForm: document.querySelector("#planner-form"),
  plannerDate: document.querySelector("#planner-date"),
  plannerTemplate: document.querySelector("#planner-template"),
  plannerFocus: document.querySelector("#planner-focus"),
  savePlanButton: document.querySelector("#save-plan-button"),
  previousWeekButton: document.querySelector("#previous-week-button"),
  todayWeekButton: document.querySelector("#today-week-button"),
  nextWeekButton: document.querySelector("#next-week-button"),
  progressSummary: document.querySelector("#progress-summary"),
  progressHeatmap: document.querySelector("#progress-heatmap"),
  transformationSummary: document.querySelector("#transformation-summary"),
  baselineForm: document.querySelector("#baseline-form"),
  baselineStartDate: document.querySelector("#baseline-start-date"),
  baselineWeight: document.querySelector("#baseline-weight"),
  baselineWaist: document.querySelector("#baseline-waist"),
  baselineChest: document.querySelector("#baseline-chest"),
  baselineArm: document.querySelector("#baseline-arm"),
  baselineGoal: document.querySelector("#baseline-goal"),
  saveBaselineButton: document.querySelector("#save-baseline-button"),
  transformationGrid: document.querySelector("#transformation-grid"),
  muscleBalanceList: document.querySelector("#muscle-balance-list"),
  strengthSignalList: document.querySelector("#strength-signal-list"),
  newTemplateButton: document.querySelector("#new-template-button"),
  clearBuilderButton: document.querySelector("#clear-builder-button"),
  builderTitle: document.querySelector("#builder-title"),
  builderForm: document.querySelector("#builder-form"),
  builderName: document.querySelector("#builder-name"),
  builderCycles: document.querySelector("#builder-cycles"),
  builderTags: document.querySelector("#builder-tags"),
  builderMoveName: document.querySelector("#builder-move-name"),
  builderMoveTarget: document.querySelector("#builder-move-target"),
  builderMovePattern: document.querySelector("#builder-move-pattern"),
  builderLibrarySearch: document.querySelector("#builder-library-search"),
  builderLibraryPatternFilter: document.querySelector("#builder-library-pattern-filter"),
  builderLibraryEquipmentFilter: document.querySelector("#builder-library-equipment-filter"),
  builderLibraryCount: document.querySelector("#builder-library-count"),
  builderLibraryList: document.querySelector("#builder-library-list"),
  addMoveButton: document.querySelector("#add-move-button"),
  builderMoveList: document.querySelector("#builder-move-list"),
  saveTemplateButton: document.querySelector("#save-template-button"),
  builderSummary: document.querySelector("#builder-summary"),
  equipmentForm: document.querySelector("#equipment-form"),
  equipmentName: document.querySelector("#equipment-name"),
  equipmentCategory: document.querySelector("#equipment-category"),
  equipmentDetail: document.querySelector("#equipment-detail"),
  addEquipmentButton: document.querySelector("#add-equipment-button"),
  equipmentCount: document.querySelector("#equipment-count"),
  equipmentList: document.querySelector("#equipment-list"),
  templateList: document.querySelector("#template-list"),
  exerciseCount: document.querySelector("#exercise-count"),
  exerciseSearch: document.querySelector("#exercise-search"),
  exercisePatternFilter: document.querySelector("#exercise-pattern-filter"),
  exerciseEquipmentFilter: document.querySelector("#exercise-equipment-filter"),
  exerciseList: document.querySelector("#exercise-list"),
  scheduleTitle: document.querySelector("#schedule-title"),
  scheduleSummary: document.querySelector("#schedule-summary"),
  scheduleList: document.querySelector("#schedule-list"),
  historyList: document.querySelector("#history-list"),
  totalWorkouts: document.querySelector("#total-workouts"),
  totalMinutes: document.querySelector("#total-minutes"),
  totalRounds: document.querySelector("#total-rounds"),
  celebration: document.querySelector("#celebration"),
  completionLog: document.querySelector("#completion-log"),
  completionNotes: document.querySelector("#completion-notes"),
  completionLogList: document.querySelector("#completion-log-list"),
  saveMovementLogButton: document.querySelector("#save-movement-log-button"),
  skipMovementLogButton: document.querySelector("#skip-movement-log-button"),
};

const state = {
  status: "ready",
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  intervalId: null,
  isCompleting: false,
  selectedTemplate: null,
  expandedTemplateId: null,
  activePlan: [],
  templates: [],
  builderEditingId: null,
  builderEditingMoveIndex: null,
  builderMoves: [],
  equipment: loadEquipment(),
  activePlanSessionId: null,
  currentWeekStart: getStartOfWeek(new Date()),
  favoriteTemplateIds: loadFavoriteTemplateIds(),
  soundEnabled: loadSoundPreference(),
  baseline: loadBaseline(),
  pendingWorkoutLog: null,
  audioContext: null,
  audioUnlockPromise: null,
  playedAudioCues: new Set(),
  celebrationTimeoutId: null,
  scheduleFocusKey: null,
};

let dbPromise = openDatabase();

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.addEventListener("upgradeneeded", (event) => {
      const db = request.result;
      const store =
        event.oldVersion === 0
          ? db.createObjectStore(STORE_NAME, {
              keyPath: "id",
              autoIncrement: true,
            })
          : request.transaction.objectStore(STORE_NAME);

      if (!db.objectStoreNames.contains(PLAN_STORE_NAME)) {
        const planStore = db.createObjectStore(PLAN_STORE_NAME, {
          keyPath: "id",
        });
        planStore.createIndex("date", "date");
        planStore.createIndex("status", "status");
      }

      if (!store.indexNames.contains("completedAt")) {
        store.createIndex("completedAt", "completedAt");
      }

      if (!store.indexNames.contains("name")) {
        store.createIndex("name", "name");
      }

      if (event.oldVersion < 3) {
        const cursorRequest = store.openCursor();

        cursorRequest.addEventListener("success", () => {
          const cursor = cursorRequest.result;

          if (!cursor) return;

          const workout = cursor.value;

          if (workout.type === "EMOM" && workout.rounds) {
            cursor.update({
              ...workout,
              plannedDurationSeconds: getPlannedDurationSeconds(
                workout.rounds,
                workout.restSecondsPerRound ?? DEFAULT_REST_SECONDS,
              ),
              workSecondsPerRound: workout.workSecondsPerRound ?? DEFAULT_WORK_SECONDS,
              restSecondsPerRound: workout.restSecondsPerRound ?? DEFAULT_REST_SECONDS,
            });
          }

          cursor.continue();
        });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function withStore(mode, callback) {
  return withNamedStore(STORE_NAME, mode, callback);
}

function withNamedStore(storeName, mode, callback) {
  return dbPromise.then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = callback(store);

        transaction.addEventListener("complete", () => resolve(request?.result));
        transaction.addEventListener("error", () => reject(transaction.error));
      }),
  );
}

function addWorkout(workout) {
  return withStore("readwrite", (store) => store.add(workout));
}

function putWorkout(workout) {
  return withStore("readwrite", (store) => store.put(workout));
}

function deleteWorkout(workoutId) {
  return withStore("readwrite", (store) => store.delete(workoutId));
}

function getWorkouts() {
  return withStore("readonly", (store) => store.getAll()).then((workouts) =>
    workouts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
  );
}

function getApiConfig() {
  const searchParams = new URLSearchParams(window.location.search);
  const queryBaseUrl = searchParams.get("apiBaseUrl") ?? searchParams.get("api");
  const queryUserId = searchParams.get("userId");

  if (queryBaseUrl !== null) {
    localStorage.setItem(API_BASE_URL_KEY, queryBaseUrl.trim());
  }

  if (queryUserId !== null) {
    localStorage.setItem(API_USER_ID_KEY, queryUserId.trim());
  }

  const baseUrl = (queryBaseUrl ?? localStorage.getItem(API_BASE_URL_KEY) ?? "").trim().replace(/\/+$/, "");
  const userId = (queryUserId ?? localStorage.getItem(API_USER_ID_KEY) ?? "web-local").trim() || "web-local";

  return {
    baseUrl,
    userId,
    enabled: Boolean(baseUrl),
  };
}

async function requestApi(path, { method = "GET", body = null } = {}) {
  const config = getApiConfig();
  if (!config.enabled) return null;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_SYNC_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-user-id": config.userId,
      },
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`API ${method} ${path} failed with ${response.status}`);
    if (response.status === 204) return null;

    const payload = await response.json();
    return payload.data ?? payload;
  } catch (error) {
    console.warn("[BellForge API sync]", error);
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function toApiTemplatePayload(template) {
  return {
    name: template.name,
    description: template.description ?? "",
    source: template.source ?? "Custom",
    cycles: template.cycles,
    tags: template.tags ?? [],
    visibility: template.visibility ?? "private",
    movements: (template.movements ?? []).map((movement) => ({
      moveName: movement.moveName ?? movement.move,
      target: movement.target ?? `${DEFAULT_WORK_SECONDS} sec`,
      pattern: movement.pattern ?? "Move",
      cue: movement.cue ?? "",
      primaryMuscles: movement.primaryMuscles ?? [],
      secondaryMuscles: movement.secondaryMuscles ?? [],
    })),
  };
}

function toApiPlanPayload(session) {
  return {
    plannedDate: session.date ?? session.plannedDate,
    templateId: session.templateApiId ?? null,
    workoutName: session.workoutName,
    focus: session.focus,
    plannedRounds: session.plannedRounds,
    plannedDurationSeconds: session.plannedDurationSeconds,
    status: session.status,
    completedWorkoutId: session.completedWorkoutApiId ?? null,
  };
}

function toApiCompletedWorkoutPayload(workout) {
  const movements = getWorkoutMovementLogs(workout).length
    ? getWorkoutMovementLogs(workout)
    : getDistinctMovementPlan(workout.plannedMovements ?? []);

  return {
    plannedWorkoutId: workout.plannedSessionApiId ?? null,
    templateId: workout.templateApiId ?? null,
    name: workout.name,
    type: workout.type ?? "EMOM",
    rounds: workout.rounds,
    durationSeconds: workout.durationSeconds,
    plannedDurationSeconds: workout.plannedDurationSeconds,
    workSecondsPerRound: workout.workSecondsPerRound ?? DEFAULT_WORK_SECONDS,
    restSecondsPerRound: workout.restSecondsPerRound ?? DEFAULT_REST_SECONDS,
    tags: workout.tags ?? [],
    notes: workout.notes ?? "",
    movements: movements.map((movement) => ({
      moveName: movement.moveName ?? movement.move,
      pattern: movement.pattern ?? "Move",
      target: movement.target ?? "",
      weightValue: movement.weightValue ?? null,
      weightUnit: movement.weightUnit ?? "lb",
      repsCompleted: movement.repsCompleted ?? null,
      difficulty: movement.difficulty ?? movement.effort ?? null,
      notes: movement.notes ?? "",
      primaryMuscles: movement.primaryMuscles ?? [],
      secondaryMuscles: movement.secondaryMuscles ?? [],
    })),
    completedAt: workout.completedAt,
  };
}

async function syncTemplateToApi(template) {
  const path = template.apiId ? `/v1/workout-templates/${encodeURIComponent(template.apiId)}` : "/v1/workout-templates";
  const syncedTemplate = await requestApi(path, {
    method: template.apiId ? "PATCH" : "POST",
    body: toApiTemplatePayload(template),
  });

  return syncedTemplate?.id ? { ...template, apiId: syncedTemplate.id } : template;
}

async function syncPlanSessionToApi(session) {
  const path = session.apiId ? `/v1/planned-workouts/${encodeURIComponent(session.apiId)}` : "/v1/planned-workouts";
  const syncedSession = await requestApi(path, {
    method: session.apiId ? "PATCH" : "POST",
    body: toApiPlanPayload(session),
  });

  return syncedSession?.id ? { ...session, apiId: syncedSession.id } : session;
}

async function syncCompletedWorkoutToApi(workout) {
  const path = workout.apiId ? `/v1/completed-workouts/${encodeURIComponent(workout.apiId)}` : "/v1/completed-workouts";
  const syncedWorkout = await requestApi(path, {
    method: workout.apiId ? "PATCH" : "POST",
    body: toApiCompletedWorkoutPayload(workout),
  });

  return syncedWorkout?.id ? { ...workout, apiId: syncedWorkout.id } : workout;
}

async function deleteApiResource(path, apiId) {
  if (!apiId) return;
  await requestApi(`${path}/${encodeURIComponent(apiId)}`, { method: "DELETE" });
}

async function hydrateFromApi() {
  if (!getApiConfig().enabled) return;

  const [apiEquipment, apiTemplates, apiCompletedWorkouts] = await Promise.all([
    requestApi("/v1/equipment"),
    requestApi("/v1/workout-templates"),
    requestApi("/v1/completed-workouts"),
  ]);

  hydrateEquipmentFromApi(apiEquipment ?? []);
  hydrateTemplatesFromApi(apiTemplates ?? []);
  await hydrateCompletedWorkoutsFromApi(apiCompletedWorkouts ?? []);

  loadTemplates();

  const apiPlanSessions = await requestApi("/v1/planned-workouts");
  await hydratePlanSessionsFromApi(apiPlanSessions ?? []);
}

function hydrateEquipmentFromApi(apiEquipment) {
  if (!apiEquipment.length) return;

  state.equipment = apiEquipment.reduce((equipmentList, item) => {
    const existingIndex = equipmentList.findIndex(
      (equipment) =>
        equipment.apiId === item.id ||
        normalizeMoveName(equipment.name) === normalizeMoveName(item.name),
    );
    const existing = existingIndex >= 0 ? equipmentList[existingIndex] : null;
    const nextEquipment = sanitizeEquipment({
      id: existing?.id ?? `api-gear-${item.id}`,
      apiId: item.id,
      name: item.name,
      category: item.category,
      detail: item.detail,
      selected: item.selected ?? true,
      isPreset: existing?.isPreset ?? false,
    });

    if (existingIndex >= 0) {
      equipmentList[existingIndex] = nextEquipment;
      return equipmentList;
    }

    return [...equipmentList, nextEquipment];
  }, [...state.equipment]);

  saveEquipment();
}

function hydrateTemplatesFromApi(apiTemplates) {
  if (!apiTemplates.length) return;

  const customTemplates = loadCustomTemplates();
  const nextTemplates = apiTemplates.reduce((templates, item) => {
    const existingIndex = templates.findIndex(
      (template) =>
        template.apiId === item.id ||
        normalizeMoveName(template.name) === normalizeMoveName(item.name),
    );
    const existing = existingIndex >= 0 ? templates[existingIndex] : null;
    const nextTemplate = {
      id: existing?.id ?? `api-template-${item.id}`,
      apiId: item.id,
      name: item.name,
      description: item.description ?? "",
      source: item.source ?? "API",
      tags: item.tags ?? [],
      cycles: item.cycles ?? 1,
      visibility: item.visibility ?? "private",
      movements: (item.movements ?? []).map((movement) => ({
        move: movement.moveName ?? movement.move,
        target: movement.target ?? `${DEFAULT_WORK_SECONDS} sec`,
        pattern: movement.pattern ?? "Move",
        cue: movement.cue ?? "",
        primaryMuscles: movement.primaryMuscles ?? [],
        secondaryMuscles: movement.secondaryMuscles ?? [],
      })),
      isCustom: true,
    };

    if (existingIndex >= 0) {
      templates[existingIndex] = nextTemplate;
      return templates;
    }

    return [...templates, nextTemplate];
  }, customTemplates);

  saveCustomTemplates(nextTemplates);
}

async function hydrateCompletedWorkoutsFromApi(apiWorkouts) {
  if (!apiWorkouts.length) return;

  const localWorkouts = await getWorkouts();

  await Promise.all(
    apiWorkouts.map((workout) => {
      const existingWorkout = localWorkouts.find((candidate) => candidate.apiId === workout.id);
      const hydratedWorkout = {
        ...(existingWorkout ? { id: existingWorkout.id } : {}),
        apiId: workout.id,
        name: workout.name,
        type: workout.type ?? "EMOM",
        rounds: workout.rounds,
        tags: workout.tags ?? [],
        completedAt: workout.completedAt,
        durationSeconds: workout.durationSeconds,
        plannedDurationSeconds: workout.plannedDurationSeconds,
        workSecondsPerRound: workout.workSecondsPerRound ?? DEFAULT_WORK_SECONDS,
        restSecondsPerRound: workout.restSecondsPerRound ?? DEFAULT_REST_SECONDS,
        templateApiId: workout.templateId ?? null,
        plannedSessionApiId: workout.plannedWorkoutId ?? null,
        notes: workout.notes ?? "",
        movementLogs: (workout.movements ?? []).map((movement) => ({
          move: movement.moveName ?? movement.move,
          target: movement.target ?? "",
          pattern: movement.pattern ?? "Move",
          weightValue: movement.weightValue ?? null,
          weightUnit: movement.weightUnit ?? "lb",
          repsCompleted: movement.repsCompleted ?? null,
          effort: movement.difficulty ?? null,
          notes: movement.notes ?? "",
          primaryMuscles: movement.primaryMuscles ?? [],
          secondaryMuscles: movement.secondaryMuscles ?? [],
          recommendation: "Repeat and improve one number next time.",
        })),
      };

      return putWorkout(hydratedWorkout);
    }),
  );
}

async function hydratePlanSessionsFromApi(apiPlanSessions) {
  if (!apiPlanSessions.length) return;

  const [localSessions, localWorkouts] = await Promise.all([getPlanSessions(), getWorkouts()]);

  await Promise.all(
    apiPlanSessions.map((session) => {
      const existingSession = localSessions.find((candidate) => candidate.apiId === session.id);
      const matchingTemplate = state.templates.find((template) => template.apiId === session.templateId);
      const matchingWorkout = localWorkouts.find((workout) => workout.apiId === session.completedWorkoutId);
      const hydratedSession = {
        id: existingSession?.id ?? `api-plan-${session.id}`,
        apiId: session.id,
        date: session.plannedDate,
        templateId: existingSession?.templateId ?? matchingTemplate?.id ?? session.templateId ?? "",
        templateApiId: session.templateId ?? null,
        workoutName: session.workoutName,
        focus: session.focus,
        plannedRounds: session.plannedRounds,
        plannedDurationSeconds: session.plannedDurationSeconds,
        status: session.status,
        completedWorkoutId: matchingWorkout?.id ?? null,
        completedWorkoutApiId: session.completedWorkoutId ?? null,
        createdAt: existingSession?.createdAt ?? session.createdAt ?? new Date().toISOString(),
        updatedAt: session.updatedAt ?? new Date().toISOString(),
      };

      return putPlanSession(hydratedSession);
    }),
  );
}

function putPlanSession(session) {
  return withNamedStore(PLAN_STORE_NAME, "readwrite", (store) => store.put(session));
}

function deletePlanSession(sessionId) {
  return withNamedStore(PLAN_STORE_NAME, "readwrite", (store) => store.delete(sessionId));
}

function getPlanSessions() {
  return withNamedStore(PLAN_STORE_NAME, "readonly", (store) => store.getAll()).then((sessions) =>
    sessions.sort((a, b) => a.date.localeCompare(b.date)),
  );
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getStartOfWeek(date) {
  const start = new Date(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getWeekDays(weekStart = state.currentWeekStart) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function loadBaseline() {
  try {
    const rawBaseline = localStorage.getItem(TRANSFORMATION_BASELINE_KEY);
    return rawBaseline ? JSON.parse(rawBaseline) : null;
  } catch {
    return null;
  }
}

function saveBaseline(baseline) {
  state.baseline = baseline;
  localStorage.setItem(TRANSFORMATION_BASELINE_KEY, JSON.stringify(baseline));
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function getBaselineFormValues() {
  return {
    startedAt: elements.baselineStartDate.value || getDateKey(new Date()),
    bodyWeight: numberOrNull(elements.baselineWeight.value),
    waist: numberOrNull(elements.baselineWaist.value),
    chest: numberOrNull(elements.baselineChest.value),
    arm: numberOrNull(elements.baselineArm.value),
    goal: elements.baselineGoal.value.trim() || "Build visible muscle and strength",
    updatedAt: new Date().toISOString(),
  };
}

function getEffectivePlanStatus(session, todayKey = getDateKey(new Date())) {
  if (!session) return "empty";
  if (session.status === "planned" && session.date < todayKey) return "missed";
  return session.status;
}

function getFormValues() {
  const workSeconds = normalizeIntervalSeconds(elements.workSeconds.value, DEFAULT_WORK_SECONDS);
  const restSeconds = normalizeIntervalSeconds(elements.restSeconds.value, DEFAULT_REST_SECONDS);

  return {
    name: elements.workoutName.value.trim() || state.selectedTemplate?.name || "Manual EMOM",
    rounds: normalizeRounds(elements.rounds.value),
    workSeconds,
    restSeconds,
    tags: elements.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

function loadTemplates() {
  const deletedTemplateIds = loadDeletedTemplateIds();
  state.templates = [...workoutTemplates, ...loadCustomTemplates()].filter((template) => !deletedTemplateIds.has(template.id));
}

function loadCustomTemplates() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates) {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

function loadDeletedTemplateIds() {
  try {
    const deletedTemplateIds = JSON.parse(localStorage.getItem(DELETED_TEMPLATES_KEY) ?? "[]");
    return new Set(Array.isArray(deletedTemplateIds) ? deletedTemplateIds : []);
  } catch {
    return new Set();
  }
}

function saveDeletedTemplateIds(templateIds) {
  localStorage.setItem(DELETED_TEMPLATES_KEY, JSON.stringify([...templateIds]));
}

function loadFavoriteTemplateIds() {
  try {
    const savedTemplateIds = localStorage.getItem(FAVORITE_TEMPLATES_KEY);

    if (!savedTemplateIds) return new Set(DEFAULT_FAVORITE_TEMPLATE_IDS);

    return new Set(JSON.parse(savedTemplateIds));
  } catch {
    return new Set(DEFAULT_FAVORITE_TEMPLATE_IDS);
  }
}

function saveFavoriteTemplateIds() {
  localStorage.setItem(FAVORITE_TEMPLATES_KEY, JSON.stringify([...state.favoriteTemplateIds]));
}

function loadEquipment() {
  try {
    const savedEquipment = JSON.parse(localStorage.getItem(EQUIPMENT_KEY) ?? "null");

    if (!Array.isArray(savedEquipment)) return DEFAULT_EQUIPMENT.map((equipment) => ({ ...equipment }));

    const defaultIds = new Set(DEFAULT_EQUIPMENT.map((equipment) => equipment.id));
    const savedById = new Map(savedEquipment.map((equipment) => [equipment.id, equipment]));
    const mergedPresets = DEFAULT_EQUIPMENT.map((equipment) => {
      const saved = savedById.get(equipment.id);

      return sanitizeEquipment({
        ...equipment,
        selected: saved?.selected ?? equipment.selected,
        detail: saved?.detail ?? equipment.detail,
      });
    });
    const customEquipment = savedEquipment
      .filter((equipment) => equipment?.id && !defaultIds.has(equipment.id))
      .map((equipment) => sanitizeEquipment({ ...equipment, isPreset: false }))
      .filter((equipment) => equipment.name);

    return [...mergedPresets, ...customEquipment];
  } catch {
    return DEFAULT_EQUIPMENT.map((equipment) => ({ ...equipment }));
  }
}

function sanitizeEquipment(equipment) {
  return {
    id: String(equipment.id ?? `gear-${Date.now()}`),
    apiId: equipment.apiId ? String(equipment.apiId) : null,
    name: String(equipment.name ?? "").trim(),
    category: String(equipment.category ?? "Accessory").trim() || "Accessory",
    detail: String(equipment.detail ?? "").trim(),
    selected: Boolean(equipment.selected),
    isPreset: Boolean(equipment.isPreset),
  };
}

function saveEquipment() {
  localStorage.setItem(EQUIPMENT_KEY, JSON.stringify(state.equipment));
}

function getSelectedEquipment() {
  return state.equipment.filter((equipment) => equipment.selected);
}

async function syncEquipmentToApi(equipment) {
  const path = equipment.apiId ? `/v1/equipment/${encodeURIComponent(equipment.apiId)}` : "/v1/equipment";
  const syncedEquipment = await requestApi(path, {
    method: equipment.apiId ? "PATCH" : "POST",
    body: {
      name: equipment.name,
      category: equipment.category,
      detail: equipment.detail,
      selected: equipment.selected,
    },
  });

  return syncedEquipment?.id ? { ...equipment, apiId: syncedEquipment.id } : equipment;
}

async function persistEquipmentSync(equipmentId) {
  const equipment = state.equipment.find((candidate) => candidate.id === equipmentId);
  if (!equipment) return;

  const syncedEquipment = await syncEquipmentToApi(equipment);

  if (syncedEquipment.apiId !== equipment.apiId) {
    state.equipment = state.equipment.map((candidate) => (candidate.id === equipmentId ? syncedEquipment : candidate));
    saveEquipment();
    renderEquipment();
  }
}

function loadSoundPreference() {
  return localStorage.getItem(SOUND_ENABLED_KEY) !== "false";
}

function saveSoundPreference() {
  localStorage.setItem(SOUND_ENABLED_KEY, String(state.soundEnabled));
}

function switchTab(tabName) {
  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function getElapsedMs(now = Date.now()) {
  if (!state.startedAt) return 0;
  const current = state.status === "paused" && state.pausedAt ? state.pausedAt : now;
  return Math.max(0, current - state.startedAt - state.pausedMs);
}

function getTimerSnapshot(now = Date.now()) {
  const { rounds, workSeconds, restSeconds } = getFormValues();

  return buildTimerSnapshot({
    rounds,
    workSeconds,
    restSeconds,
    elapsedMs: getElapsedMs(now),
    status: state.status,
  });
}

function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateTimerContext() {
  const { name, rounds, workSeconds, restSeconds } = getFormValues();
  const totalDuration = formatClock(getPlannedDurationSeconds(rounds, restSeconds));
  const moveCount = state.selectedTemplate?.movements.length;
  const moveSummary = moveCount ? ` · ${moveCount} moves` : "";

  elements.appTitle.textContent = name;
  elements.timerContextDetails.textContent = `${rounds} rounds${moveSummary} · ${totalDuration} total · ${workSeconds}s work / ${restSeconds}s rest`;
}

function updateDisplay() {
  validateIntervalInputs();
  const snapshot = getTimerSnapshot();
  const elapsedSeconds = Math.floor(snapshot.elapsedMs / 1000);
  const activeMovement = getActiveMovement(snapshot);
  const visibleMovement = snapshot.isRest ? state.activePlan[snapshot.currentRound] ?? activeMovement : activeMovement;

  elements.phaseLabel.textContent = snapshot.phaseName === "Complete" ? "Complete" : `${snapshot.phaseName} phase`;
  elements.phaseCue.textContent = getPhaseCue(snapshot);
  elements.roundLabel.textContent = `Round ${snapshot.currentRound} of ${snapshot.rounds}`;
  elements.movementKicker.textContent = getMovementKicker(snapshot, activeMovement);
  elements.movementLabel.textContent = getMovementLabel(snapshot, activeMovement);
  updateMovementArt(visibleMovement);
  elements.timeLeft.textContent = formatClock(snapshot.secondsLeft);
  elements.elapsedTime.textContent = `Elapsed ${formatClock(elapsedSeconds)}`;
  elements.progressFill.style.width = `${Math.min(100, snapshot.progress * 100)}%`;
  updateTimerContext();
  document.body.classList.toggle("rest-mode", snapshot.isRest && state.status !== "complete");
  updateScheduleHighlight(snapshot);

  if (snapshot.elapsedMs >= snapshot.totalMs && state.status === "running" && !state.isCompleting) {
    completeWorkout();
    return;
  }

  handleAudioCues(snapshot);
}

function setStatus(status) {
  state.status = status;
  elements.timerState.textContent = status[0].toUpperCase() + status.slice(1);
  elements.startButton.textContent = status === "paused" ? "Resume" : "Start";
  elements.startButton.disabled = status === "running" || status === "complete";
  elements.pauseButton.disabled = status !== "running";
  elements.completeButton.disabled = status === "ready" || status === "complete";
  elements.workoutName.disabled = status === "running" || status === "paused";
  elements.rounds.disabled = status === "running" || status === "paused";
  elements.workSeconds.disabled = status === "running" || status === "paused";
  elements.restSeconds.disabled = status === "running" || status === "paused";
  elements.tags.disabled = status === "running" || status === "paused";
  elements.templateList.querySelectorAll("button").forEach((button) => {
    button.disabled = status === "running" || status === "paused";
  });
  elements.plannerForm.querySelectorAll("select, button").forEach((field) => {
    field.disabled = status === "running" || status === "paused";
  });
  elements.plannerGrid.querySelectorAll("button").forEach((button) => {
    button.disabled = status === "running" || status === "paused";
  });
  elements.equipmentForm.querySelectorAll("input, select, button").forEach((field) => {
    field.disabled = status === "running" || status === "paused";
  });
  elements.equipmentList.querySelectorAll("button").forEach((button) => {
    button.disabled = status === "running" || status === "paused";
  });
  updateSoundButton();
}

async function startTimer() {
  validateIntervalInputs();
  if (!isTimerConfigValid()) return;

  if (state.status === "paused") {
    state.pausedMs += Date.now() - state.pausedAt;
    state.pausedAt = null;
  } else {
    state.startedAt = Date.now();
    state.pausedMs = 0;
    state.isCompleting = false;
  }

  unlockAudio().catch(() => null);
  clearInterval(state.intervalId);
  state.intervalId = setInterval(updateDisplay, 250);
  setStatus("running");
  updateDisplay();
}

function pauseTimer() {
  state.pausedAt = Date.now();
  clearInterval(state.intervalId);
  setStatus("paused");
  updateDisplay();
}

function resetTimer() {
  clearInterval(state.intervalId);
  state.startedAt = null;
  state.pausedAt = null;
  state.pausedMs = 0;
  state.isCompleting = false;
  state.playedAudioCues.clear();
  setStatus("ready");
  updateDisplay();
}

async function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  saveSoundPreference();
  updateSoundButton();

  if (state.soundEnabled) {
    await playTone({ frequency: 784, duration: 0.13, volume: 0.28, type: "triangle" });
  }
}

function updateSoundButton() {
  elements.soundButton.textContent = state.soundEnabled ? "Sound On" : "Sound Off";
  elements.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
}

function getPhaseCue(snapshot) {
  if (state.status === "ready") return "Ready";
  if (state.status === "paused") return "Paused";
  if (snapshot.phaseName === "Complete") return "Workout complete";

  if (!snapshot.isRest && snapshot.secondsLeft <= 3 && snapshot.secondsLeft > 0) {
    return snapshot.currentRound < snapshot.rounds
      ? `Rest in ${snapshot.secondsLeft}`
      : `Finish in ${snapshot.secondsLeft}`;
  }

  if (snapshot.isRest && snapshot.secondsLeft <= 3 && snapshot.secondsLeft > 0) {
    return `Go in ${snapshot.secondsLeft}`;
  }

  return snapshot.isRest ? "Rest now" : "Work now";
}

async function unlockAudio() {
  if (!state.soundEnabled) return null;
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;

  if (!AudioContext) return null;

  state.audioContext ??= new AudioContext();

  if (state.audioContext.state === "suspended") {
    state.audioUnlockPromise ??= state.audioContext.resume().finally(() => {
      state.audioUnlockPromise = null;
    });
    try {
      await state.audioUnlockPromise;
    } catch {
      return null;
    }
  }

  return state.audioContext;
}

function handleAudioCues(snapshot) {
  if (!state.soundEnabled || state.status !== "running") return;

  if (!snapshot.isRest && snapshot.secondsIntoRound === 0) {
    playAudioCue(`round-${snapshot.currentRound}`, () => playRoundStartCue());
  }

  if (snapshot.isRest && snapshot.secondsIntoRound === snapshot.workSeconds) {
    playAudioCue(`rest-${snapshot.currentRound}`, () => playRestStartCue());
  }

  if (!snapshot.isRest && snapshot.secondsLeft <= 3 && snapshot.secondsLeft > 0) {
    playAudioCue(`work-countdown-${snapshot.currentRound}-${snapshot.secondsLeft}`, () => playCountdownCue(snapshot.secondsLeft, "rest"));
  }

  if (snapshot.isRest && snapshot.secondsLeft <= 3 && snapshot.secondsLeft > 0) {
    playAudioCue(`rest-countdown-${snapshot.currentRound}-${snapshot.secondsLeft}`, () => playCountdownCue(snapshot.secondsLeft, "work"));
  }
}

function playAudioCue(key, callback) {
  if (state.playedAudioCues.has(key)) return;

  state.playedAudioCues.add(key);
  callback();
}

function playRoundStartCue() {
  playTone({ frequency: 784, duration: 0.12, volume: 0.34, type: "triangle" });
  window.setTimeout(() => playTone({ frequency: 1046, duration: 0.15, volume: 0.36, type: "triangle" }), 110);
}

function playRestStartCue() {
  playTone({ frequency: 440, duration: 0.14, volume: 0.32, type: "square" });
  window.setTimeout(() => playTone({ frequency: 330, duration: 0.18, volume: 0.34, type: "square" }), 120);
}

function playCountdownCue(secondsLeft, nextPhase) {
  const restCountdownFrequencies = {
    3: 740,
    2: 660,
    1: 560,
  };
  const workCountdownFrequencies = {
    3: 660,
    2: 784,
    1: 988,
  };
  const frequencies = nextPhase === "work" ? workCountdownFrequencies : restCountdownFrequencies;
  const type = nextPhase === "work" ? "triangle" : "sine";

  playTone({ frequency: frequencies[secondsLeft], duration: 0.12, volume: 0.3, type });
}

async function playTone({ frequency, duration, volume, type }) {
  const audioContext = await unlockAudio();

  if (!audioContext || audioContext.state !== "running") return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  compressor.threshold.setValueAtTime(-18, now);
  compressor.knee.setValueAtTime(18, now);
  compressor.ratio.setValueAtTime(6, now);
  compressor.attack.setValueAtTime(0.003, now);
  compressor.release.setValueAtTime(0.08, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(compressor);
  compressor.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function getDistinctMovementPlan(plan) {
  const movements = new Map();

  plan.forEach((movement) => {
    const key = movement.move ? normalizeMoveName(movement.move) : `move-${movement.movementIndex}`;

    if (!movements.has(key)) {
      movements.set(key, {
        move: movement.move,
        target: movement.target ?? "",
        pattern: movement.pattern ?? "Move",
        cue: movement.cue ?? "",
        primaryMuscles: movement.primaryMuscles ?? [],
        secondaryMuscles: movement.secondaryMuscles ?? [],
      });
    }
  });

  return [...movements.values()];
}

function getWorkoutMovementLogs(workout) {
  return Array.isArray(workout.movementLogs) ? workout.movementLogs : [];
}

function getLastMovementLog(moveName, workouts, excludeWorkoutId = null) {
  const normalizedName = normalizeMoveName(moveName);

  for (const workout of workouts) {
    if (excludeWorkoutId && workout.id === excludeWorkoutId) continue;

    const log = getWorkoutMovementLogs(workout).find(
      (movementLog) => normalizeMoveName(movementLog.move) === normalizedName,
    );

    if (log && (log.weightValue || log.repsCompleted || log.effort)) {
      return {
        ...log,
        completedAt: workout.completedAt,
        workoutName: workout.name,
      };
    }
  }

  return null;
}

function formatLoadReps(log) {
  const parts = [];

  if (log.weightValue) parts.push(`${log.weightValue} ${log.weightUnit ?? "lb"}`);
  if (log.repsCompleted) parts.push(`${log.repsCompleted} reps`);
  if (log.effort) parts.push(`${log.effort}/10 effort`);

  return parts.length ? parts.join(" · ") : "No numbers logged";
}

function getProgressionRecommendation(log, lastLog) {
  if (!log.repsCompleted && !log.weightValue) return "Add reps or load so future sessions can compare.";
  if (!lastLog) return "Baseline set. Repeat this move next time and try to beat one number.";

  const currentWeight = log.weightValue ?? 0;
  const lastWeight = lastLog.weightValue ?? 0;
  const currentReps = log.repsCompleted ?? 0;
  const lastReps = lastLog.repsCompleted ?? 0;
  const effort = log.effort ?? 0;

  if (effort >= 9) return "Hard set. Repeat this load next time and make it cleaner.";
  if (currentWeight > lastWeight || currentReps > lastReps) return "Progress made. Next time add 1-2 reps or a small load jump.";
  if (currentWeight === lastWeight && currentReps === lastReps) return "Matched last time. Push one more rep next time if form is solid.";
  return "Keep the movement in rotation and rebuild reps before adding load.";
}

function buildDefaultMovementLogs(workouts, workoutId = null) {
  return getDistinctMovementPlan(state.activePlan).map((movement) => {
    const lastLog = getLastMovementLog(movement.move, workouts, workoutId);

    return {
      ...movement,
      weightValue: null,
      weightUnit: "lb",
      repsCompleted: null,
      effort: null,
      notes: "",
      lastLoggedAt: lastLog?.completedAt ?? null,
      lastSummary: lastLog ? formatLoadReps(lastLog) : "",
      recommendation: "Log numbers to unlock progression guidance.",
    };
  });
}

async function completeWorkout() {
  validateIntervalInputs();
  if (!state.startedAt || state.isCompleting || !isTimerConfigValid()) return;

  clearInterval(state.intervalId);
  state.isCompleting = true;
  const { name, rounds, tags, workSeconds, restSeconds } = getFormValues();
  const equipment = getSelectedEquipment().map(({ id, name: equipmentName, category, detail }) => ({
    id,
    name: equipmentName,
    category,
    detail,
  }));
  const plannedDurationSeconds = getPlannedDurationSeconds(rounds, restSeconds);
  const durationSeconds = Math.max(1, Math.min(plannedDurationSeconds, Math.round(getElapsedMs() / 1000)));
  const completedAt = new Date().toISOString();
  const previousWorkouts = await getWorkouts();

  const completedWorkout = {
    name,
    rounds,
    tags,
    completedAt,
    durationSeconds,
    plannedDurationSeconds,
    workSecondsPerRound: workSeconds,
    restSecondsPerRound: restSeconds,
    equipment,
    templateId: state.selectedTemplate?.id ?? null,
    templateApiId: state.selectedTemplate?.apiId ?? null,
    templateName: state.selectedTemplate?.name ?? null,
    plannedSessionId: state.activePlanSessionId,
    plannedMovements: state.activePlan,
    movementLogs: buildDefaultMovementLogs(previousWorkouts),
    type: "EMOM",
  };
  const completedWorkoutId = await addWorkout(completedWorkout);
  let loggedWorkout = { ...completedWorkout, id: completedWorkoutId };
  loggedWorkout = await syncCompletedWorkoutToApi(loggedWorkout);

  if (loggedWorkout.apiId) {
    await putWorkout(loggedWorkout);
  }

  if (state.activePlanSessionId) {
    const sessions = await getPlanSessions();
    const session = sessions.find((candidate) => candidate.id === state.activePlanSessionId);

    if (session) {
      const updatedSession = {
        ...session,
        status: "completed",
        completedWorkoutId,
        completedWorkoutApiId: loggedWorkout.apiId ?? null,
        updatedAt: new Date().toISOString(),
      };

      await putPlanSession(await syncPlanSessionToApi(updatedSession));
    }

    state.activePlanSessionId = null;
  }

  setStatus("complete");
  showCelebration();
  showCompletionLog(loggedWorkout);
  state.isCompleting = false;
  updateDisplay();
  await renderHistory();
  await renderPlanner();
  await renderProgress();
}

function getActiveMovement(snapshot) {
  if (!state.activePlan.length) return null;
  return state.activePlan[snapshot.currentRound - 1] ?? null;
}

function getMovementKicker(snapshot, movement) {
  if (snapshot.phaseName === "Complete") return "Workout complete";
  if (!movement) return "Current movement";
  if (snapshot.isRest) return "Rest, then next round";
  return `Cycle ${movement.cycle} · Move ${movement.movementIndex}`;
}

function getMovementLabel(snapshot, movement) {
  if (snapshot.phaseName === "Complete") return "Workout complete.";
  if (!movement) return "Choose a workout or build one.";

  const label = movement.target ? `${movement.move} · ${movement.target}` : movement.move;

  if (!snapshot.isRest) return label;

  const nextMovement = state.activePlan[snapshot.currentRound] ?? null;
  if (!nextMovement) return "Final rest minute";

  return nextMovement.target ? `${nextMovement.move} · ${nextMovement.target}` : nextMovement.move;
}

function showCelebration() {
  if (!elements.celebration) return;

  clearTimeout(state.celebrationTimeoutId);
  elements.celebration.classList.add("is-active");
  elements.celebration.setAttribute("aria-hidden", "false");

  state.celebrationTimeoutId = window.setTimeout(() => {
    elements.celebration.classList.remove("is-active");
    elements.celebration.setAttribute("aria-hidden", "true");
  }, 2200);
}

function updateMovementArt(movement) {
  const artClass = getMoveArtClass(movement);

  elements.movementArt.className = artClass ? `move-art ${artClass}` : "move-art move-art-placeholder";

  if (artClass && movement?.move) {
    elements.movementArt.setAttribute("role", "img");
    elements.movementArt.setAttribute("aria-label", `${movement.move} illustration`);
    elements.movementArt.removeAttribute("aria-hidden");
    return;
  }

  elements.movementArt.removeAttribute("role");
  elements.movementArt.removeAttribute("aria-label");
  elements.movementArt.setAttribute("aria-hidden", "true");
}

function renderMoveArt(movement, className = "") {
  const artClass = getMoveArtClass(movement);

  if (!artClass) {
    return `<span class="move-art move-art-placeholder${className ? ` ${className}` : ""}" aria-hidden="true"></span>`;
  }

  const label = escapeHtml(movement?.move ? `${movement.move} illustration` : "Movement illustration");

  return `<span class="move-art ${artClass}${className ? ` ${className}` : ""}" role="img" aria-label="${label}"></span>`;
}

function getMoveArtClass(movement) {
  return MOVE_ART.get(normalizeMoveName(movement?.move)) ?? null;
}

function normalizeMoveName(move) {
  return String(move ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function renderTemplates() {
  elements.templateList.innerHTML = getSortedTemplates()
    .map((template) => {
      const rounds = expandTemplate(template).length;
      const duration = formatClock(getPlannedDurationSeconds(rounds, DEFAULT_REST_SECONDS));
      const activeClass = state.selectedTemplate?.id === template.id ? " is-active" : "";
      const isFavorite = state.favoriteTemplateIds.has(template.id);
      const favoriteClass = isFavorite ? " is-favorite" : "";
      const isSelected = state.selectedTemplate?.id === template.id;
      const isExpanded = state.expandedTemplateId === template.id;
      const previewLabel = isExpanded ? "Hide moves" : isSelected ? "Show moves" : "View moves";
      const editAction = template.isCustom
        ? `<button type="button" data-edit-template-id="${template.id}" aria-label="Edit ${escapeHtml(template.name)}" title="Edit">Edit</button>`
        : "";
      const actions = `
        <div class="template-actions">
          <button
            class="favorite-button${favoriteClass}"
            type="button"
            data-favorite-template-id="${template.id}"
            aria-label="${isFavorite ? "Unfavorite" : "Favorite"} ${escapeHtml(template.name)}"
            aria-pressed="${String(isFavorite)}"
            title="${isFavorite ? "Unfavorite" : "Favorite"}"
          >${isFavorite ? "★" : "☆"}</button>
          ${editAction}
          <button
            class="delete-icon-button"
            type="button"
            data-delete-template-id="${template.id}"
            aria-label="Delete ${escapeHtml(template.name)}"
            title="Delete"
          >×</button>
        </div>
      `;

      return `
        <article class="template-row${activeClass}${favoriteClass}">
          <button class="template-button" type="button" data-template-id="${template.id}">
            <div class="template-art-strip">
              ${template.movements.slice(0, 4).map((movement) => renderMoveArt(movement, "move-art-small")).join("")}
            </div>
            <span class="template-copy">
              <strong>${escapeHtml(template.name)}</strong>
              ${template.description ? `<span>${escapeHtml(template.description)}</span>` : ""}
              <small>${template.movements.length} moves · ${template.cycles} cycles · ${duration}</small>
            </span>
            <span class="template-preview-label">${previewLabel}</span>
          </button>
          ${actions}
          ${isExpanded ? renderTemplatePreview() : ""}
        </article>
      `;
    })
    .join("");

  refreshScheduleElements();
  if (state.selectedTemplate) {
    renderSchedule();
  } else {
    updateScheduleHighlight(getTimerSnapshot());
  }
}

function renderTemplatePreview() {
  return `
    <div class="template-preview">
      <div class="schedule-header selected-workout-header">
        <div>
          <p class="eyebrow">Selected workout</p>
          <strong id="schedule-title">No workout selected</strong>
        </div>
        <span id="schedule-summary">Manual EMOM</span>
      </div>
      <ol class="schedule-list" id="schedule-list"></ol>
    </div>
  `;
}

function getSortedTemplates() {
  return state.templates
    .map((template, index) => ({ template, index }))
    .sort((a, b) => {
      const aFavorite = state.favoriteTemplateIds.has(a.template.id);
      const bFavorite = state.favoriteTemplateIds.has(b.template.id);

      if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;

      return a.index - b.index;
    })
    .map(({ template }) => template);
}

function toggleTemplateFavorite(templateId) {
  if (state.favoriteTemplateIds.has(templateId)) {
    state.favoriteTemplateIds.delete(templateId);
  } else {
    state.favoriteTemplateIds.add(templateId);
  }

  saveFavoriteTemplateIds();
  renderTemplates();
}

function selectTemplate(templateId) {
  const template = state.templates.find((candidate) => candidate.id === templateId);
  if (!template) return;
  const isSelectedTemplate = state.selectedTemplate?.id === templateId;

  if (isSelectedTemplate && state.expandedTemplateId === templateId) {
    state.expandedTemplateId = null;
    renderTemplates();
    renderSchedule();
    updateDisplay();
    return;
  }

  const plan = expandTemplate(template);
  state.selectedTemplate = template;
  state.expandedTemplateId = template.id;
  state.activePlanSessionId = null;
  state.activePlan = plan;
  elements.workoutName.value = template.name;
  elements.rounds.value = plan.length;
  elements.workSeconds.value = DEFAULT_WORK_SECONDS;
  elements.restSeconds.value = DEFAULT_REST_SECONDS;
  elements.tags.value = template.tags.join(", ");

  renderTemplates();
  renderSchedule();
  scrollSelectedTemplateIntoView();
  updateDisplay();
}

function scrollSelectedTemplateIntoView() {
  const activeRow = elements.templateList.querySelector(".template-row.is-active");
  activeRow?.scrollIntoView({ block: "nearest" });
}

function selectPlannedSession(session) {
  selectTemplate(session.templateId);
  state.activePlanSessionId = session.id;
  switchTab("templates");
}

function startNewTemplate() {
  state.builderEditingId = null;
  state.builderEditingMoveIndex = null;
  state.builderMoves = [];
  elements.builderTitle.textContent = "Workout Builder";
  elements.builderName.value = "";
  elements.builderCycles.value = "3";
  elements.builderTags.value = "";
  elements.builderMoveName.value = "";
  elements.builderMoveTarget.value = "";
  elements.builderMovePattern.value = "Hinge";
  elements.addMoveButton.textContent = "Add Move";
  renderBuilder();
  switchTab("builder");
}

function editTemplate(templateId) {
  const template = state.templates.find((candidate) => candidate.id === templateId);
  if (!template || !template.isCustom) return;

  state.builderEditingId = template.id;
  state.builderMoves = template.movements.map((movement) => ({ ...movement }));
  elements.builderTitle.textContent = "Edit Workout";
  elements.builderName.value = template.name;
  elements.builderCycles.value = template.cycles;
  elements.builderTags.value = template.tags.join(", ");
  elements.builderMoveName.value = "";
  elements.builderMoveTarget.value = "";
  elements.builderMovePattern.value = "Hinge";
  state.builderEditingMoveIndex = null;
  elements.addMoveButton.textContent = "Add Move";
  renderBuilder();
  switchTab("builder");
}

async function deleteTemplate(templateId) {
  const template = state.templates.find((candidate) => candidate.id === templateId);
  const customTemplates = loadCustomTemplates().filter((candidate) => candidate.id !== templateId);
  const deletedTemplateIds = loadDeletedTemplateIds();

  if (template && !template.isCustom) {
    deletedTemplateIds.add(templateId);
  }

  saveCustomTemplates(customTemplates);
  saveDeletedTemplateIds(deletedTemplateIds);
  await deleteApiResource("/v1/workout-templates", template?.apiId);

  if (state.favoriteTemplateIds.delete(templateId)) {
    saveFavoriteTemplateIds();
  }

  if (state.selectedTemplate?.id === templateId) {
    state.selectedTemplate = null;
    state.expandedTemplateId = null;
    state.activePlan = [];
    elements.workoutName.value = "Manual EMOM";
    elements.rounds.value = "10";
    elements.workSeconds.value = DEFAULT_WORK_SECONDS;
    elements.restSeconds.value = DEFAULT_REST_SECONDS;
    elements.tags.value = "";
  }

  const sessions = await getPlanSessions();
  await Promise.all(
    sessions
      .filter((session) => session.templateId === templateId)
      .map((session) => deletePlanSession(session.id)),
  );

  loadTemplates();
  renderTemplates();
  renderExerciseLibrary({ refreshFilters: true });
  renderBuilderLibrary({ refreshFilters: true });
  renderSchedule();
  await renderPlanner();
  updateDisplay();
}

function addBuilderMove() {
  const move = elements.builderMoveName.value.trim();
  const target = elements.builderMoveTarget.value.trim() || `${DEFAULT_WORK_SECONDS} sec`;
  const pattern = elements.builderMovePattern.value;

  if (!move) {
    elements.builderMoveName.focus();
    return;
  }

  const nextMove = { move, target, pattern, cue: "" };

  if (state.builderEditingMoveIndex !== null) {
    state.builderMoves[state.builderEditingMoveIndex] = {
      ...state.builderMoves[state.builderEditingMoveIndex],
      ...nextMove,
    };
    state.builderEditingMoveIndex = null;
    elements.addMoveButton.textContent = "Add Move";
  } else {
    state.builderMoves.push(nextMove);
  }

  elements.builderMoveName.value = "";
  elements.builderMoveTarget.value = "";
  elements.builderMoveName.focus();
  renderBuilder();
}

function addLibraryMoveToBuilder(exerciseId) {
  const exercise = getExerciseLibrary().find((candidate) => candidate.id === exerciseId);
  if (!exercise) return;

  state.builderMoves.push({
    move: exercise.move,
    target: exercise.target || `${DEFAULT_WORK_SECONDS} sec`,
    pattern: exercise.pattern || "Move",
    cue: exercise.cue ?? "",
    primaryMuscles: [...(exercise.primaryMuscles ?? [])],
    secondaryMuscles: [...(exercise.secondaryMuscles ?? [])],
  });

  state.builderEditingMoveIndex = null;
  elements.addMoveButton.textContent = "Add Move";
  renderBuilder();
}

function editBuilderMove(index) {
  const movement = state.builderMoves[index];
  if (!movement) return;

  state.builderEditingMoveIndex = index;
  elements.builderMoveName.value = movement.move;
  elements.builderMoveTarget.value = movement.target;
  elements.builderMovePattern.value = movement.pattern ?? "Hinge";
  elements.addMoveButton.textContent = "Update Move";
  elements.builderMoveName.focus();
  renderBuilder();
}

function removeBuilderMove(index) {
  state.builderMoves.splice(index, 1);
  if (state.builderEditingMoveIndex === index) {
    state.builderEditingMoveIndex = null;
    elements.builderMoveName.value = "";
    elements.builderMoveTarget.value = "";
    elements.builderMovePattern.value = "Hinge";
    elements.addMoveButton.textContent = "Add Move";
  } else if (state.builderEditingMoveIndex !== null && state.builderEditingMoveIndex > index) {
    state.builderEditingMoveIndex -= 1;
  }
  renderBuilder();
}

async function saveBuilderTemplate() {
  const name = elements.builderName.value.trim();
  const cycles = normalizeRounds(elements.builderCycles.value);
  const tags = elements.builderTags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!name) {
    elements.builderName.focus();
    return;
  }

  if (!state.builderMoves.length) {
    elements.builderMoveName.focus();
    return;
  }

  const customTemplates = loadCustomTemplates();
  const existingTemplate = state.builderEditingId
    ? customTemplates.find((candidate) => candidate.id === state.builderEditingId)
    : null;
  const template = {
    id: state.builderEditingId ?? `custom-${Date.now()}`,
    apiId: existingTemplate?.apiId ?? null,
    name,
    source: "Custom",
    tags,
    cycles,
    movements: state.builderMoves.map((movement) => ({ ...movement })),
    isCustom: true,
  };
  const syncedTemplate = await syncTemplateToApi(template);
  const nextTemplates = state.builderEditingId
    ? customTemplates.map((candidate) => (candidate.id === state.builderEditingId ? template : candidate))
    : [...customTemplates, syncedTemplate];

  saveCustomTemplates(
    state.builderEditingId
      ? customTemplates.map((candidate) => (candidate.id === state.builderEditingId ? syncedTemplate : candidate))
      : nextTemplates,
  );
  loadTemplates();
  selectTemplate(syncedTemplate.id);
  state.builderEditingId = syncedTemplate.id;
  state.builderEditingMoveIndex = null;
  elements.addMoveButton.textContent = "Add Move";
  renderExerciseLibrary({ refreshFilters: true });
  renderBuilderLibrary({ refreshFilters: true });
  renderPlanner();
}

function renderBuilder() {
  const cycles = normalizeRounds(elements.builderCycles.value);
  const rounds = state.builderMoves.length * cycles;
  const duration = rounds ? formatClock(getPlannedDurationSeconds(rounds, DEFAULT_REST_SECONDS)) : "00:00";

  elements.builderMoveList.innerHTML = state.builderMoves.length
    ? state.builderMoves
        .map(
          (movement, index) => `
            <li class="${state.builderEditingMoveIndex === index ? "is-editing" : ""}">
              ${renderMoveArt(movement, "move-art-thumb")}
              <span>${index + 1}</span>
              <strong>${escapeHtml(movement.move)}</strong>
              <small><b>${escapeHtml(movement.pattern ?? "Move")}</b> ${escapeHtml(movement.target)}</small>
              <span class="builder-move-actions">
                <button type="button" data-edit-builder-move="${index}">Edit</button>
                <button type="button" data-remove-builder-move="${index}">Remove</button>
              </span>
            </li>
          `,
        )
        .join("")
    : '<li class="builder-empty">No moves added yet.</li>';
  elements.builderSummary.textContent = `${state.builderMoves.length} moves · ${cycles} cycles · ${duration}`;
  renderBuilderLibrary();
}

function renderEquipment() {
  const selectedEquipment = getSelectedEquipment();

  elements.equipmentCount.textContent = `${selectedEquipment.length} selected`;
  elements.equipmentList.innerHTML = state.equipment
    .map((equipment) => {
      const selectedClass = equipment.selected ? " is-selected" : "";
      const detail = [equipment.category, equipment.detail].filter(Boolean).join(" · ");
      const deleteButton = equipment.isPreset
        ? ""
        : `<button type="button" data-delete-equipment-id="${equipment.id}">Delete</button>`;

      return `
        <article class="equipment-item${selectedClass}">
          <button
            class="equipment-toggle${selectedClass}"
            type="button"
            data-equipment-id="${equipment.id}"
            aria-pressed="${String(equipment.selected)}"
            aria-label="${equipment.selected ? "Deselect" : "Select"} ${escapeHtml(equipment.name)}"
          >${equipment.selected ? "✓" : "○"}</button>
          ${renderEquipmentIcon(equipment)}
          <span class="equipment-copy">
            <strong>${escapeHtml(equipment.name)}</strong>
            <small>${escapeHtml(detail || "Equipment")}</small>
          </span>
          <span class="equipment-actions">${deleteButton}</span>
        </article>
      `;
    })
    .join("");
}

function renderEquipmentIcon(equipment) {
  const normalizedName = normalizeMoveName(equipment.name);
  const icon = normalizedName.includes("kettlebell")
    ? "kettlebell"
    : normalizedName.includes("dumbbell")
      ? "dumbbell"
      : normalizedName.includes("barbell")
        ? "barbell"
        : normalizedName.includes("bodyweight")
          ? "bodyweight"
          : normalizedName.includes("band")
            ? "band"
            : "mixed";

  return `<span class="equipment-icon equipment-icon-${icon}" aria-hidden="true"></span>`;
}

async function renderPlanner() {
  const weekDays = getWeekDays();
  const sessions = await getPlanSessions();
  const workouts = await getWorkouts();
  const sessionsByDate = new Map(sessions.map((session) => [session.date, session]));
  const weekEnd = addDays(state.currentWeekStart, 6);

  elements.planTitle.textContent = `${state.currentWeekStart.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} - ${weekEnd.toLocaleDateString([], { month: "short", day: "numeric" })}`;

  renderPlannerOptions(weekDays);
  elements.plannerGrid.innerHTML = weekDays
    .map((date) => renderPlanDay(date, sessionsByDate.get(getDateKey(date))))
    .join("");
  renderProgressHeatmap(sessions, workouts);
}

function renderPlannerOptions(weekDays) {
  const selectedDate = elements.plannerDate.value;

  elements.plannerDate.innerHTML = weekDays
    .map((date) => {
      const dateKey = getDateKey(date);
      const label = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

      return `<option value="${dateKey}">${escapeHtml(label)}</option>`;
    })
    .join("");

  if (selectedDate && weekDays.some((date) => getDateKey(date) === selectedDate)) {
    elements.plannerDate.value = selectedDate;
  }

  const sortedTemplates = getSortedTemplates();

  elements.plannerTemplate.innerHTML = sortedTemplates.length
    ? sortedTemplates.map((template) => `<option value="${template.id}">${escapeHtml(template.name)}</option>`).join("")
    : '<option value="">No workouts available</option>';
}

function renderPlanDay(date, session) {
  const dateKey = getDateKey(date);
  const status = getEffectivePlanStatus(session);
  const statusLabel = status === "empty" ? "Open" : status;
  const isToday = dateKey === getDateKey(new Date());
  const content = session
    ? `
        <strong>${escapeHtml(session.workoutName)}</strong>
        <small>${escapeHtml(session.focus)} · ${formatClock(session.plannedDurationSeconds)}</small>
        <div class="plan-actions">
          <button type="button" data-start-plan-id="${session.id}" ${status === "completed" || state.status === "running" || state.status === "paused" ? "disabled" : ""}>Start</button>
          <button type="button" data-edit-plan-id="${session.id}">Edit</button>
          <button type="button" data-skip-plan-id="${session.id}" ${status !== "planned" ? "disabled" : ""}>Skip</button>
          <button type="button" data-clear-plan-id="${session.id}">Clear</button>
        </div>
      `
    : `
        <strong>No workout planned</strong>
        <small>Assign one below.</small>
        <div class="plan-actions">
          <button type="button" data-plan-date="${dateKey}">Add</button>
        </div>
      `;

  return `
    <article class="plan-day is-${status}${isToday ? " is-today" : ""}">
      <div class="plan-day-header">
        <span>${escapeHtml(date.toLocaleDateString([], { weekday: "short" }))}</span>
        <time datetime="${dateKey}">${escapeHtml(date.toLocaleDateString([], { month: "short", day: "numeric" }))}</time>
      </div>
      <span class="plan-status">${escapeHtml(statusLabel)}</span>
      <div class="plan-day-body">${content}</div>
    </article>
  `;
}

async function savePlanFromForm() {
  const template = state.templates.find((candidate) => candidate.id === elements.plannerTemplate.value);
  if (!template) return;

  const sessions = await getPlanSessions();
  const existingSession = sessions.find((session) => session.date === elements.plannerDate.value);
  const plan = expandTemplate(template);
  const now = new Date().toISOString();

  const session = {
    id: existingSession?.id ?? `plan-${elements.plannerDate.value}-${Date.now()}`,
    apiId: existingSession?.apiId ?? null,
    date: elements.plannerDate.value,
    templateId: template.id,
    templateApiId: template.apiId ?? null,
    workoutName: template.name,
    focus: elements.plannerFocus.value,
    equipment: getSelectedEquipment().map(({ id, name, category }) => ({ id, name, category })),
    plannedRounds: plan.length,
    plannedDurationSeconds: getPlannedDurationSeconds(plan.length, DEFAULT_REST_SECONDS),
    status: "planned",
    completedWorkoutId: existingSession?.completedWorkoutId ?? null,
    completedWorkoutApiId: existingSession?.completedWorkoutApiId ?? null,
    createdAt: existingSession?.createdAt ?? now,
    updatedAt: now,
  };
  const syncedSession = await syncPlanSessionToApi(session);

  await putPlanSession(syncedSession);

  await renderPlanner();
}

async function startPlanSession(sessionId) {
  if (state.status === "running" || state.status === "paused") return;

  const sessions = await getPlanSessions();
  const session = sessions.find((candidate) => candidate.id === sessionId);
  if (!session) return;

  selectPlannedSession(session);
  await startTimer();
}

async function skipPlanSession(sessionId) {
  const sessions = await getPlanSessions();
  const session = sessions.find((candidate) => candidate.id === sessionId);
  if (!session) return;

  const updatedSession = {
    ...session,
    status: "skipped",
    updatedAt: new Date().toISOString(),
  };

  await putPlanSession(await syncPlanSessionToApi(updatedSession));
  await renderPlanner();
}

async function clearPlanSession(sessionId) {
  const sessions = await getPlanSessions();
  const session = sessions.find((candidate) => candidate.id === sessionId);

  await deletePlanSession(sessionId);
  await deleteApiResource("/v1/planned-workouts", session?.apiId);
  await renderPlanner();
}

async function editPlanSession(sessionId) {
  const sessions = await getPlanSessions();
  const session = sessions.find((candidate) => candidate.id === sessionId);

  if (!session) return;

  elements.plannerDate.value = session.date;
  elements.plannerTemplate.value = session.templateId;
  elements.plannerFocus.value = session.focus;
  elements.plannerTemplate.focus();
}

function renderProgressHeatmap(sessions, workouts) {
  const endWeekStart = getStartOfWeek(new Date());
  const firstWeekStart = addDays(endWeekStart, -77);
  const todayKey = getDateKey(new Date());
  const sessionsByDate = new Map(sessions.map((session) => [session.date, session]));
  const completedByDate = new Map();

  workouts.forEach((workout) => {
    const dateKey = getDateKey(new Date(workout.completedAt));
    completedByDate.set(dateKey, (completedByDate.get(dateKey) ?? 0) + 1);
  });

  const cells = [];
  let completedCount = 0;

  for (let week = 0; week < 12; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(firstWeekStart, week * 7 + day);
      const dateKey = getDateKey(date);
      const session = sessionsByDate.get(dateKey);
      const effectiveStatus = getEffectivePlanStatus(session, todayKey);
      const completedWorkouts = completedByDate.get(dateKey) ?? 0;
      const heatClass = getHeatClass({ effectiveStatus, completedWorkouts });

      if (completedWorkouts) completedCount += completedWorkouts;

      cells.push(`
        <button
          class="heat-cell ${heatClass}"
          type="button"
          title="${escapeHtml(`${date.toLocaleDateString([], { month: "short", day: "numeric" })}: ${getHeatLabel({ effectiveStatus, completedWorkouts })}`)}"
          aria-label="${escapeHtml(`${date.toLocaleDateString()}: ${getHeatLabel({ effectiveStatus, completedWorkouts })}`)}"
        ></button>
      `);
    }
  }

  elements.progressSummary.textContent = `${completedCount} completed`;
  elements.progressHeatmap.innerHTML = cells.join("");
}

function getHeatClass({ effectiveStatus, completedWorkouts }) {
  if (effectiveStatus === "completed") return "heat-planned-completed";
  if (completedWorkouts > 0) return "heat-completed";
  if (effectiveStatus === "planned") return "heat-planned";
  if (effectiveStatus === "skipped" || effectiveStatus === "missed") return "heat-missed";
  return "heat-empty";
}

function getHeatLabel({ effectiveStatus, completedWorkouts }) {
  if (effectiveStatus === "completed") return "planned workout completed";
  if (completedWorkouts > 0) return `${completedWorkouts} workout${completedWorkouts === 1 ? "" : "s"} completed`;
  if (effectiveStatus === "planned") return "workout planned";
  if (effectiveStatus === "skipped") return "skipped";
  if (effectiveStatus === "missed") return "missed";
  return "no workout";
}

async function addEquipment() {
  const name = elements.equipmentName.value.trim();

  if (!name) {
    elements.equipmentName.focus();
    return;
  }

  const equipment = sanitizeEquipment({
    id: `custom-gear-${Date.now()}`,
    name,
    category: elements.equipmentCategory.value,
    detail: elements.equipmentDetail.value,
    selected: true,
    isPreset: false,
  });

  state.equipment.push(equipment);
  elements.equipmentName.value = "";
  elements.equipmentDetail.value = "";
  elements.equipmentName.focus();
  saveEquipment();
  renderEquipment();
  await persistEquipmentSync(equipment.id);
}

async function toggleEquipment(equipmentId) {
  state.equipment = state.equipment.map((equipment) =>
    equipment.id === equipmentId ? { ...equipment, selected: !equipment.selected } : equipment,
  );
  saveEquipment();
  renderEquipment();
  await persistEquipmentSync(equipmentId);
}

async function deleteEquipment(equipmentId) {
  const equipment = state.equipment.find((candidate) => candidate.id === equipmentId);
  state.equipment = state.equipment.filter((equipment) => equipment.id !== equipmentId || equipment.isPreset);
  saveEquipment();
  renderEquipment();
  await deleteApiResource("/v1/equipment", equipment?.apiId);
}

function refreshScheduleElements() {
  elements.scheduleTitle = document.querySelector("#schedule-title");
  elements.scheduleSummary = document.querySelector("#schedule-summary");
  elements.scheduleList = document.querySelector("#schedule-list");
}

function renderSchedule() {
  refreshScheduleElements();

  if (!elements.scheduleTitle || !elements.scheduleSummary || !elements.scheduleList) {
    state.scheduleFocusKey = null;
    return;
  }

  if (!state.selectedTemplate) {
    elements.scheduleTitle.textContent = "No workout selected";
    elements.scheduleSummary.textContent = "Manual EMOM";
    elements.scheduleList.innerHTML = "";
    state.scheduleFocusKey = null;
    return;
  }

  const { workSeconds, restSeconds } = getFormValues();
  const duration = formatClock(getPlannedDurationSeconds(state.activePlan.length, restSeconds));

  elements.scheduleTitle.textContent = state.selectedTemplate.name;
  elements.scheduleSummary.textContent = `${state.selectedTemplate.movements.length} distinct moves · ${state.selectedTemplate.cycles} cycles · ${duration} · ${workSeconds}s/${restSeconds}s`;
  elements.scheduleList.innerHTML = state.selectedTemplate.movements
    .map(
      (movement, index) => `
        <li data-movement-index="${index + 1}">
          ${renderMoveArt(movement, "move-art-thumb")}
          <span>${index + 1}</span>
          <div class="schedule-content">
            <strong>${escapeHtml(movement.move)}</strong>
            <small>
              <b>${escapeHtml(movement.pattern ?? "Move")}</b>
              ${escapeHtml(movement.target)}
              ${movement.cue ? ` · ${escapeHtml(movement.cue)}` : ""}
            </small>
            ${renderMuscleTags(movement)}
          </div>
        </li>
      `,
    )
    .join("");
  state.scheduleFocusKey = null;
  updateScheduleHighlight(getTimerSnapshot());
}

function updateScheduleHighlight(snapshot) {
  refreshScheduleElements();

  if (!elements.scheduleList || !elements.scheduleSummary) return;

  const activeMovement = getActiveMovement(snapshot);
  const upcomingMovement = snapshot.isRest ? state.activePlan[snapshot.currentRound] ?? null : null;
  let focusedItem = null;

  elements.scheduleList.querySelectorAll("[data-movement-index]").forEach((item) => {
    const isActive = Boolean(activeMovement && !snapshot.isRest && item.dataset.movementIndex === String(activeMovement.movementIndex));
    const isUpcoming = Boolean(upcomingMovement && item.dataset.movementIndex === String(upcomingMovement.movementIndex));

    item.classList.toggle("is-active", isActive);
    item.classList.toggle("is-upcoming", isUpcoming);

    if (isActive || isUpcoming) focusedItem = item;
  });

  if (!state.selectedTemplate || !activeMovement) return;

  const phaseText = snapshot.isRest ? `next: move ${upcomingMovement?.movementIndex ?? activeMovement.movementIndex}` : `active: move ${activeMovement.movementIndex}`;
  elements.scheduleSummary.textContent = `${state.selectedTemplate.movements.length} distinct moves · cycle ${activeMovement.cycle} of ${state.selectedTemplate.cycles} · ${phaseText}`;

  const focusMovement = snapshot.isRest ? upcomingMovement ?? activeMovement : activeMovement;
  const nextFocusKey = focusMovement
    ? `${snapshot.phaseName}-${focusMovement.cycle}-${focusMovement.movementIndex}`
    : null;

  if (focusedItem && nextFocusKey && state.scheduleFocusKey !== nextFocusKey) {
    state.scheduleFocusKey = nextFocusKey;
    focusedItem.scrollIntoView({ block: "nearest" });
  }
}

function renderMuscleTags(movement) {
  const primaryMuscles = movement.primaryMuscles ?? [];
  const secondaryMuscles = movement.secondaryMuscles ?? [];

  if (!primaryMuscles.length && !secondaryMuscles.length) return "";

  return `
    <div class="muscle-tags" aria-label="Target muscles">
      ${primaryMuscles.map((muscle) => `<span class="muscle-tag is-primary">${escapeHtml(muscle)}</span>`).join("")}
      ${secondaryMuscles.map((muscle) => `<span class="muscle-tag">${escapeHtml(muscle)}</span>`).join("")}
    </div>
  `;
}

function getExerciseLibrary() {
  const exercisesByName = new Map();

  state.templates.forEach((template) => {
    template.movements.forEach((movement) => {
      const key = normalizeMoveName(movement.move ?? movement.moveName);
      if (!key) return;

      const existingExercise = exercisesByName.get(key);
      const sourceWorkout = template.name;
      const equipment = inferExerciseEquipment(movement, template);
      const nextExercise = existingExercise ?? {
        id: key,
        move: movement.move ?? movement.moveName,
        target: movement.target ?? "",
        pattern: movement.pattern ?? "Move",
        cue: movement.cue ?? "",
        equipment,
        difficulty: inferExerciseDifficulty(template),
        primaryMuscles: movement.primaryMuscles ?? [],
        secondaryMuscles: movement.secondaryMuscles ?? [],
        sourceWorkouts: [],
      };

      if (!nextExercise.sourceWorkouts.includes(sourceWorkout)) {
        nextExercise.sourceWorkouts.push(sourceWorkout);
      }

      if (!nextExercise.primaryMuscles.length && movement.primaryMuscles?.length) {
        nextExercise.primaryMuscles = movement.primaryMuscles;
      }

      if (!nextExercise.secondaryMuscles.length && movement.secondaryMuscles?.length) {
        nextExercise.secondaryMuscles = movement.secondaryMuscles;
      }

      exercisesByName.set(key, nextExercise);
    });
  });

  return [...exercisesByName.values()].sort((a, b) => a.move.localeCompare(b.move));
}

function inferExerciseEquipment(movement, template) {
  const combinedText = `${movement.move ?? ""} ${template.tags?.join(" ") ?? ""}`.toLowerCase();

  if (combinedText.includes("dumbbell")) return "Dumbbells";
  if (combinedText.includes("barbell")) return "Barbell";
  if (combinedText.includes("bodyweight") || combinedText.includes("pushup") || combinedText.includes("burpee")) return "Bodyweight";
  if (combinedText.includes("band")) return "Bands";
  if (combinedText.includes("kettlebell") || combinedText.includes("kb") || combinedText.includes("bell")) return "Kettlebell";
  return "Mixed";
}

function inferExerciseDifficulty(template) {
  const tags = template.tags ?? [];

  if (tags.includes("beginner")) return "Beginner";
  if (tags.includes("hypertrophy") || tags.includes("strength")) return "Intermediate";
  return "All levels";
}

function renderExerciseFilterOptions(exercises) {
  const selectedPattern = elements.exercisePatternFilter.value;
  const selectedEquipment = elements.exerciseEquipmentFilter.value;
  const patterns = [...new Set(exercises.map((exercise) => exercise.pattern).filter(Boolean))].sort();
  const equipment = [...new Set(exercises.map((exercise) => exercise.equipment).filter(Boolean))].sort();

  elements.exercisePatternFilter.innerHTML = [
    '<option value="">All patterns</option>',
    ...patterns.map((pattern) => `<option value="${escapeHtml(pattern)}">${escapeHtml(pattern)}</option>`),
  ].join("");
  elements.exerciseEquipmentFilter.innerHTML = [
    '<option value="">All equipment</option>',
    ...equipment.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`),
  ].join("");

  elements.exercisePatternFilter.value = patterns.includes(selectedPattern) ? selectedPattern : "";
  elements.exerciseEquipmentFilter.value = equipment.includes(selectedEquipment) ? selectedEquipment : "";
}

function renderBuilderLibraryFilterOptions(exercises) {
  const selectedPattern = elements.builderLibraryPatternFilter.value;
  const selectedEquipment = elements.builderLibraryEquipmentFilter.value;
  const patterns = [...new Set(exercises.map((exercise) => exercise.pattern).filter(Boolean))].sort();
  const equipment = [...new Set(exercises.map((exercise) => exercise.equipment).filter(Boolean))].sort();

  elements.builderLibraryPatternFilter.innerHTML = [
    '<option value="">All patterns</option>',
    ...patterns.map((pattern) => `<option value="${escapeHtml(pattern)}">${escapeHtml(pattern)}</option>`),
  ].join("");
  elements.builderLibraryEquipmentFilter.innerHTML = [
    '<option value="">All equipment</option>',
    ...equipment.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`),
  ].join("");

  elements.builderLibraryPatternFilter.value = patterns.includes(selectedPattern) ? selectedPattern : "";
  elements.builderLibraryEquipmentFilter.value = equipment.includes(selectedEquipment) ? selectedEquipment : "";
}

function filterExercises(exercises, { searchText = "", pattern = "", equipment = "" } = {}) {
  const normalizedSearch = normalizeMoveName(searchText);

  return exercises.filter((exercise) => {
    const searchHaystack = normalizeMoveName(
      `${exercise.move} ${exercise.pattern} ${exercise.equipment} ${exercise.primaryMuscles.join(" ")} ${exercise.secondaryMuscles.join(" ")}`,
    );

    return (
      (!normalizedSearch || searchHaystack.includes(normalizedSearch)) &&
      (!pattern || exercise.pattern === pattern) &&
      (!equipment || exercise.equipment === equipment)
    );
  });
}

function renderExerciseLibrary({ refreshFilters = false, resetScroll = false } = {}) {
  const exercises = getExerciseLibrary();

  if (refreshFilters) renderExerciseFilterOptions(exercises);

  const filteredExercises = filterExercises(exercises, {
    searchText: elements.exerciseSearch.value,
    pattern: elements.exercisePatternFilter.value,
    equipment: elements.exerciseEquipmentFilter.value,
  });

  elements.exerciseCount.textContent = `${filteredExercises.length} result${filteredExercises.length === 1 ? "" : "s"}`;
  elements.exerciseList.innerHTML = filteredExercises.length
    ? filteredExercises.map(renderExerciseCard).join("")
    : '<p class="empty-state">No exercises match those filters.</p>';

  if (resetScroll) elements.exerciseList.scrollTop = 0;
}

function renderExerciseCard(exercise) {
  return `
    <article class="exercise-card">
      ${renderMoveArt(exercise, "exercise-card-art")}
      <div class="exercise-card-copy">
        <strong>${escapeHtml(exercise.move)}</strong>
        <span>${escapeHtml(exercise.equipment)} · ${escapeHtml(exercise.difficulty)}</span>
        <small><b>${escapeHtml(exercise.pattern)}</b>${exercise.target ? ` ${escapeHtml(exercise.target)}` : ""}</small>
        ${exercise.cue ? `<p>${escapeHtml(exercise.cue)}</p>` : ""}
        ${renderMuscleTags(exercise)}
        <em>${escapeHtml(exercise.sourceWorkouts.slice(0, 2).join(", "))}</em>
      </div>
    </article>
  `;
}

function renderBuilderLibrary({ refreshFilters = false, resetScroll = false } = {}) {
  const exercises = getExerciseLibrary();

  if (refreshFilters) renderBuilderLibraryFilterOptions(exercises);

  const filteredExercises = filterExercises(exercises, {
    searchText: elements.builderLibrarySearch.value,
    pattern: elements.builderLibraryPatternFilter.value,
    equipment: elements.builderLibraryEquipmentFilter.value,
  });

  elements.builderLibraryCount.textContent = `${filteredExercises.length} result${filteredExercises.length === 1 ? "" : "s"}`;
  elements.builderLibraryList.innerHTML = filteredExercises.length
    ? filteredExercises.slice(0, 24).map(renderBuilderExerciseCard).join("")
    : '<p class="empty-state">No exercises match those filters.</p>';

  if (resetScroll) elements.builderLibraryList.scrollTop = 0;
}

function renderBuilderExerciseCard(exercise) {
  return `
    <article class="builder-exercise-card">
      ${renderMoveArt(exercise, "builder-exercise-art")}
      <div class="builder-exercise-copy">
        <strong>${escapeHtml(exercise.move)}</strong>
        <small><b>${escapeHtml(exercise.pattern)}</b>${exercise.target ? ` ${escapeHtml(exercise.target)}` : ""}</small>
        <span>${escapeHtml(exercise.equipment)} · ${escapeHtml(exercise.difficulty)}</span>
      </div>
      <button type="button" data-add-library-move="${escapeHtml(exercise.id)}">Add</button>
    </article>
  `;
}

function populateBaselineForm() {
  const baseline = state.baseline;

  elements.baselineStartDate.value = baseline?.startedAt ?? getDateKey(new Date());
  elements.baselineWeight.value = baseline?.bodyWeight ?? "";
  elements.baselineWaist.value = baseline?.waist ?? "";
  elements.baselineChest.value = baseline?.chest ?? "";
  elements.baselineArm.value = baseline?.arm ?? "";
  elements.baselineGoal.value = baseline?.goal ?? "Build visible muscle and strength";
}

async function saveBaselineFromForm() {
  saveBaseline(getBaselineFormValues());
  await renderProgress();
}

async function renderProgress() {
  const workouts = await getWorkouts();
  const baseline = state.baseline;
  const completedWithLogs = workouts.filter((workout) => getWorkoutMovementLogs(workout).some((log) => log.weightValue || log.repsCompleted || log.effort));

  populateBaselineForm();
  elements.transformationSummary.textContent = baseline ? `${workouts.length} workouts logged` : "No baseline";
  elements.transformationGrid.innerHTML = renderTransformationCards(workouts, completedWithLogs);
  elements.muscleBalanceList.innerHTML = renderMuscleBalance(workouts);
  elements.strengthSignalList.innerHTML = renderStrengthSignals(workouts);
}

function renderTransformationCards(workouts, completedWithLogs) {
  const baseline = state.baseline;
  const startDate = baseline?.startedAt ? parseDateKey(baseline.startedAt) : null;
  const daysTraining = startDate ? Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / 86400000)) : 0;
  const recentWorkouts = workouts.filter((workout) => Date.now() - new Date(workout.completedAt).getTime() <= 7 * 86400000);
  const metrics = [
    ["Starting weight", baseline?.bodyWeight ? `${baseline.bodyWeight} lb` : "Set baseline"],
    ["Waist", baseline?.waist ? `${baseline.waist} in` : "Add measurement"],
    ["Training days", daysTraining ? String(daysTraining) : "Start today"],
    ["This week", `${recentWorkouts.length} workouts`],
    ["Logged lifts", String(completedWithLogs.length)],
    ["Goal", baseline?.goal ?? "Build visible muscle"],
  ];

  return metrics
    .map(
      ([label, value]) => `
        <article class="transformation-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </article>
      `,
    )
    .join("");
}

function getLogMuscles(log) {
  return [...(log.primaryMuscles ?? []), ...(log.secondaryMuscles ?? [])];
}

function getMuscleGroup(muscle) {
  const normalizedMuscle = muscle.toLowerCase();

  if (/(chest|pectoral)/.test(normalizedMuscle)) return "Chest";
  if (/(back|latissimus|rhomboid|trapezius)/.test(normalizedMuscle)) return "Back";
  if (/(shoulder|deltoid|rotator cuff)/.test(normalizedMuscle)) return "Shoulders";
  if (/(biceps|triceps|forearm|brach)/.test(normalizedMuscle)) return "Arms";
  if (/(quad|glute|hamstring|calf|adductor|abductor|leg)/.test(normalizedMuscle)) return "Legs";
  if (/(core|abdom|oblique|spinae|rectus|transverse)/.test(normalizedMuscle)) return "Core";
  return null;
}

function renderMuscleBalance(workouts) {
  const since = Date.now() - 7 * 86400000;
  const counts = new Map(MUSCLE_GROUPS.map((muscle) => [muscle, 0]));

  workouts
    .filter((workout) => new Date(workout.completedAt).getTime() >= since)
    .forEach((workout) => {
      const logs = getWorkoutMovementLogs(workout).length ? getWorkoutMovementLogs(workout) : getDistinctMovementPlan(workout.plannedMovements ?? []);
      logs.forEach((log) => {
        getLogMuscles(log).forEach((muscle) => {
          const group = getMuscleGroup(muscle);
          if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
        });
      });
    });

  const max = Math.max(1, ...counts.values());

  return [...counts.entries()]
    .map(
      ([muscle, count]) => `
        <div class="muscle-balance-item">
          <span>${escapeHtml(muscle)}</span>
          <div><i style="width: ${(count / max) * 100}%"></i></div>
          <b>${count}</b>
        </div>
      `,
    )
    .join("");
}

function renderStrengthSignals(workouts) {
  const signals = workouts
    .flatMap((workout) =>
      getWorkoutMovementLogs(workout)
        .filter((log) => log.weightValue || log.repsCompleted || log.effort)
        .map((log) => ({ ...log, workoutName: workout.name, completedAt: workout.completedAt })),
    )
    .slice(0, 6);

  if (!signals.length) {
    return '<p class="empty-state">Complete a workout and log reps or load to start seeing progression hints.</p>';
  }

  return signals
    .map(
      (log) => `
        <article class="strength-signal">
          <div>
            <strong>${escapeHtml(log.move)}</strong>
            <span>${escapeHtml(formatLoadReps(log))}</span>
          </div>
          <p>${escapeHtml(log.recommendation ?? "Repeat and improve one number next time.")}</p>
        </article>
      `,
    )
    .join("");
}

function showCompletionLog(workout) {
  const movementLogs = getWorkoutMovementLogs(workout);

  if (!movementLogs.length) return;

  state.pendingWorkoutLog = workout;
  elements.completionLog.hidden = false;
  elements.completionLog.setAttribute("aria-hidden", "false");
  elements.completionNotes.value = workout.notes ?? "";
  elements.completionLogList.innerHTML = movementLogs.map(renderMovementLogRow).join("");
}

function hideCompletionLog() {
  state.pendingWorkoutLog = null;
  elements.completionLog.hidden = true;
  elements.completionLog.setAttribute("aria-hidden", "true");
  elements.completionNotes.value = "";
  elements.completionLogList.innerHTML = "";
}

function renderMovementLogRow(log, index) {
  const lastCopy = log.lastSummary ? `Last time: ${log.lastSummary}` : "First tracked session";

  return `
    <article class="movement-log-row" data-log-index="${index}">
      <div class="movement-log-title">
        <strong>${escapeHtml(log.move)}</strong>
        <span>${escapeHtml(log.target || log.pattern || "Move")}</span>
      </div>
      <p>${escapeHtml(lastCopy)}</p>
      <div class="movement-log-inputs">
        <label>
          Load
          <input data-log-field="weightValue" type="number" min="0" step="0.5" placeholder="lb" value="${escapeHtml(log.weightValue ?? "")}">
        </label>
        <label>
          Reps
          <input data-log-field="repsCompleted" type="number" min="0" step="1" placeholder="8-12" value="${escapeHtml(log.repsCompleted ?? "")}">
        </label>
        <label>
          Effort
          <input data-log-field="effort" type="number" min="1" max="10" step="1" placeholder="1-10" value="${escapeHtml(log.effort ?? "")}">
        </label>
      </div>
    </article>
  `;
}

async function saveMovementLog() {
  if (!state.pendingWorkoutLog) return;

  const workouts = await getWorkouts();
  const logs = getWorkoutMovementLogs(state.pendingWorkoutLog).map((log, index) => {
    const row = elements.completionLogList.querySelector(`[data-log-index="${index}"]`);
    const weightValue = numberOrNull(row?.querySelector('[data-log-field="weightValue"]')?.value);
    const repsCompleted = numberOrNull(row?.querySelector('[data-log-field="repsCompleted"]')?.value);
    const effort = numberOrNull(row?.querySelector('[data-log-field="effort"]')?.value);
    const lastLog = getLastMovementLog(log.move, workouts, state.pendingWorkoutLog.id);
    const nextLog = {
      ...log,
      weightValue,
      repsCompleted,
      effort,
      loggedAt: new Date().toISOString(),
      lastLoggedAt: lastLog?.completedAt ?? null,
      lastSummary: lastLog ? formatLoadReps(lastLog) : "",
    };

    return {
      ...nextLog,
      recommendation: getProgressionRecommendation(nextLog, lastLog),
    };
  });

  const updatedWorkout = {
    ...state.pendingWorkoutLog,
    movementLogs: logs,
    notes: elements.completionNotes.value.trim(),
  };

  const syncedWorkout = await syncCompletedWorkoutToApi(updatedWorkout);

  await putWorkout(syncedWorkout);
  hideCompletionLog();
  await renderHistory();
  await renderPlanner();
  await renderProgress();
}

async function editCompletedWorkout(workoutId) {
  const workouts = await getWorkouts();
  const workout = workouts.find((candidate) => String(candidate.id) === String(workoutId));

  if (!workout) return;

  if (!getWorkoutMovementLogs(workout).length && Array.isArray(workout.plannedMovements)) {
    workout.movementLogs = getDistinctMovementPlan(workout.plannedMovements).map((movement) => ({
      ...movement,
      weightValue: null,
      weightUnit: "lb",
      repsCompleted: null,
      effort: null,
      notes: "",
      recommendation: "Log numbers to unlock progression guidance.",
    }));
  }

  showCompletionLog(workout);
}

async function deleteCompletedWorkout(workoutId) {
  const numericWorkoutId = Number(workoutId);
  const localWorkoutId = Number.isFinite(numericWorkoutId) ? numericWorkoutId : workoutId;

  const workouts = await getWorkouts();
  const workout = workouts.find((candidate) => String(candidate.id) === String(workoutId));

  await deleteWorkout(localWorkoutId);
  await deleteApiResource("/v1/completed-workouts", workout?.apiId);

  const sessions = await getPlanSessions();
  await Promise.all(
    sessions
      .filter((session) => String(session.completedWorkoutId) === String(workoutId))
      .map(async (session) => {
        const updatedSession = {
          ...session,
          status: "planned",
          completedWorkoutId: null,
          completedWorkoutApiId: null,
          updatedAt: new Date().toISOString(),
        };

        await putPlanSession(await syncPlanSessionToApi(updatedSession));
      }),
  );

  await renderHistory();
  await renderPlanner();
  await renderProgress();
}

function renderWorkout(workout) {
  const completedDate = new Date(workout.completedAt);
  const tags = workout.tags?.length
    ? `<div class="tag-row">${workout.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";
  const equipment = workout.equipment?.length
    ? `<div class="equipment-summary-row">${workout.equipment.map((item) => `<span class="equipment-chip">${escapeHtml(item.name)}</span>`).join("")}</div>`
    : "";
  const notes = workout.notes
    ? `<p class="history-notes">${escapeHtml(workout.notes)}</p>`
    : "";
  const movementLogs = getWorkoutMovementLogs(workout).filter((log) => log.weightValue || log.repsCompleted || log.effort);
  const movementLogSummary = movementLogs.length
    ? `
      <div class="history-movement-logs">
        ${movementLogs
          .slice(0, 4)
          .map((log) => `<span>${escapeHtml(log.move)}: ${escapeHtml(formatLoadReps(log))}</span>`)
          .join("")}
      </div>
    `
    : "";

  return `
    <article class="history-item" data-workout-id="${workout.id}">
      <div class="history-title">
        <strong>${escapeHtml(workout.name)}</strong>
        <span class="history-title-actions">
          <time datetime="${workout.completedAt}">${completedDate.toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })}</time>
          <button type="button" data-edit-workout-id="${workout.id}">Edit</button>
          <button type="button" data-delete-workout-id="${workout.id}">Delete</button>
        </span>
      </div>
      <div class="history-meta">
        <span>${workout.rounds} rounds</span>
        <span>${formatClock(getPlannedDurationSeconds(workout.rounds, workout.restSecondsPerRound ?? DEFAULT_REST_SECONDS))} planned</span>
        <span>${workout.workSecondsPerRound ?? DEFAULT_WORK_SECONDS}s/${workout.restSecondsPerRound ?? DEFAULT_REST_SECONDS}s</span>
        <span>${formatClock(workout.durationSeconds)}</span>
        <span>${completedDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </div>
      ${tags}
      ${equipment}
      ${notes}
      ${movementLogSummary}
    </article>
  `;
}

function isTimerConfigValid() {
  const { workSeconds, restSeconds } = getFormValues();

  return workSeconds + restSeconds === ROUND_SECONDS;
}

function validateIntervalInputs() {
  const workSeconds = normalizeIntervalSeconds(elements.workSeconds.value, DEFAULT_WORK_SECONDS);
  const restSeconds = normalizeIntervalSeconds(elements.restSeconds.value, DEFAULT_REST_SECONDS);
  const totalSeconds = workSeconds + restSeconds;
  const message = totalSeconds === ROUND_SECONDS ? "" : "Work seconds plus rest seconds must equal 60.";

  elements.restSeconds.setCustomValidity(message);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

async function renderHistory() {
  const workouts = await getWorkouts();
  const totalSeconds = workouts.reduce((sum, workout) => sum + workout.durationSeconds, 0);
  const totalRounds = workouts.reduce((sum, workout) => sum + workout.rounds, 0);

  elements.totalWorkouts.textContent = workouts.length;
  elements.totalMinutes.textContent = Math.round(totalSeconds / 60);
  elements.totalRounds.textContent = totalRounds;
  elements.historyList.innerHTML = workouts.length
    ? workouts.map(renderWorkout).join("")
    : '<p class="empty-state">No workouts logged yet.</p>';
}

async function exportWorkouts() {
  const workouts = await getWorkouts();
  const blob = new Blob([JSON.stringify(workouts, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bellforge-emom-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

elements.startButton.addEventListener("click", startTimer);
elements.pauseButton.addEventListener("click", pauseTimer);
elements.resetButton.addEventListener("click", resetTimer);
elements.soundButton.addEventListener("click", toggleSound);
elements.completeButton.addEventListener("click", completeWorkout);
elements.exportButton.addEventListener("click", exportWorkouts);
elements.rounds.addEventListener("input", updateDisplay);
elements.workSeconds.addEventListener("input", () => {
  updateDisplay();
  renderSchedule();
});
elements.restSeconds.addEventListener("input", () => {
  updateDisplay();
  renderSchedule();
});
elements.savePlanButton.addEventListener("click", savePlanFromForm);
elements.saveBaselineButton.addEventListener("click", saveBaselineFromForm);
elements.baselineForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveBaselineFromForm();
});
elements.saveMovementLogButton.addEventListener("click", saveMovementLog);
elements.skipMovementLogButton.addEventListener("click", hideCompletionLog);
elements.historyList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-workout-id]");
  const deleteButton = event.target.closest("[data-delete-workout-id]");

  if (editButton) {
    await editCompletedWorkout(editButton.dataset.editWorkoutId);
    return;
  }

  if (deleteButton) {
    await deleteCompletedWorkout(deleteButton.dataset.deleteWorkoutId);
  }
});
elements.previousWeekButton.addEventListener("click", async () => {
  state.currentWeekStart = addDays(state.currentWeekStart, -7);
  await renderPlanner();
});
elements.todayWeekButton.addEventListener("click", async () => {
  state.currentWeekStart = getStartOfWeek(new Date());
  await renderPlanner();
});
elements.nextWeekButton.addEventListener("click", async () => {
  state.currentWeekStart = addDays(state.currentWeekStart, 7);
  await renderPlanner();
});
elements.plannerGrid.addEventListener("click", async (event) => {
  const addButton = event.target.closest("[data-plan-date]");
  const startButton = event.target.closest("[data-start-plan-id]");
  const editButton = event.target.closest("[data-edit-plan-id]");
  const skipButton = event.target.closest("[data-skip-plan-id]");
  const clearButton = event.target.closest("[data-clear-plan-id]");

  if (addButton) {
    elements.plannerDate.value = addButton.dataset.planDate;
    elements.plannerTemplate.focus();
    return;
  }

  if (startButton && !startButton.disabled) {
    await startPlanSession(startButton.dataset.startPlanId);
    return;
  }

  if (editButton && !editButton.disabled) {
    await editPlanSession(editButton.dataset.editPlanId);
    return;
  }

  if (skipButton && !skipButton.disabled) {
    await skipPlanSession(skipButton.dataset.skipPlanId);
    return;
  }

  if (clearButton && !clearButton.disabled) {
    await clearPlanSession(clearButton.dataset.clearPlanId);
  }
});
elements.newTemplateButton.addEventListener("click", startNewTemplate);
elements.clearBuilderButton.addEventListener("click", startNewTemplate);
elements.builderForm.addEventListener("submit", (event) => event.preventDefault());
elements.addMoveButton.addEventListener("click", addBuilderMove);
elements.saveTemplateButton.addEventListener("click", saveBuilderTemplate);
elements.builderCycles.addEventListener("input", renderBuilder);
elements.builderLibrarySearch.addEventListener("input", () => renderBuilderLibrary({ resetScroll: true }));
elements.builderLibraryPatternFilter.addEventListener("change", () => renderBuilderLibrary({ resetScroll: true }));
elements.builderLibraryEquipmentFilter.addEventListener("change", () => renderBuilderLibrary({ resetScroll: true }));
elements.builderLibraryList.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-library-move]");
  if (!addButton) return;

  addLibraryMoveToBuilder(addButton.dataset.addLibraryMove);
});
elements.builderMoveTarget.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addBuilderMove();
  }
});
elements.builderMoveList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-builder-move]");
  const removeButton = event.target.closest("[data-remove-builder-move]");

  if (editButton) {
    editBuilderMove(Number(editButton.dataset.editBuilderMove));
    return;
  }

  if (!removeButton) return;

  removeBuilderMove(Number(removeButton.dataset.removeBuilderMove));
});
elements.addEquipmentButton.addEventListener("click", addEquipment);
elements.equipmentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addEquipment();
});
elements.equipmentDetail.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addEquipment();
  }
});
elements.equipmentList.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-equipment-id]");
  const deleteButton = event.target.closest("[data-delete-equipment-id]");

  if (deleteButton && !deleteButton.disabled) {
    deleteEquipment(deleteButton.dataset.deleteEquipmentId);
    return;
  }

  if (!toggleButton || toggleButton.disabled) return;

  toggleEquipment(toggleButton.dataset.equipmentId);
});
elements.exerciseSearch.addEventListener("input", () => renderExerciseLibrary({ resetScroll: true }));
elements.exercisePatternFilter.addEventListener("change", () => renderExerciseLibrary({ resetScroll: true }));
elements.exerciseEquipmentFilter.addEventListener("change", () => renderExerciseLibrary({ resetScroll: true }));
elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});
elements.templateList.addEventListener("click", async (event) => {
  const favoriteButton = event.target.closest("[data-favorite-template-id]");
  const deleteButton = event.target.closest("[data-delete-template-id]");
  const editButton = event.target.closest("[data-edit-template-id]");
  const button = event.target.closest("[data-template-id]");

  if (favoriteButton && !favoriteButton.disabled) {
    toggleTemplateFavorite(favoriteButton.dataset.favoriteTemplateId);
    return;
  }

  if (deleteButton) {
    await deleteTemplate(deleteButton.dataset.deleteTemplateId);
    return;
  }

  if (editButton) {
    editTemplate(editButton.dataset.editTemplateId);
    return;
  }

  if (!button || button.disabled) return;

  selectTemplate(button.dataset.templateId);
});

async function initializeApp() {
  await hydrateFromApi();
  loadTemplates();
  renderTemplates();
  renderExerciseLibrary({ refreshFilters: true });
  renderBuilderLibrary({ refreshFilters: true });
  renderSchedule();
  renderBuilder();
  renderEquipment();
  renderPlanner();
  setStatus("ready");
  updateSoundButton();
  updateDisplay();
  renderHistory();
  renderProgress();
}

initializeApp();
