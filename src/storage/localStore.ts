import { AppData, MovementActivity } from '../types';
import { seedData, schemaVersion } from '../data/seed';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'btf-data';

const buildLoadMeta = (payload?: string, version?: number) => ({
  storageKey: STORAGE_KEY,
  payloadBytes: payload ? payload.length : 0,
  schemaVersion: version ?? schemaVersion
});

// LocalStorage can fail in private mode or quota pressure, so keep writes resilient.
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
    if (!raw) {
      logger.info('Storage: no cached data, using seed', buildLoadMeta());
      return seedData;
    }
    const parsed = JSON.parse(raw) as AppData;
    // When schema changes, we keep user data and progressively fill new fields.
    if (!parsed.schemaVersion || parsed.schemaVersion !== schemaVersion) {
      logger.info('Storage: schema mismatch, migrating data', buildLoadMeta(raw, parsed.schemaVersion));
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
      if (!parsed.schemaVersion || parsed.schemaVersion < 9) {
        const activityDefaults = seedData.library.activityDefaults;
        migrated.library.activityDefaults =
          migrated.library.activityDefaults ?? parsed.library?.activityDefaults ?? activityDefaults;
        migrated.library.exercises = (migrated.library.exercises ?? parsed.library?.exercises ?? []).map(exercise => ({
          ...exercise,
          activityMetrics:
            exercise.activityMetrics ??
            (activityDefaults
              ? {
                  perMinute: activityDefaults.workoutPerMinute,
                  base: activityDefaults.exerciseBase
                }
              : undefined)
        }));
        migrated.library.movementActivities = (migrated.library.movementActivities ??
          parsed.library?.movementActivities ??
          []).map(
          activity => {
            const seedMatch = seedData.library.movementActivities.find(
              seedActivity => seedActivity.id === activity.id || seedActivity.kind === activity.kind
            );
            return {
              ...activity,
              activityMetrics: activity.activityMetrics ?? seedMatch?.activityMetrics
            };
          }
        );
        migrated.planner.dayPlans = (parsed.planner?.dayPlans ?? []).map(plan => ({
          ...plan,
          activityTargets: plan.activityTargets ?? {}
        }));
      }
      if (!parsed.schemaVersion || parsed.schemaVersion < 10) {
        migrated.library.activityDefaults = {
          ...seedData.library.activityDefaults,
          ...(migrated.library.activityDefaults ?? parsed.library?.activityDefaults ?? {})
        };
        migrated.logs.training = (migrated.logs.training ?? parsed.logs?.training ?? []).map(log => ({
          ...log,
          sets: log.sets ?? undefined,
          reps: log.reps ?? undefined,
          calories: log.calories ?? undefined
        }));
        migrated.logs.movementSessions = (migrated.logs.movementSessions ?? parsed.logs?.movementSessions ?? []).map(log => ({
          ...log,
          steps: log.steps ?? undefined,
          calories: log.calories ?? undefined
        }));
      }
      if (!parsed.schemaVersion || parsed.schemaVersion < 11) {
        migrated.library.products = (migrated.library.products ?? parsed.library?.products ?? []).map(product => ({
          ...product,
          hydrationContribution: product.hydrationContribution ?? false
        }));
        migrated.library.recipes = (migrated.library.recipes ?? parsed.library?.recipes ?? []).map(recipe => ({
          ...recipe,
          hydrationContribution: recipe.hydrationContribution ?? false
        }));
        migrated.library.drinks = (migrated.library.drinks ?? parsed.library?.drinks ?? []).map(drink => ({
          ...drink,
          kcalPer100ml: drink.kcalPer100ml ?? 0,
          proteinPer100ml: drink.proteinPer100ml ?? 0,
          fatPer100ml: drink.fatPer100ml ?? 0,
          carbPer100ml: drink.carbPer100ml ?? 0
        }));
      }
      logger.info('Storage: migration complete', buildLoadMeta(raw, schemaVersion));
      return migrated;
    }
    logger.info('Storage: loaded cached data', buildLoadMeta(raw, parsed.schemaVersion));
    return parsed;
  } catch {
    logger.warn('Storage: failed to parse cached data, resetting', buildLoadMeta());
    safeRemoveItem(STORAGE_KEY);
    safeSetItem(STORAGE_KEY, JSON.stringify(seedData));
    return seedData;
  }
};

export const saveData = (data: AppData) => {
  safeSetItem(STORAGE_KEY, JSON.stringify(data));
  logger.info('Storage: data saved', buildLoadMeta(undefined, data.schemaVersion));
};

export const resetData = () => {
  safeSetItem(STORAGE_KEY, JSON.stringify(seedData));
  logger.info('Storage: data reset to seed', buildLoadMeta());
};
