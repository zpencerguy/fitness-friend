export const workoutTemplates = [
  {
    id: "sheet-120-kettlebell-full-body",
    name: "Kettlebell Full Body",
    source: "2026 Home Workout Sheet - tab 120",
    tags: ["kettlebell", "full-body", "home"],
    cycles: 3,
    movements: [
      { move: "Single-Leg Deadlift (L)", target: "30 sec" },
      { move: "Single-Leg Deadlift (R)", target: "30 sec" },
      { move: "Goblet Squat", target: "30 sec" },
      { move: "Bent Row (Alt)", target: "30 sec" },
      { move: "Dead High Pull (Alt)", target: "30 sec" },
      { move: "Kettlebell Halos (Alt)", target: "30 sec" },
      { move: "Goblet Front Side Raise (Alt)", target: "30 sec" },
      { move: "Goblet Overhead March", target: "30 sec" },
      { move: "Scissor Leg Raise (Alt)", target: "30 sec" },
      { move: "Reverse Plank", target: "30 sec" },
    ],
  },
  {
    id: "sheet-115-push-pull-burner",
    name: "Push + Pull Burner",
    source: "2026 Home Workout Sheet - tab 115",
    tags: ["strength", "push", "pull"],
    cycles: 5,
    movements: [
      { move: "Burpees", target: "5 reps" },
      { move: "Pushups", target: "10 reps" },
      { move: "Bent Row (L)", target: "15 reps" },
      { move: "Bent Row (R)", target: "15 reps" },
      { move: "Russian Swings", target: "20 reps" },
    ],
  },
  {
    id: "sheet-112-single-leg-strength",
    name: "Single-Leg Strength",
    source: "2026 Home Workout Sheet - tab 112",
    tags: ["kettlebell", "legs", "strength"],
    cycles: 4,
    movements: [
      { move: "Single Leg Deadrow (L)", target: "30 sec" },
      { move: "Single Leg Deadrow (R)", target: "30 sec" },
      { move: "Goblet Squat", target: "30 sec" },
      { move: "Bent Row (Alt)", target: "30 sec" },
      { move: "Dead High Pull (Alt)", target: "30 sec" },
      { move: "Kettlebell Halos (Alt)", target: "30 sec" },
      { move: "Side to Front Raise (Alt)", target: "30 sec" },
      { move: "Overhead March", target: "30 sec" },
    ],
  },
  {
    id: "sheet-119-kb-core-mix",
    name: "KB + Core Mix",
    source: "2026 Home Workout Sheet - tab 119",
    tags: ["kettlebell", "core", "conditioning"],
    cycles: 2,
    movements: [
      { move: "KB Cross Lunge", target: "30 sec" },
      { move: "Shoulder Toss", target: "30 sec" },
      { move: "KB Curl", target: "30 sec" },
      { move: "KB Pullover", target: "30 sec" },
      { move: "Upright Row Shoulder Press", target: "30 sec" },
      { move: "Pushups", target: "30 reps" },
      { move: "Russian Twists with KB", target: "30 reps" },
      { move: "Sit Ups", target: "30 reps" },
    ],
  },
];

export function expandTemplate(template) {
  return Array.from({ length: template.cycles }).flatMap((_, cycleIndex) =>
    template.movements.map((movement, movementIndex) => ({
      ...movement,
      cycle: cycleIndex + 1,
      movementIndex: movementIndex + 1,
    })),
  );
}
