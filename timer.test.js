import assert from "node:assert/strict";
import { getPlannedDurationSeconds, getTimerSnapshot } from "./timer.js";

assert.equal(getPlannedDurationSeconds(10), 9 * 60 + 30);
assert.equal(getPlannedDurationSeconds(10, 15), 9 * 60 + 45);

assert.deepEqual(
  pickTimerFields(getTimerSnapshot({ rounds: 10, elapsedMs: 0 })),
  {
    currentRound: 1,
    secondsIntoRound: 0,
    isRest: false,
    phaseName: "Work",
    secondsLeft: 30,
    totalMs: (9 * 60 + 30) * 1000,
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
    totalMs: (9 * 60 + 30) * 1000,
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
    totalMs: (9 * 60 + 30) * 1000,
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
    totalMs: (9 * 60 + 45) * 1000,
  },
);

assert.deepEqual(
  pickTimerFields(getTimerSnapshot({ rounds: 10, elapsedMs: (9 * 60 + 29) * 1000 })),
  {
    currentRound: 10,
    secondsIntoRound: 29,
    isRest: false,
    phaseName: "Work",
    secondsLeft: 1,
    totalMs: (9 * 60 + 30) * 1000,
  },
);

assert.deepEqual(
  pickTimerFields(getTimerSnapshot({ rounds: 10, elapsedMs: (9 * 60 + 30) * 1000 })),
  {
    currentRound: 10,
    secondsIntoRound: 30,
    isRest: false,
    phaseName: "Complete",
    secondsLeft: 0,
    totalMs: (9 * 60 + 30) * 1000,
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
