# Fitness Friend

A small local workout tracker starting with an EMOM timer.

![Fitness Friend EMOM tracker](docs/screenshot.png)

In this app, one EMOM round is one minute total. By default, each minute is
30 seconds of active work and 30 seconds of rest, so 10 selected rounds creates
a 10-minute session. The work/rest seconds are configurable as long as they add
up to 60 seconds.

Workouts are seeded from `/Users/spencerguy/Downloads/2026 Home Workout Sheet.xlsx`.
Each workout repeats the logged movement list by its cycle count, then converts
that into one-minute EMOM rounds.

You can also create custom workouts in the Builder tab. Custom workouts are
saved locally in the browser and appear alongside the seeded workouts.

## Run it

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Test it

```sh
node timer.test.js
```

## Current data model

Completed workouts are stored in the browser with IndexedDB under:

- Database: `fitness-friend`
- Store: `emomWorkouts`

Each completed EMOM saves:

- `name`
- `rounds`
- `tags`
- `completedAt`
- `durationSeconds`
- `plannedDurationSeconds`
- `workSecondsPerRound`
- `restSecondsPerRound`
- `type`

Use the Export JSON button to download the current local workout history.
