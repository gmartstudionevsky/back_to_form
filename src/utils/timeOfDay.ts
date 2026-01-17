import { TimeOfDay } from '../types';

export const timeOfDayLabels: Record<TimeOfDay, string> = {
  morning: 'Утро',
  day: 'День',
  evening: 'Вечер'
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
