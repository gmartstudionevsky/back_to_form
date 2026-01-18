import {
  ActivityDefaults,
  ActivityLog,
  Exercise,
  MovementActivity,
  MovementSessionLog,
  Protocol,
  WorkoutPlanItem
} from '../types';

export const defaultActivityDefaults: ActivityDefaults = {
  workoutPerMinute: 0.04,
  movementPerMinute: 0.03,
  step: 0.00008,
  distanceKm: 0.3,
  set: 0.12,
  rep: 0.01,
  kcal: 0.002,
  flight: 0.05,
  exerciseBase: 0.2
};

export const resolveActivityDefaults = (
  defaults?: Partial<ActivityDefaults>
): ActivityDefaults => ({
  ...defaultActivityDefaults,
  ...(defaults ?? {})
});

export const calcStepsCoefficient = (steps: number, defaults: ActivityDefaults) =>
  steps * defaults.step;

export const calcTrainingLogCoefficient = (log: ActivityLog, defaults: ActivityDefaults) =>
  log.minutes * defaults.workoutPerMinute +
  (log.sets ?? 0) * defaults.set +
  (log.reps ?? 0) * defaults.rep +
  (log.calories ?? 0) * defaults.kcal;

export const calcMovementSessionCoefficient = (
  log: MovementSessionLog,
  activity: MovementActivity | undefined,
  defaults: ActivityDefaults,
  options: { includeSteps?: boolean } = {}
) => {
  const metrics = activity?.activityMetrics ?? {};
  const perMinute = metrics.perMinute ?? defaults.movementPerMinute;
  const perKm = metrics.perKm ?? defaults.distanceKm;
  const perFlight = metrics.perFlight ?? defaults.flight;
  const perStep = metrics.perStep ?? defaults.step;
  const perKcal = metrics.perKcal ?? defaults.kcal;
  const distance = log.distanceKm ?? 0;
  const flights = log.actualFlights ?? log.plannedFlights ?? 0;
  const steps = options.includeSteps ? log.steps ?? 0 : 0;
  const calories = log.calories ?? 0;
  return (
    log.durationMinutes * perMinute +
    distance * perKm +
    flights * perFlight +
    steps * perStep +
    calories * perKcal
  );
};

export const calcProtocolDurationMinutes = (protocol?: Protocol) => {
  if (!protocol) return undefined;
  const totalDurationSec = protocol.steps.reduce(
    (sum, step) => sum + (step.durationSec ?? 0),
    0
  );
  return totalDurationSec ? Math.max(1, Math.round(totalDurationSec / 60)) : undefined;
};

export const calcProtocolCoefficient = (
  protocol: Protocol | undefined,
  exercises: Exercise[],
  defaults: ActivityDefaults,
  plannedMinutes?: number
) => {
  if (!protocol) return plannedMinutes ? plannedMinutes * defaults.workoutPerMinute : 0;
  let coefficient = 0;
  protocol.steps.forEach(step => {
    const exercise = exercises.find(item => item.id === step.exerciseRef);
    if (step.durationSec) {
      const perMinute = exercise?.activityMetrics?.perMinute ?? defaults.workoutPerMinute;
      coefficient += (step.durationSec / 60) * perMinute;
      return;
    }
    if (exercise?.activityMetrics?.base) {
      coefficient += exercise.activityMetrics.base;
      return;
    }
    if (step.exerciseRef) {
      coefficient += defaults.exerciseBase;
    }
  });
  if (!coefficient && plannedMinutes) {
    return plannedMinutes * defaults.workoutPerMinute;
  }
  return coefficient;
};

export const calcPlannedWorkoutCoefficient = (
  item: WorkoutPlanItem,
  protocol: Protocol | undefined,
  exercises: Exercise[],
  defaults: ActivityDefaults,
  movementActivity?: MovementActivity
) => {
  const plannedMinutes = item.plannedMinutes ?? calcProtocolDurationMinutes(protocol);
  if (item.kind === 'movement' || !item.protocolRef) {
    const perMinute = movementActivity?.activityMetrics?.perMinute ?? defaults.movementPerMinute;
    return plannedMinutes ? plannedMinutes * perMinute : 0;
  }
  return calcProtocolCoefficient(protocol, exercises, defaults, plannedMinutes);
};
