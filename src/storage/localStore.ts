import { AppData, MovementActivity } from '../types';
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
          mealComponents: plan.mealComponents ?? {
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
      if (!parsed.schemaVersion || parsed.schemaVersion < 4) {
        migrated.logs.water = parsed.logs?.water ?? [];
        migrated.planner.dayPlans = (parsed.planner?.dayPlans ?? []).map(plan => ({
          ...plan,
          mealComponents: plan.mealComponents ?? {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: []
          }
        }));
      }
      if (!parsed.schemaVersion || parsed.schemaVersion < 5) {
        const drinks = parsed.logs?.drinks ?? [];
        migrated.logs.drinks =
          drinks.length > 0
            ? drinks
            : (parsed.logs?.water ?? []).map(log => ({
                id: log.id,
                dateTime: log.dateTime,
                drinkId: 'drink-water',
                portionLabel: `${log.amountMl} мл`,
                portionMl: log.amountMl,
                portionsCount: 1
              }));
        migrated.planner.dayPlans = (parsed.planner?.dayPlans ?? []).map(plan => {
          const mealsPlan = plan.mealsPlan ?? {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: []
          };
          const mealComponents = plan.mealComponents ?? {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: []
          };
          const withComponents = (meal: keyof typeof mealsPlan) =>
            mealComponents[meal].length > 0
              ? mealComponents[meal]
              : mealsPlan[meal].map(item => ({
                  id: item.id,
                  type: meal === 'snack' ? 'snack' : 'main',
                  recipeRef: item.kind === 'dish' ? item.refId : undefined,
                  portion: '1 порция',
                  extra: false
                }));
          return {
            ...plan,
            mealComponents: {
              breakfast: withComponents('breakfast'),
              lunch: withComponents('lunch'),
              dinner: withComponents('dinner'),
              snack: withComponents('snack')
            },
            mealTimes: plan.mealTimes ?? {
              breakfast: mealsPlan.breakfast[0]?.plannedTime ?? '',
              lunch: mealsPlan.lunch[0]?.plannedTime ?? '',
              dinner: mealsPlan.dinner[0]?.plannedTime ?? '',
              snack: mealsPlan.snack[0]?.plannedTime ?? ''
            }
          };
        });
      }
      if (!parsed.schemaVersion || parsed.schemaVersion < 6) {
        const existingActivities = (parsed.library as AppData['library'])?.movementActivities ?? [];
        const fallbackActivities: MovementActivity[] = [
          { id: 'move-run', name: 'Бег', kind: 'run' },
          { id: 'move-march', name: 'Ходьба на месте', kind: 'march' },
          { id: 'move-stairs', name: 'Ходьба по лестницам', kind: 'stairs' }
        ];
        const movementActivities =
          existingActivities.length > 0 ? existingActivities : fallbackActivities;
        migrated.library.movementActivities = movementActivities;
        const legacyActivity = (parsed.logs as any)?.activity ?? [];
        const training = legacyActivity.filter(log => log.type === 'workout');
        const movementSessions = legacyActivity
          .filter(log => log.type !== 'workout')
          .map(log => ({
            id: log.id,
            dateTime: log.dateTime,
            activityRef: log.type === 'stairs' ? 'move-stairs' : 'move-march',
            durationMinutes: log.minutes,
            plannedFlights: log.type === 'stairs' ? log.blocks ?? 0 : undefined
          }));
        migrated.logs.training = training;
        migrated.logs.movementSessions = movementSessions;
        migrated.logs.movementDays = parsed.logs?.movementDays ?? [];
      }
      if (!parsed.schemaVersion || parsed.schemaVersion < 7) {
        migrated.planner.dayPlans = (parsed.planner?.dayPlans ?? []).map(plan => ({
          ...plan,
          plannedSteps: plan.plannedSteps ?? undefined
        }));
      }
      if (!parsed.schemaVersion || parsed.schemaVersion < 8) {
        migrated.library.products = (parsed.library?.products ?? []).map(product => ({
          ...product,
          nutritionTags: product.nutritionTags ?? []
        }));
        migrated.library.recipes = (parsed.library?.recipes ?? []).map(recipe => ({
          ...recipe,
          nutritionTags: recipe.nutritionTags ?? []
        }));
        migrated.logs.foodDays = (parsed.logs?.foodDays ?? []).map(day => ({
          ...day,
          entries: day.entries.map(entry => ({
            ...entry,
            nutritionTags:
              entry.nutritionTags ??
              (entry.meal === 'snack'
                ? ['snack']
                : entry.kind === 'cheat'
                  ? ['cheat']
                  : []),
            proteinOverride: entry.proteinOverride ?? undefined,
            fatOverride: entry.fatOverride ?? undefined,
            carbOverride: entry.carbOverride ?? undefined
          }))
        }));
        migrated.planner.dayPlans = (parsed.planner?.dayPlans ?? []).map(plan => ({
          ...plan,
          nutritionTargets:
            plan.nutritionTargets ??
            (plan.requirements?.kcalTarget
              ? { kcal: plan.requirements.kcalTarget }
              : undefined),
          mealsPlan: {
            breakfast: plan.mealsPlan?.breakfast?.map(item => ({
              ...item,
              plannedKcal: item.plannedKcal ?? undefined,
              plannedProtein: item.plannedProtein ?? undefined,
              plannedFat: item.plannedFat ?? undefined,
              plannedCarb: item.plannedCarb ?? undefined,
              nutritionTags:
                item.nutritionTags ?? (item.kind === 'cheat' ? ['cheat'] : undefined)
            })) ?? [],
            lunch: plan.mealsPlan?.lunch?.map(item => ({
              ...item,
              plannedKcal: item.plannedKcal ?? undefined,
              plannedProtein: item.plannedProtein ?? undefined,
              plannedFat: item.plannedFat ?? undefined,
              plannedCarb: item.plannedCarb ?? undefined,
              nutritionTags:
                item.nutritionTags ?? (item.kind === 'cheat' ? ['cheat'] : undefined)
            })) ?? [],
            dinner: plan.mealsPlan?.dinner?.map(item => ({
              ...item,
              plannedKcal: item.plannedKcal ?? undefined,
              plannedProtein: item.plannedProtein ?? undefined,
              plannedFat: item.plannedFat ?? undefined,
              plannedCarb: item.plannedCarb ?? undefined,
              nutritionTags:
                item.nutritionTags ?? (item.kind === 'cheat' ? ['cheat'] : undefined)
            })) ?? [],
            snack: plan.mealsPlan?.snack?.map(item => ({
              ...item,
              plannedKcal: item.plannedKcal ?? undefined,
              plannedProtein: item.plannedProtein ?? undefined,
              plannedFat: item.plannedFat ?? undefined,
              plannedCarb: item.plannedCarb ?? undefined,
              nutritionTags:
                item.nutritionTags ?? (item.kind === 'cheat' ? ['cheat'] : undefined)
            })) ?? []
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
