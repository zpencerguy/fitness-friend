export const ROUND_SECONDS = 60;
export const DEFAULT_WORK_SECONDS = 30;
export const DEFAULT_REST_SECONDS = 30;

export function normalizeRounds(rounds) {
  return Math.max(1, Number(rounds) || 1);
}

export function normalizeIntervalSeconds(value, fallback = 0) {
  return Math.max(0, Math.min(ROUND_SECONDS, Number(value) || fallback));
}

export function getPlannedDurationSeconds(rounds, restSeconds = DEFAULT_REST_SECONDS) {
  const normalizedRounds = normalizeRounds(rounds);
  const normalizedRestSeconds = normalizeIntervalSeconds(restSeconds, DEFAULT_REST_SECONDS);

  return Math.max(1, normalizedRounds * ROUND_SECONDS - normalizedRestSeconds);
}

export function getTimerSnapshot({
  rounds,
  elapsedMs,
  status = "running",
  workSeconds = DEFAULT_WORK_SECONDS,
  restSeconds = DEFAULT_REST_SECONDS,
}) {
  const normalizedRounds = normalizeRounds(rounds);
  const normalizedWorkSeconds = normalizeIntervalSeconds(workSeconds, DEFAULT_WORK_SECONDS);
  const normalizedRestSeconds = normalizeIntervalSeconds(restSeconds, DEFAULT_REST_SECONDS);
  const totalMs = getPlannedDurationSeconds(normalizedRounds, normalizedRestSeconds) * 1000;
  const clampedElapsedMs = Math.min(Math.max(0, elapsedMs), totalMs);
  const elapsedSeconds = Math.floor(clampedElapsedMs / 1000);
  const currentRound = Math.min(normalizedRounds, Math.floor(elapsedSeconds / ROUND_SECONDS) + 1);
  const secondsIntoRound = elapsedSeconds % ROUND_SECONDS;
  const isComplete = status === "complete" || clampedElapsedMs >= totalMs;
  const isRest = !isComplete && secondsIntoRound >= normalizedWorkSeconds;
  const phaseSeconds = isRest ? normalizedRestSeconds : normalizedWorkSeconds;
  const secondsIntoPhase = isRest ? secondsIntoRound - normalizedWorkSeconds : secondsIntoRound;
  const secondsLeft = status === "complete" ? 0 : phaseSeconds - secondsIntoPhase;

  return {
    rounds: normalizedRounds,
    workSeconds: normalizedWorkSeconds,
    restSeconds: normalizedRestSeconds,
    totalMs,
    elapsedMs: clampedElapsedMs,
    currentRound,
    secondsIntoRound,
    isRest,
    phaseName: isComplete ? "Complete" : isRest ? "Rest" : "Work",
    secondsLeft: clampedElapsedMs >= totalMs ? 0 : secondsLeft,
    progress: totalMs > 0 ? clampedElapsedMs / totalMs : 0,
  };
}
