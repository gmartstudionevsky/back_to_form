import { AppData } from '../types';
import { seedData, schemaVersion } from '../data/seed';

const STORAGE_KEY = 'btf-data';

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures (private mode, quota, etc.)
  }
};

const safeRemoveItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage removal failures.
  }
};

export const loadData = (): AppData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData;
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
      if (!parsed.schemaVersion || parsed.schemaVersion < 3) {
        migrated.library.recipes = (parsed.library?.recipes ?? []).map(recipe => ({
          ...recipe,
          category: recipe.category ?? 'main'
        }));
        migrated.logs.foodDays = (parsed.logs?.foodDays ?? []).map(day => ({
          ...day,
          entries: day.entries.map(entry => ({
            ...entry,
            kind: entry.kind === 'recipe' ? 'dish' : entry.kind,
            meal: entry.meal ?? 'snack'
          }))
        }));
        migrated.planner.dayPlans = (parsed.planner?.dayPlans ?? []).map(plan => ({
          ...plan,
          mealsPlan: plan.mealsPlan ?? {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: []
          },
          workoutsPlan: plan.workoutsPlan ?? [],
          requirements: plan.requirements ?? {
            requireWeight: false,
            requireWaist: false,
            requirePhotos: []
          }
        }));
      }
      return migrated;
    }
    return parsed;
  } catch {
    safeRemoveItem(STORAGE_KEY);
    safeSetItem(STORAGE_KEY, JSON.stringify(seedData));
    return seedData;
  }
};

export const saveData = (data: AppData) => {
  safeSetItem(STORAGE_KEY, JSON.stringify(data));
};

export const resetData = () => {
  safeSetItem(STORAGE_KEY, JSON.stringify(seedData));
};
