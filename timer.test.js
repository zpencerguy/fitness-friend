import assert from "node:assert/strict";
import { getPlannedDurationSeconds, getTimerSnapshot } from "./timer.js";

assert.equal(getPlannedDurationSeconds(10), 10 * 60);

assert.deepEqual(
  pickTimerFields(getTimerSnapshot({ rounds: 10, elapsedMs: 0 })),
  {
    currentRound: 1,
    secondsIntoRound: 0,
    isRest: false,
    phaseName: "Work",
    secondsLeft: 30,
    totalMs: 10 * 60 * 1000,
  },
);

assert.deepEqual(
  pickTimerFields(getTimerSnapshot({ rounds: 10, elapsedMs: 31 * 1000 })),
  {
    currentRound: 1,
    secondsIntoRound: 31,
    isRest: true,
    phaseName: "Rest",
    secondsLeft: 29,
    totalMs: 10 * 60 * 1000,
  },
);

assert.deepEqual(
  pickTimerFields(getTimerSnapshot({ rounds: 10, elapsedMs: 60 * 1000 })),
  {
    currentRound: 2,
    secondsIntoRound: 0,
    isRest: false,
    phaseName: "Work",
    secondsLeft: 30,
    totalMs: 10 * 60 * 1000,
  },
);

assert.deepEqual(
  pickTimerFields(getTimerSnapshot({ rounds: 10, elapsedMs: 46 * 1000, workSeconds: 45, restSeconds: 15 })),
  {
    currentRound: 1,
    secondsIntoRound: 46,
    isRest: true,
    phaseName: "Rest",
    secondsLeft: 14,
    totalMs: 10 * 60 * 1000,
  },
);

function pickTimerFields(snapshot) {
  return {
    currentRound: snapshot.currentRound,
    secondsIntoRound: snapshot.secondsIntoRound,
    isRest: snapshot.isRest,
    phaseName: snapshot.phaseName,
    secondsLeft: snapshot.secondsLeft,
    totalMs: snapshot.totalMs,
  };
}
