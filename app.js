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
const DB_VERSION = 3;
const STORE_NAME = "emomWorkouts";

const elements = {
  form: document.querySelector("#workout-form"),
  workoutName: document.querySelector("#workout-name"),
  rounds: document.querySelector("#rounds"),
  workSeconds: document.querySelector("#work-seconds"),
  restSeconds: document.querySelector("#rest-seconds"),
  tags: document.querySelector("#tags"),
  plannedDuration: document.querySelector("#planned-duration"),
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
  completeButton: document.querySelector("#complete-button"),
  setupDetails: document.querySelector("#setup-details"),
  exportButton: document.querySelector("#export-button"),
  tabButtons: document.querySelectorAll("[data-tab]"),
  tabPanels: document.querySelectorAll("[data-tab-panel]"),
  templateList: document.querySelector("#template-list"),
  scheduleTitle: document.querySelector("#schedule-title"),
  scheduleSummary: document.querySelector("#schedule-summary"),
  scheduleList: document.querySelector("#schedule-list"),
  historyList: document.querySelector("#history-list"),
  totalWorkouts: document.querySelector("#total-workouts"),
  totalMinutes: document.querySelector("#total-minutes"),
  totalRounds: document.querySelector("#total-rounds"),
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
              plannedDurationSeconds: getPlannedDurationSeconds(workout.rounds),
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
  return dbPromise.then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
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

function getFormValues() {
  const workSeconds = normalizeIntervalSeconds(elements.workSeconds.value, DEFAULT_WORK_SECONDS);
  const restSeconds = normalizeIntervalSeconds(elements.restSeconds.value, DEFAULT_REST_SECONDS);

  return {
    name: elements.workoutName.value.trim(),
    rounds: normalizeRounds(elements.rounds.value),
    workSeconds,
    restSeconds,
  tags: elements.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
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

  elements.plannedDuration.textContent = `${snapshot.rounds} rounds = ${formatClock(snapshot.totalMs / 1000)} total · ${snapshot.workSeconds}s work / ${snapshot.restSeconds}s rest`;
  elements.phaseLabel.textContent = `${snapshot.phaseName} phase`;
  elements.roundLabel.textContent = `Round ${snapshot.currentRound} of ${snapshot.rounds}`;
  elements.movementKicker.textContent = getMovementKicker(snapshot, activeMovement);
  elements.movementLabel.textContent = getMovementLabel(snapshot, activeMovement);
  elements.timeLeft.textContent = formatClock(snapshot.secondsLeft);
  elements.elapsedTime.textContent = `Elapsed ${formatClock(elapsedSeconds)}`;
  elements.progressFill.style.width = `${Math.min(100, snapshot.progress * 100)}%`;
  document.body.classList.toggle("rest-mode", snapshot.isRest && state.status !== "complete");
  updateScheduleHighlight(snapshot);

  if (snapshot.elapsedMs >= snapshot.totalMs && state.status === "running" && !state.isCompleting) {
    completeWorkout();
  }
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
}

function startTimer() {
  validateIntervalInputs();
  if (!elements.form.reportValidity()) {
    elements.setupDetails.open = true;
    return;
  }

  if (state.status === "paused") {
    state.pausedMs += Date.now() - state.pausedAt;
    state.pausedAt = null;
  } else {
    state.startedAt = Date.now();
    state.pausedMs = 0;
    state.isCompleting = false;
  }

  clearInterval(state.intervalId);
  state.intervalId = setInterval(updateDisplay, 250);
  elements.setupDetails.open = false;
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
  setStatus("ready");
  updateDisplay();
}

async function completeWorkout() {
  validateIntervalInputs();
  if (!state.startedAt || state.isCompleting || !elements.form.reportValidity()) return;

  clearInterval(state.intervalId);
  state.isCompleting = true;
  const { name, rounds, tags, workSeconds, restSeconds } = getFormValues();
  const durationSeconds = Math.max(1, Math.round(getElapsedMs() / 1000));
  const completedAt = new Date().toISOString();

  await addWorkout({
    name,
    rounds,
    tags,
    completedAt,
    durationSeconds,
    plannedDurationSeconds: getPlannedDurationSeconds(rounds),
    workSecondsPerRound: workSeconds,
    restSecondsPerRound: restSeconds,
    templateId: state.selectedTemplate?.id ?? null,
    templateName: state.selectedTemplate?.name ?? null,
    plannedMovements: state.activePlan,
    type: "EMOM",
  });

  setStatus("complete");
  state.isCompleting = false;
  updateDisplay();
  await renderHistory();
}

function getActiveMovement(snapshot) {
  if (!state.activePlan.length) return null;
  return state.activePlan[snapshot.currentRound - 1] ?? null;
}

function getMovementKicker(snapshot, movement) {
  if (!movement) return "Current movement";
  if (snapshot.isRest) return "Rest, then next round";
  return `Cycle ${movement.cycle} · Move ${movement.movementIndex}`;
}

function getMovementLabel(snapshot, movement) {
  if (!movement) return "Choose a template or enter your own workout.";

  const label = movement.target ? `${movement.move} · ${movement.target}` : movement.move;

  if (!snapshot.isRest) return label;

  const nextMovement = state.activePlan[snapshot.currentRound] ?? null;
  if (!nextMovement) return "Final rest minute";

  return nextMovement.target ? `${nextMovement.move} · ${nextMovement.target}` : nextMovement.move;
}

function renderTemplates() {
  elements.templateList.innerHTML = workoutTemplates
    .map((template) => {
      const rounds = expandTemplate(template).length;
      const minutes = rounds * (ROUND_SECONDS / 60);
      const activeClass = state.selectedTemplate?.id === template.id ? " is-active" : "";

      return `
        <button class="template-button${activeClass}" type="button" data-template-id="${template.id}">
          <span>
            <strong>${escapeHtml(template.name)}</strong>
            <small>${template.movements.length} moves · ${template.cycles} cycles · ${minutes} min</small>
          </span>
        </button>
      `;
    })
    .join("");
}

function selectTemplate(templateId) {
  const template = workoutTemplates.find((candidate) => candidate.id === templateId);
  if (!template) return;

  const plan = expandTemplate(template);
  state.selectedTemplate = template;
  state.activePlan = plan;
  elements.workoutName.value = template.name;
  elements.rounds.value = plan.length;
  elements.workSeconds.value = DEFAULT_WORK_SECONDS;
  elements.restSeconds.value = DEFAULT_REST_SECONDS;
  elements.tags.value = template.tags.join(", ");
  elements.setupDetails.open = false;

  renderTemplates();
  renderSchedule();
  switchTab("moves");
  updateDisplay();
}

function renderSchedule() {
  if (!state.selectedTemplate) {
    elements.scheduleTitle.textContent = "No template selected";
    elements.scheduleSummary.textContent = "Manual EMOM";
    elements.scheduleList.innerHTML = "";
    return;
  }

  const totalMinutes = state.activePlan.length * (ROUND_SECONDS / 60);
  const { workSeconds, restSeconds } = getFormValues();

  elements.scheduleTitle.textContent = state.selectedTemplate.name;
  elements.scheduleSummary.textContent = `${state.selectedTemplate.movements.length} distinct moves · ${state.selectedTemplate.cycles} cycles · ${totalMinutes} min · ${workSeconds}s/${restSeconds}s`;
  elements.scheduleList.innerHTML = state.selectedTemplate.movements
    .map(
      (movement, index) => `
        <li data-movement-index="${index + 1}">
          <span>${index + 1}</span>
          <strong>${escapeHtml(movement.move)}</strong>
          <small>${escapeHtml(movement.target)}</small>
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

function renderWorkout(workout) {
  const completedDate = new Date(workout.completedAt);
  const tags = workout.tags?.length
    ? `<div class="tag-row">${workout.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
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
        <span>${formatClock(getPlannedDurationSeconds(workout.rounds))} planned</span>
        <span>${workout.workSecondsPerRound ?? DEFAULT_WORK_SECONDS}s/${workout.restSecondsPerRound ?? DEFAULT_REST_SECONDS}s</span>
        <span>${formatClock(workout.durationSeconds)}</span>
        <span>${completedDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </div>
      ${tags}
    </article>
  `;
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
  link.download = `fitness-friend-emom-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

elements.startButton.addEventListener("click", startTimer);
elements.pauseButton.addEventListener("click", pauseTimer);
elements.resetButton.addEventListener("click", resetTimer);
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
elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});
elements.templateList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-template-id]");

  if (!button || button.disabled) return;

  selectTemplate(button.dataset.templateId);
});

renderTemplates();
renderSchedule();
setStatus("ready");
updateDisplay();
renderHistory();
