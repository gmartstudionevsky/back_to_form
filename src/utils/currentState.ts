import { LogsState } from '../types';

type CurrentStateSnapshot = {
  autoLevel: number;
  sleepAvgMinutes?: number;
  activityMinutes?: number;
  nutritionCoverage?: number;
  summary: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseDateString = (value: string) => new Date(`${value}T00:00:00.000Z`);

const buildRecentDates = (baseDate: string, days: number) => {
  const base = parseDateString(baseDate);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() - index);
    return date.toISOString().slice(0, 10);
  });
};

const calcSleepDurationMinutes = (bedTime: string, wakeTime: string) => {
  const [bedHour, bedMinute] = bedTime.split(':').map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);
  if (
    Number.isNaN(bedHour) ||
    Number.isNaN(bedMinute) ||
    Number.isNaN(wakeHour) ||
    Number.isNaN(wakeMinute)
  ) {
    return 0;
  }
  const bedMinutes = bedHour * 60 + bedMinute;
  const wakeMinutes = wakeHour * 60 + wakeMinute;
  const diff = wakeMinutes >= bedMinutes ? wakeMinutes - bedMinutes : 24 * 60 - bedMinutes + wakeMinutes;
  return diff;
};

export const calcCurrentStateSnapshot = (
  logs: LogsState,
  baseDate: string
): CurrentStateSnapshot | null => {
  const recentDates = buildRecentDates(baseDate, 7);
  const sleepLogs = logs.sleep.filter(log => recentDates.includes(log.date));
  const sleepDurations = sleepLogs.map(log => calcSleepDurationMinutes(log.bedTime, log.wakeTime));
  const sleepAvgMinutes =
    sleepDurations.length > 0
      ? Math.round(sleepDurations.reduce((sum, value) => sum + value, 0) / sleepDurations.length)
      : undefined;

  const trainingMinutes = logs.training
    .filter(log => recentDates.includes(log.dateTime.slice(0, 10)))
    .reduce((sum, log) => sum + log.minutes, 0);
  const movementMinutes = logs.movementSessions
    .filter(log => recentDates.includes(log.dateTime.slice(0, 10)))
    .reduce((sum, log) => sum + log.durationMinutes, 0);
  const activityMinutes = trainingMinutes + movementMinutes;

  const nutritionDays = logs.foodDays.filter(day => recentDates.includes(day.date));
  const nutritionCoverage = nutritionDays.length / recentDates.length;

  if (!sleepAvgMinutes && activityMinutes === 0 && nutritionDays.length === 0) {
    return null;
  }

  const sleepScore = sleepAvgMinutes ? clamp(sleepAvgMinutes / 450, 0.7, 1.15) : 1;
  const activityScore = clamp(activityMinutes / 150, 0.7, 1.2);
  const nutritionScore = clamp(nutritionCoverage, 0.7, 1.15);

  const levelRaw = 3 + (sleepScore - 1) * 2 + (activityScore - 1) * 2 + (nutritionScore - 1) * 1.5;
  const autoLevel = clamp(Math.round(levelRaw), 1, 5);

  const summaryParts = [
    sleepAvgMinutes ? `сон ${Math.round(sleepAvgMinutes / 60)}ч` : null,
    activityMinutes ? `активность ${activityMinutes} мин` : null,
    nutritionDays.length ? `питание ${Math.round(nutritionCoverage * 100)}%` : null
  ].filter(Boolean);

  return {
    autoLevel,
    sleepAvgMinutes,
    activityMinutes,
    nutritionCoverage,
    summary: summaryParts.length ? summaryParts.join(' · ') : 'Недостаточно данных'
  };
};

export const buildStateSuggestions = (snapshot: CurrentStateSnapshot | null) => {
  if (!snapshot) return [];
  const suggestions: string[] = [];
  if (snapshot.sleepAvgMinutes !== undefined && snapshot.sleepAvgMinutes < 420) {
    suggestions.push('Продлить сон и восстановление');
  }
  if (snapshot.activityMinutes !== undefined && snapshot.activityMinutes < 90) {
    suggestions.push('Добавить ежедневное движение');
  }
  if (snapshot.nutritionCoverage !== undefined && snapshot.nutritionCoverage < 0.6) {
    suggestions.push('Закрыть дневник питания');
  }
  if (snapshot.autoLevel <= 2) {
    suggestions.push('Сделать упор на восстановление');
  }
  return Array.from(new Set(suggestions));
};
