import type { FoodEntry, TimeOfDay } from '../types';

type TimeOfDayRange = {
  label: string;
  start: string;
  end: string;
  defaultTime: string;
};

export const timeOfDayRanges = {
  morning: { label: 'Утро', start: '06:00', end: '10:59', defaultTime: '08:00' },
  day: { label: 'День', start: '11:00', end: '16:59', defaultTime: '13:00' },
  evening: { label: 'Вечер', start: '17:00', end: '22:59', defaultTime: '19:00' }
} satisfies Record<TimeOfDay, TimeOfDayRange>;

export const timeOfDayLabels: Record<TimeOfDay, string> = {
  morning: timeOfDayRanges.morning.label,
  day: timeOfDayRanges.day.label,
  evening: timeOfDayRanges.evening.label
};

export const getTimeOfDayFromTime = (time?: string): TimeOfDay => {
  if (!time) return 'day';
  const [hourRaw] = time.split(':');
  const hour = Number(hourRaw);
  if (Number.isNaN(hour)) return 'day';
  if (hour < 11) return 'morning';
  if (hour < 17) return 'day';
  return 'evening';
};

export const getDefaultTimeForTimeOfDay = (timeOfDay: TimeOfDay) =>
  timeOfDayRanges[timeOfDay].defaultTime;

export const defaultMealTimes: Record<FoodEntry['meal'], string> = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '19:00',
  snack: '16:00'
};

export const getDefaultMealTime = (meal: FoodEntry['meal']) => defaultMealTimes[meal];

export const getTimeOfDayFromDateTime = (dateTime?: string): TimeOfDay => {
  if (!dateTime) return 'day';
  const date = new Date(dateTime);
  if (!Number.isNaN(date.getTime())) {
    const hour = date.getHours();
    if (hour < 11) return 'morning';
    if (hour < 17) return 'day';
    return 'evening';
  }
  return getTimeOfDayFromTime(dateTime.slice(11, 16));
};
