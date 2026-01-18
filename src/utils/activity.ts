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
  (log.reps ?? 0) * defaults.rep;

export const calcMovementSessionCoefficient = (
  log: MovementSessionLog,
  activity: MovementActivity | undefined,
  defaults: ActivityDefaults,
  options: { includeSteps?: boolean; includeCalories?: boolean } = {}
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
  const calories = options.includeCalories ? log.calories ?? 0 : 0;
  return (
    log.durationMinutes * perMinute +
    distance * perKm +
    flights * perFlight +
    steps * perStep +
    calories * perKcal
  );
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export type ActivityCaloriesContext = {
  weightKg?: number;
  intakeKcal?: number;
  activityCoefficient?: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  bodyWaterPercent?: number;
};

const calcAdjustedCalories = (
  coefficient: number,
  perKcal: number,
  context: ActivityCaloriesContext = {}
) => {
  if (!perKcal || coefficient <= 0) return 0;
  const baseCalories = coefficient / perKcal;
  const weightFactor = context.weightKg
    ? clamp(context.weightKg / 70, 0.7, 1.3)
    : 1;
  const intakeFactor = context.intakeKcal
    ? clamp(context.intakeKcal / 2000, 0.85, 1.15)
    : 1;
  const activityFactor = context.activityCoefficient
    ? clamp(1 + context.activityCoefficient * 0.05, 0.9, 1.2)
    : 1;
  const bodyFatFactor =
    context.bodyFatPercent !== undefined
      ? clamp(1 - (context.bodyFatPercent - 20) * 0.003, 0.9, 1.1)
      : 1;
  const muscleMassFactor =
    context.muscleMassKg !== undefined
      ? clamp(1 + (context.muscleMassKg - 30) * 0.002, 0.9, 1.1)
      : 1;
  const bodyWaterFactor =
    context.bodyWaterPercent !== undefined
      ? clamp(1 + (context.bodyWaterPercent - 55) * 0.002, 0.95, 1.05)
      : 1;
  return Math.max(
    0,
    Math.round(
      baseCalories *
        weightFactor *
        intakeFactor *
        activityFactor *
        bodyFatFactor *
        muscleMassFactor *
        bodyWaterFactor
    )
  );
};

export const calcTrainingActivityMetrics = (
  log: ActivityLog,
  defaults: ActivityDefaults,
  context: ActivityCaloriesContext = {}
) => {
  const coefficient = calcTrainingLogCoefficient(log, defaults);
  const calories = calcAdjustedCalories(coefficient, defaults.kcal, context);
  return { coefficient, calories };
};

export const calcMovementActivityMetrics = (
  log: MovementSessionLog,
  activity: MovementActivity | undefined,
  defaults: ActivityDefaults,
  context: ActivityCaloriesContext = {},
  options: { includeSteps?: boolean } = {}
) => {
  const coefficient = calcMovementSessionCoefficient(log, activity, defaults, {
    includeSteps: options.includeSteps
  });
  const perKcal = activity?.activityMetrics?.perKcal ?? defaults.kcal;
  const calories = calcAdjustedCalories(coefficient, perKcal, context);
  return { coefficient, calories };
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
