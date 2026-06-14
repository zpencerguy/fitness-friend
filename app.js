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
const SOUND_ENABLED_KEY = "fitness-friend-sound-enabled";
const FAVORITE_TEMPLATES_KEY = "fitness-friend-favorite-templates";
const EQUIPMENT_KEY = "fitness-friend-equipment";
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
  rounds: document.querySelector("#rounds"),
  workSeconds: document.querySelector("#work-seconds"),
  restSeconds: document.querySelector("#rest-seconds"),
  tags: document.querySelector("#tags"),
  movementArt: document.querySelector("#movement-art"),
  phaseLabel: document.querySelector("#phase-label"),
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
  newTemplateButton: document.querySelector("#new-template-button"),
  clearBuilderButton: document.querySelector("#clear-builder-button"),
  builderTitle: document.querySelector("#builder-title"),
  builderName: document.querySelector("#builder-name"),
  builderCycles: document.querySelector("#builder-cycles"),
  builderTags: document.querySelector("#builder-tags"),
  builderMoveName: document.querySelector("#builder-move-name"),
  builderMoveTarget: document.querySelector("#builder-move-target"),
  builderMovePattern: document.querySelector("#builder-move-pattern"),
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
  scheduleTitle: document.querySelector("#schedule-title"),
  scheduleSummary: document.querySelector("#schedule-summary"),
  scheduleList: document.querySelector("#schedule-list"),
  historyList: document.querySelector("#history-list"),
  totalWorkouts: document.querySelector("#total-workouts"),
  totalMinutes: document.querySelector("#total-minutes"),
  totalRounds: document.querySelector("#total-rounds"),
  celebration: document.querySelector("#celebration"),
};

const state = {
  status: "ready",
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  intervalId: null,
  isCompleting: false,
  selectedTemplate: null,
  activePlan: [],
  templates: [],
  builderEditingId: null,
  builderMoves: [],
  equipment: loadEquipment(),
  activePlanSessionId: null,
  currentWeekStart: getStartOfWeek(new Date()),
  favoriteTemplateIds: loadFavoriteTemplateIds(),
  soundEnabled: loadSoundPreference(),
  audioContext: null,
  audioUnlockPromise: null,
  playedAudioCues: new Set(),
  celebrationTimeoutId: null,
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

function getWorkouts() {
  return withStore("readonly", (store) => store.getAll()).then((workouts) =>
    workouts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
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
  state.templates = [...workoutTemplates, ...loadCustomTemplates()];
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

function updateDisplay() {
  validateIntervalInputs();
  const snapshot = getTimerSnapshot();
  const elapsedSeconds = Math.floor(snapshot.elapsedMs / 1000);
  const activeMovement = getActiveMovement(snapshot);
  const visibleMovement = snapshot.isRest ? state.activePlan[snapshot.currentRound] ?? activeMovement : activeMovement;

  elements.phaseLabel.textContent = snapshot.phaseName === "Complete" ? "Complete" : `${snapshot.phaseName} phase`;
  elements.roundLabel.textContent = `Round ${snapshot.currentRound} of ${snapshot.rounds}`;
  elements.movementKicker.textContent = getMovementKicker(snapshot, activeMovement);
  elements.movementLabel.textContent = getMovementLabel(snapshot, activeMovement);
  updateMovementArt(visibleMovement);
  elements.timeLeft.textContent = formatClock(snapshot.secondsLeft);
  elements.elapsedTime.textContent = `Elapsed ${formatClock(elapsedSeconds)}`;
  elements.progressFill.style.width = `${Math.min(100, snapshot.progress * 100)}%`;
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
    await playTone({ frequency: 660, duration: 0.1, volume: 0.085, type: "sine" });
  }
}

function updateSoundButton() {
  elements.soundButton.textContent = state.soundEnabled ? "Sound On" : "Sound Off";
  elements.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
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
    playAudioCue(`work-countdown-${snapshot.currentRound}-${snapshot.secondsLeft}`, () => playCountdownCue(snapshot.secondsLeft));
  }

  if (snapshot.isRest && snapshot.secondsLeft <= 3 && snapshot.secondsLeft > 0) {
    playAudioCue(`rest-countdown-${snapshot.currentRound}-${snapshot.secondsLeft}`, () => playCountdownCue(snapshot.secondsLeft));
  }
}

function playAudioCue(key, callback) {
  if (state.playedAudioCues.has(key)) return;

  state.playedAudioCues.add(key);
  callback();
}

function playRoundStartCue() {
  playTone({ frequency: 880, duration: 0.1, volume: 0.15, type: "triangle" });
  window.setTimeout(() => playTone({ frequency: 1175, duration: 0.12, volume: 0.14, type: "triangle" }), 110);
}

function playRestStartCue() {
  playTone({ frequency: 520, duration: 0.11, volume: 0.1, type: "sine" });
}

function playCountdownCue(secondsLeft) {
  const frequency = secondsLeft === 1 ? 760 : 620;
  playTone({ frequency, duration: 0.08, volume: 0.08, type: "sine" });
}

async function playTone({ frequency, duration, volume, type }) {
  const audioContext = await unlockAudio();

  if (!audioContext || audioContext.state !== "running") return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
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
    templateName: state.selectedTemplate?.name ?? null,
    plannedSessionId: state.activePlanSessionId,
    plannedMovements: state.activePlan,
    type: "EMOM",
  };
  const completedWorkoutId = await addWorkout(completedWorkout);

  if (state.activePlanSessionId) {
    const sessions = await getPlanSessions();
    const session = sessions.find((candidate) => candidate.id === state.activePlanSessionId);

    if (session) {
      await putPlanSession({
        ...session,
        status: "completed",
        completedWorkoutId,
        updatedAt: new Date().toISOString(),
      });
    }

    state.activePlanSessionId = null;
  }

  setStatus("complete");
  showCelebration();
  state.isCompleting = false;
  updateDisplay();
  await renderHistory();
  await renderPlanner();
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
      const customActions = template.isCustom
        ? `
            <button type="button" data-edit-template-id="${template.id}">Edit</button>
            <button type="button" data-delete-template-id="${template.id}">Delete</button>
          `
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
          ${customActions}
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
          </button>
          ${actions}
        </article>
      `;
    })
    .join("");
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

  const plan = expandTemplate(template);
  state.selectedTemplate = template;
  state.activePlanSessionId = null;
  state.activePlan = plan;
  elements.workoutName.value = template.name;
  elements.rounds.value = plan.length;
  elements.workSeconds.value = DEFAULT_WORK_SECONDS;
  elements.restSeconds.value = DEFAULT_REST_SECONDS;
  elements.tags.value = template.tags.join(", ");

  renderTemplates();
  renderSchedule();
  switchTab("moves");
  updateDisplay();
}

function selectPlannedSession(session) {
  selectTemplate(session.templateId);
  state.activePlanSessionId = session.id;
  switchTab("moves");
}

function startNewTemplate() {
  state.builderEditingId = null;
  state.builderMoves = [];
  elements.builderTitle.textContent = "Workout Builder";
  elements.builderName.value = "";
  elements.builderCycles.value = "3";
  elements.builderTags.value = "";
  elements.builderMoveName.value = "";
  elements.builderMoveTarget.value = "";
  elements.builderMovePattern.value = "Hinge";
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
  renderBuilder();
  switchTab("builder");
}

function deleteTemplate(templateId) {
  const customTemplates = loadCustomTemplates().filter((template) => template.id !== templateId);
  saveCustomTemplates(customTemplates);

  if (state.selectedTemplate?.id === templateId) {
    state.selectedTemplate = null;
    state.activePlan = [];
    elements.workoutName.value = "Manual EMOM";
    elements.rounds.value = "10";
    elements.workSeconds.value = DEFAULT_WORK_SECONDS;
    elements.restSeconds.value = DEFAULT_REST_SECONDS;
    elements.tags.value = "";
  }

  loadTemplates();
  renderTemplates();
  renderSchedule();
  renderPlanner();
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

  state.builderMoves.push({ move, target, pattern, cue: "" });
  elements.builderMoveName.value = "";
  elements.builderMoveTarget.value = "";
  elements.builderMoveName.focus();
  renderBuilder();
}

function removeBuilderMove(index) {
  state.builderMoves.splice(index, 1);
  renderBuilder();
}

function saveBuilderTemplate() {
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
  const template = {
    id: state.builderEditingId ?? `custom-${Date.now()}`,
    name,
    source: "Custom",
    tags,
    cycles,
    movements: state.builderMoves.map((movement) => ({ ...movement })),
    isCustom: true,
  };
  const nextTemplates = state.builderEditingId
    ? customTemplates.map((candidate) => (candidate.id === state.builderEditingId ? template : candidate))
    : [...customTemplates, template];

  saveCustomTemplates(nextTemplates);
  loadTemplates();
  selectTemplate(template.id);
  state.builderEditingId = template.id;
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
            <li>
              ${renderMoveArt(movement, "move-art-thumb")}
              <span>${index + 1}</span>
              <strong>${escapeHtml(movement.move)}</strong>
              <small><b>${escapeHtml(movement.pattern ?? "Move")}</b> ${escapeHtml(movement.target)}</small>
              <button type="button" data-remove-builder-move="${index}">Remove</button>
            </li>
          `,
        )
        .join("")
    : '<li class="builder-empty">No moves added yet.</li>';
  elements.builderSummary.textContent = `${state.builderMoves.length} moves · ${cycles} cycles · ${duration}`;
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

  elements.plannerTemplate.innerHTML = getSortedTemplates()
    .map((template) => `<option value="${template.id}">${escapeHtml(template.name)}</option>`)
    .join("");
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

  await putPlanSession({
    id: existingSession?.id ?? `plan-${elements.plannerDate.value}-${Date.now()}`,
    date: elements.plannerDate.value,
    templateId: template.id,
    workoutName: template.name,
    focus: elements.plannerFocus.value,
    equipment: getSelectedEquipment().map(({ id, name, category }) => ({ id, name, category })),
    plannedRounds: plan.length,
    plannedDurationSeconds: getPlannedDurationSeconds(plan.length, DEFAULT_REST_SECONDS),
    status: "planned",
    completedWorkoutId: existingSession?.completedWorkoutId ?? null,
    createdAt: existingSession?.createdAt ?? now,
    updatedAt: now,
  });

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

  await putPlanSession({
    ...session,
    status: "skipped",
    updatedAt: new Date().toISOString(),
  });
  await renderPlanner();
}

async function clearPlanSession(sessionId) {
  await deletePlanSession(sessionId);
  await renderPlanner();
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

function addEquipment() {
  const name = elements.equipmentName.value.trim();

  if (!name) {
    elements.equipmentName.focus();
    return;
  }

  state.equipment.push(
    sanitizeEquipment({
      id: `custom-gear-${Date.now()}`,
      name,
      category: elements.equipmentCategory.value,
      detail: elements.equipmentDetail.value,
      selected: true,
      isPreset: false,
    }),
  );
  elements.equipmentName.value = "";
  elements.equipmentDetail.value = "";
  elements.equipmentName.focus();
  saveEquipment();
  renderEquipment();
}

function toggleEquipment(equipmentId) {
  state.equipment = state.equipment.map((equipment) =>
    equipment.id === equipmentId ? { ...equipment, selected: !equipment.selected } : equipment,
  );
  saveEquipment();
  renderEquipment();
}

function deleteEquipment(equipmentId) {
  state.equipment = state.equipment.filter((equipment) => equipment.id !== equipmentId || equipment.isPreset);
  saveEquipment();
  renderEquipment();
}

function renderSchedule() {
  if (!state.selectedTemplate) {
    elements.scheduleTitle.textContent = "No workout selected";
    elements.scheduleSummary.textContent = "Manual EMOM";
    elements.scheduleList.innerHTML = "";
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
  updateScheduleHighlight(getTimerSnapshot());
}

function updateScheduleHighlight(snapshot) {
  const activeMovement = getActiveMovement(snapshot);
  const upcomingMovement = snapshot.isRest ? state.activePlan[snapshot.currentRound] ?? null : null;

  elements.scheduleList.querySelectorAll("[data-movement-index]").forEach((item) => {
    item.classList.toggle("is-active", Boolean(activeMovement && !snapshot.isRest && item.dataset.movementIndex === String(activeMovement.movementIndex)));
    item.classList.toggle("is-upcoming", Boolean(upcomingMovement && item.dataset.movementIndex === String(upcomingMovement.movementIndex)));
  });

  if (!state.selectedTemplate || !activeMovement) return;

  const phaseText = snapshot.isRest ? `next: move ${upcomingMovement?.movementIndex ?? activeMovement.movementIndex}` : `active: move ${activeMovement.movementIndex}`;
  elements.scheduleSummary.textContent = `${state.selectedTemplate.movements.length} distinct moves · cycle ${activeMovement.cycle} of ${state.selectedTemplate.cycles} · ${phaseText}`;
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

function renderWorkout(workout) {
  const completedDate = new Date(workout.completedAt);
  const tags = workout.tags?.length
    ? `<div class="tag-row">${workout.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";
  const equipment = workout.equipment?.length
    ? `<div class="equipment-summary-row">${workout.equipment.map((item) => `<span class="equipment-chip">${escapeHtml(item.name)}</span>`).join("")}</div>`
    : "";

  return `
    <article class="history-item">
      <div class="history-title">
        <strong>${escapeHtml(workout.name)}</strong>
        <time datetime="${workout.completedAt}">${completedDate.toLocaleDateString([], {
          month: "short",
          day: "numeric",
        })}</time>
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
elements.addMoveButton.addEventListener("click", addBuilderMove);
elements.saveTemplateButton.addEventListener("click", saveBuilderTemplate);
elements.builderCycles.addEventListener("input", renderBuilder);
elements.builderMoveTarget.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addBuilderMove();
  }
});
elements.builderMoveList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-builder-move]");

  if (!button) return;

  removeBuilderMove(Number(button.dataset.removeBuilderMove));
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
elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});
elements.templateList.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite-template-id]");
  const deleteButton = event.target.closest("[data-delete-template-id]");
  const editButton = event.target.closest("[data-edit-template-id]");
  const button = event.target.closest("[data-template-id]");

  if (favoriteButton && !favoriteButton.disabled) {
    toggleTemplateFavorite(favoriteButton.dataset.favoriteTemplateId);
    return;
  }

  if (deleteButton) {
    deleteTemplate(deleteButton.dataset.deleteTemplateId);
    return;
  }

  if (editButton) {
    editTemplate(editButton.dataset.editTemplateId);
    return;
  }

  if (!button || button.disabled) return;

  selectTemplate(button.dataset.templateId);
});

loadTemplates();
renderTemplates();
renderSchedule();
renderBuilder();
renderEquipment();
renderPlanner();
setStatus("ready");
updateSoundButton();
updateDisplay();
renderHistory();
