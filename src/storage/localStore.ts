import { AppData } from '../types';
import { seedData, schemaVersion } from '../data/seed';

const STORAGE_KEY = 'btf-data';

export const loadData = (): AppData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedData;
  try {
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.schemaVersion || parsed.schemaVersion !== schemaVersion) {
      const migrated: AppData = { ...seedData, ...parsed, schemaVersion };
      if (!parsed.schemaVersion || parsed.schemaVersion < 2) {
        migrated.logs.foodDays = (parsed.logs?.foodDays ?? []).map(day => ({
          ...day,
          entries: day.entries.map(entry => ({
            ...entry,
            meal: entry.meal ?? 'snack'
          }))
        }));
      }
      return migrated;
    }
    return parsed;
  } catch {
    return seedData;
  }
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const resetData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
};
