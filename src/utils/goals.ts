import { ProfileGoal, ProfileGoalKind } from '../types';

export const goalKindLabels: Record<ProfileGoalKind, string> = {
  lose_weight: 'Снижение веса',
  gain_muscle: 'Набор мышц',
  maintain: 'Поддержание формы',
  endurance: 'Выносливость',
  health: 'Здоровье',
  custom: 'Пользовательская цель'
};

const goalSuggestionsByKind: Record<ProfileGoalKind, string[]> = {
  lose_weight: ['Увеличить ежедневную активность', 'Умерить жиры и быстрые углеводы', 'Следить за дефицитом'],
  gain_muscle: ['Добавить силовые тренировки', 'Поднять потребление белка', 'Контролировать прогрессию'],
  maintain: ['Стабилизировать режим питания', 'Поддерживать текущую активность', 'Следить за восстановлением'],
  endurance: ['Повысить объём кардио', 'Добавить интервальные нагрузки', 'Контролировать пульс'],
  health: ['Стабилизировать сон', 'Поддерживать гидратацию', 'Добавить ежедневную ходьбу'],
  custom: ['Поддерживать регулярность', 'Следить за восстановлением', 'Фиксировать прогресс']
};

export const buildGoalSuggestions = (goals: ProfileGoal[]) => {
  const suggestions: string[] = [];
  goals.forEach(goal => {
    goalSuggestionsByKind[goal.kind].forEach(item => suggestions.push(item));
  });
  return Array.from(new Set(suggestions)).slice(0, 5);
};

type GoalSignals = {
  kcalMultiplier: number;
  proteinMultiplier: number;
  fatRatio: number;
  carbRatio: number;
  trainingMinutes: number;
  movementMinutes: number;
  stepsTarget: number;
};

const applyGoalKind = (signals: GoalSignals, kind: ProfileGoalKind) => {
  switch (kind) {
    case 'lose_weight':
      return {
        ...signals,
        kcalMultiplier: signals.kcalMultiplier * 0.9,
        movementMinutes: signals.movementMinutes + 10,
        stepsTarget: signals.stepsTarget + 2000,
        fatRatio: Math.max(0.2, signals.fatRatio - 0.03),
        carbRatio: Math.max(0.35, signals.carbRatio - 0.05)
      };
    case 'gain_muscle':
      return {
        ...signals,
        kcalMultiplier: signals.kcalMultiplier * 1.08,
        proteinMultiplier: signals.proteinMultiplier * 1.15,
        trainingMinutes: signals.trainingMinutes + 10,
        carbRatio: Math.min(0.5, signals.carbRatio + 0.03)
      };
    case 'endurance':
      return {
        ...signals,
        movementMinutes: signals.movementMinutes + 15,
        stepsTarget: signals.stepsTarget + 3000,
        carbRatio: Math.min(0.5, signals.carbRatio + 0.03)
      };
    case 'health':
      return {
        ...signals,
        movementMinutes: signals.movementMinutes + 5,
        stepsTarget: signals.stepsTarget + 1000
      };
    case 'maintain':
    case 'custom':
    default:
      return signals;
  }
};

const applyGoalText = (signals: GoalSignals, text: string) => {
  const normalized = text.toLowerCase();
  let next = { ...signals };
  if (normalized.includes('набор')) {
    next = applyGoalKind(next, 'gain_muscle');
  }
  if (normalized.includes('снижен') || normalized.includes('сброс') || normalized.includes('минус')) {
    next = applyGoalKind(next, 'lose_weight');
  }
  if (normalized.includes('сил')) {
    next = { ...next, trainingMinutes: next.trainingMinutes + 8 };
  }
  if (normalized.includes('движ') || normalized.includes('актив')) {
    next = {
      ...next,
      movementMinutes: next.movementMinutes + 8,
      stepsTarget: next.stepsTarget + 1500
    };
  }
  if (normalized.includes('белк')) {
    next = { ...next, proteinMultiplier: next.proteinMultiplier * 1.1 };
  }
  return next;
};

export const buildGoalSignals = (
  goals: ProfileGoal[],
  goalTexts: string[] = []
): GoalSignals => {
  let signals: GoalSignals = {
    kcalMultiplier: 1,
    proteinMultiplier: 1,
    fatRatio: 0.25,
    carbRatio: 0.45,
    trainingMinutes: 25,
    movementMinutes: 20,
    stepsTarget: 8000
  };
  goals.forEach(goal => {
    signals = applyGoalKind(signals, goal.kind);
  });
  goalTexts.forEach(text => {
    signals = applyGoalText(signals, text);
  });
  return {
    ...signals,
    kcalMultiplier: Math.max(0.8, Math.min(1.2, signals.kcalMultiplier)),
    proteinMultiplier: Math.max(0.9, Math.min(1.3, signals.proteinMultiplier)),
    fatRatio: Math.max(0.18, Math.min(0.3, signals.fatRatio)),
    carbRatio: Math.max(0.3, Math.min(0.5, signals.carbRatio))
  };
};
