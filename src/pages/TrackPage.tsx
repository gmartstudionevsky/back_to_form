import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { calcFoodEntry, calcMealPlanItem, resolveProductGrams } from '../utils/nutrition';
import { combineDateTime, currentTimeString, todayISO } from '../utils/date';
import { getTimeOfDayFromDateTime, timeOfDayLabels } from '../utils/timeOfDay';
import {
  calcMovementActivityMetrics,
  calcStepsCoefficient,
  calcTrainingActivityMetrics,
  resolveActivityDefaults
} from '../utils/activity';
import {
  ActivityLog,
  DrinkLog,
  FoodEntry,
  NutritionTag,
  SleepLog,
  SmokingLog,
  WaistLog,
  WeightLog,
  MovementSessionLog
} from '../types';

const tabs = ['Питание', 'Активность', 'Здоровье'] as const;

type Tab = (typeof tabs)[number];

type FoodDraft = FoodEntry & {
  date: string;
  kcalOverrideText?: string;
  proteinOverrideText?: string;
  fatOverrideText?: string;
  carbOverrideText?: string;
  portionMode?: 'grams' | 'pieces';
};

const mealLabels: Record<FoodEntry['meal'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const nutritionTagLabels: Record<NutritionTag, string> = {
  snack: 'Перекус',
  cheat: 'Читмил',
  healthy: 'Правильное питание'
};

const TrackPage = () => {
  const {
    data,
    addFoodEntry,
    updateFoodEntry,
    deleteFoodEntry,
    addTrainingLog,
    updateTrainingLog,
    deleteTrainingLog,
    addMovementSessionLog,
    updateMovementSessionLog,
    deleteMovementSessionLog,
    setMovementDayLog,
    addSmokingLog,
    updateSmokingLog,
    deleteSmokingLog,
    addDrinkLog,
    updateDrinkLog,
    deleteDrinkLog,
    addWeightLog,
    updateWeightLog,
    deleteWeightLog,
    addWaistLog,
    updateWaistLog,
    deleteWaistLog,
    addSleepLog,
    updateSleepLog,
    deleteSleepLog
  } = useAppStore();
  const [active, setActive] = useState<Tab>('Питание');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [foodSheet, setFoodSheet] = useState<FoodDraft | null>(null);
  const [foodQuery, setFoodQuery] = useState('');
  const [trainingDraft, setTrainingDraft] = useState<ActivityLog | null>(null);
  const [movementDraft, setMovementDraft] = useState<MovementSessionLog | null>(null);
  const [smokingDraft, setSmokingDraft] = useState<SmokingLog | null>(null);
  const [weightDraft, setWeightDraft] = useState<WeightLog | null>(null);
  const [waistDraft, setWaistDraft] = useState<WaistLog | null>(null);
  const [sleepDraft, setSleepDraft] = useState<SleepLog | null>(null);
  const [drinkDraft, setDrinkDraft] = useState<DrinkLog | null>(null);
  const [movementSteps, setMovementSteps] = useState(0);
  const isReadOnly = true;
  const defaultDrink = useMemo(
    () => data.library.drinks.find(item => item.id === 'drink-water') ?? data.library.drinks[0],
    [data.library.drinks]
  );
  const [drinkForm, setDrinkForm] = useState(() => ({
    drinkId: defaultDrink?.id ?? '',
    portionLabel: defaultDrink?.portions[0]?.label ?? '',
    portionMl: defaultDrink?.portions[0]?.ml ?? 0,
    portionsCount: 1,
    time: currentTimeString()
  }));
  const sheetProduct =
    foodSheet?.kind === 'product'
      ? data.library.products.find(product => product.id === foodSheet.refId)
      : undefined;
  const sheetProductSupportsPieces = Boolean(sheetProduct?.pieceGrams);
  const sheetPieceLabel = sheetProduct?.pieceLabel ?? 'шт.';

  const dayPlan = data.planner.dayPlans.find(plan => plan.date === selectedDate);
  const foodDay = data.logs.foodDays.find(day => day.date === selectedDate);
  const drinkLogs = data.logs.drinks.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const drinkTotalMl = drinkLogs.reduce(
    (sum, log) => sum + log.portionMl * log.portionsCount,
    0
  );
  const drinkHydrationMl = drinkLogs.reduce((sum, log) => {
    const drink = data.library.drinks.find(item => item.id === log.drinkId);
    const factor = drink?.hydrationFactor ?? 1;
    return sum + log.portionMl * log.portionsCount * factor;
  }, 0);
  const foodHydrationMl = (foodDay?.entries ?? []).reduce((sum, entry) => {
    if (entry.kind === 'product' && entry.refId) {
      const product = data.library.products.find(item => item.id === entry.refId);
      if (!product?.hydrationContribution) return sum;
      const grams = resolveProductGrams(product, entry.grams, entry.pieces);
      return sum + grams;
    }
    if (entry.kind === 'dish' && entry.refId) {
      const recipe = data.library.recipes.find(item => item.id === entry.refId);
      if (!recipe?.hydrationContribution) return sum;
      const totalGrams = recipe.ingredients.reduce(
        (recipeSum, ingredient) => recipeSum + ingredient.grams,
        0
      );
      if (!totalGrams || !recipe.servings) return sum;
      const servings = entry.servings ?? 1;
      return sum + (totalGrams / recipe.servings) * servings;
    }
    return sum;
  }, 0);
  const hydrationEquivalent = drinkHydrationMl + foodHydrationMl;
  const drinkNutritionTotals = useMemo(() => {
    return drinkLogs.reduce(
      (acc, log) => {
        const drink = data.library.drinks.find(item => item.id === log.drinkId);
        const factor = (log.portionMl * log.portionsCount) / 100;
        return {
          kcal: acc.kcal + (drink?.kcalPer100ml ?? 0) * factor,
          protein: acc.protein + (drink?.proteinPer100ml ?? 0) * factor,
          fat: acc.fat + (drink?.fatPer100ml ?? 0) * factor,
          carb: acc.carb + (drink?.carbPer100ml ?? 0) * factor
        };
      },
      { kcal: 0, protein: 0, fat: 0, carb: 0 }
    );
  }, [drinkLogs, data.library.drinks]);
  const totals = useMemo(() => {
    const entries = foodDay?.entries ?? [];
    const foodTotals = entries.reduce(
      (acc, entry) => {
        const macro = calcFoodEntry(entry, data.library);
        return {
          kcal: acc.kcal + macro.kcal,
          protein: acc.protein + macro.protein,
          fat: acc.fat + macro.fat,
          carb: acc.carb + macro.carb
        };
      },
      { kcal: 0, protein: 0, fat: 0, carb: 0 }
    );
    return {
      kcal: foodTotals.kcal + drinkNutritionTotals.kcal,
      protein: foodTotals.protein + drinkNutritionTotals.protein,
      fat: foodTotals.fat + drinkNutritionTotals.fat,
      carb: foodTotals.carb + drinkNutritionTotals.carb
    };
  }, [foodDay, data.library, drinkNutritionTotals]);

  const plannedMeals = dayPlan?.mealsPlan;
  const plannedMealItems = plannedMeals ? Object.values(plannedMeals).flat() : [];
  const plannedTotals = plannedMealItems.reduce(
    (sum, item) => {
      const nutrition = calcMealPlanItem(item, data.library);
      return {
        kcal: sum.kcal + nutrition.kcal,
        protein: sum.protein + nutrition.protein,
        fat: sum.fat + nutrition.fat,
        carb: sum.carb + nutrition.carb
      };
    },
    { kcal: 0, protein: 0, fat: 0, carb: 0 }
  );
  const plannedDone = plannedMealItems.filter(item => item.completed).length;
  const plannedCompletion = plannedMealItems.length
    ? Math.round((plannedDone / plannedMealItems.length) * 100)
    : 0;

  const groupedFood = useMemo(() => {
    const entries = foodDay?.entries ?? [];
    const groups = new Map<FoodEntry['meal'], FoodEntry[]>();
    entries.forEach(entry => {
      const key = entry.meal;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(entry);
    });
    groups.forEach(value => value.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')));
    const order: FoodEntry['meal'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
    return order
      .filter(meal => groups.has(meal))
      .map(meal => [meal, groups.get(meal) ?? []] as [FoodEntry['meal'], FoodEntry[]]);
  }, [foodDay]);

  const trainingLogs = data.logs.training.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const smokingLogs = data.logs.smoking.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const weightLogs = data.logs.weight.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const waistLogs = data.logs.waist.filter(log => log.date === selectedDate);
  const sleepLogs = data.logs.sleep.filter(log => log.date === selectedDate);

  const toDateTime = (date: string, time?: string) => combineDateTime(date, time);

  const resolveWeightForDateTime = (dateTime: string) =>
    data.logs.weight
      .filter(log => log.dateTime <= dateTime)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      .slice(-1)[0]?.weightKg;

  const renderNutritionTags = (tags?: NutritionTag[]) => {
    if (!tags?.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-slate-500">
        {tags.map(tag => (
          <span key={tag} className="badge">
            {nutritionTagLabels[tag]}
          </span>
        ))}
      </div>
    );
  };

  const movementDay = data.logs.movementDays.find(day => day.date === selectedDate);
  const movementSessions = data.logs.movementSessions.filter(
    log => log.dateTime.slice(0, 10) === selectedDate
  );
  const activityDefaults = resolveActivityDefaults(data.library.activityDefaults);
  const resolveTrainingProtocol = (log: ActivityLog) =>
    log.protocolRef
      ? data.library.protocols.find(item => item.id === log.protocolRef)
      : undefined;

  const activityCoefficient = [
    trainingLogs.reduce((sum, log) => {
      const protocol = resolveTrainingProtocol(log);
      return (
        sum +
        calcTrainingActivityMetrics(log, activityDefaults, {}, {
          protocol,
          exercises: data.library.exercises
        }).coefficient
      );
    }, 0),
    movementSessions.reduce((sum, log) => {
      const activity = data.library.movementActivities.find(item => item.id === log.activityRef);
      return (
        sum +
        calcMovementActivityMetrics(log, activity, activityDefaults, {}, {
          includeSteps: !movementDay?.steps
        }).coefficient
      );
    }, 0),
    calcStepsCoefficient(movementDay?.steps ?? 0, activityDefaults)
  ].reduce((sum, value) => sum + value, 0);
  const hydrationWeight = data.logs.weight
    .filter(log => log.dateTime.slice(0, 10) <= selectedDate)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .slice(-1)[0]?.weightKg;
  const hydrationBasePerKg = 30;
  const hydrationActivityBonus = 400;
  const hydrationTargetMl =
    hydrationWeight !== undefined
      ? hydrationWeight * hydrationBasePerKg + activityCoefficient * hydrationActivityBonus
      : undefined;
  const hydrationCoefficient = hydrationTargetMl ? hydrationEquivalent / hydrationTargetMl : 0;
  const defaultMovementActivityId = data.library.movementActivities[0]?.id ?? '';

  const activityContext = {
    weightKg: resolveWeightForDateTime(toDateTime(selectedDate)),
    intakeKcal: totals.kcal,
    activityCoefficient
  };

  const estimateTraining = (log: {
    minutes: number;
    sets?: number;
    reps?: number;
    protocolRef?: string;
  }) =>
    calcTrainingActivityMetrics(log as ActivityLog, activityDefaults, activityContext, {
      protocol: log.protocolRef
        ? data.library.protocols.find(item => item.id === log.protocolRef)
        : undefined,
      exercises: data.library.exercises
    }).calories;

  const estimateMovement = (log: MovementSessionLog) => {
    const activity = data.library.movementActivities.find(item => item.id === log.activityRef);
    return calcMovementActivityMetrics(log, activity, activityDefaults, {
      ...activityContext,
      weightKg: resolveWeightForDateTime(log.dateTime)
    }).calories;
  };

  useEffect(() => {
    setMovementSteps(movementDay?.steps ?? 0);
  }, [movementDay?.steps, selectedDate]);

  useEffect(() => {
    if (!defaultDrink) return;
    setDrinkForm(prev => {
      if (prev.drinkId && data.library.drinks.find(item => item.id === prev.drinkId)) {
        return prev;
      }
      const portion = defaultDrink.portions[0];
      return {
        drinkId: defaultDrink.id,
        portionLabel: portion?.label ?? '',
        portionMl: portion?.ml ?? 0,
        portionsCount: 1,
        time: currentTimeString()
      };
    });
  }, [defaultDrink, data.library.drinks]);

  const getHydrationStatus = (actual: number, target?: number) => {
    if (!target) {
      return { label: 'Цель не задана', tone: 'text-slate-400' };
    }
    const ratio = actual / target;
    if (ratio < 0.6) return { label: 'Недобор', tone: 'text-rose-500' };
    if (ratio < 0.9) return { label: 'Почти', tone: 'text-amber-500' };
    if (ratio <= 1.1) return { label: 'В норме', tone: 'text-emerald-500' };
    return { label: 'Перебор', tone: 'text-sky-500' };
  };

  const parseTimeToMinutes = (time?: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const formatMinutes = (minutes?: number | null) => {
    if (!minutes && minutes !== 0) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const calcSleepDuration = (log: SleepLog) => {
    const bed = parseTimeToMinutes(log.bedTime);
    const wake = parseTimeToMinutes(log.wakeTime);
    if (bed === null || wake === null) return null;
    let duration = wake - bed;
    if (duration <= 0) duration += 24 * 60;
    return duration;
  };

  const sleepHistory = useMemo(
    () =>
      data.logs.sleep
        .filter(log => log.date <= selectedDate)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.logs.sleep, selectedDate]
  );
  const recentSleep = sleepHistory.slice(0, 7);
  const sleepDurations = recentSleep
    .map(log => calcSleepDuration(log))
    .filter((value): value is number => value !== null);
  const avgSleepMinutes = sleepDurations.length
    ? Math.round(sleepDurations.reduce((sum, value) => sum + value, 0) / sleepDurations.length)
    : undefined;
  const anchorRate = recentSleep.length
    ? Math.round(
        (recentSleep.filter(log => log.anchorMet).length / recentSleep.length) * 100
      )
    : undefined;

  const openNewFood = () => {
    setFoodSheet({
      id: '',
      date: selectedDate,
      meal: 'breakfast',
      kind: 'dish',
      refId: '',
      grams: 120,
      pieces: 1,
      portionMode: 'grams',
      servings: 1,
      portionLabel: '',
      time: currentTimeString(),
      title: '',
      kcalOverrideText: '',
      proteinOverrideText: '',
      fatOverrideText: '',
      carbOverrideText: '',
      cheatCategory: 'pizza',
      nutritionTags: []
    });
  };

  const resolveFoodTags = (draft: FoodDraft) => {
    const tags = draft.nutritionTags?.length ? [...draft.nutritionTags] : [];
    if (draft.kind === 'product' && draft.refId) {
      const product = data.library.products.find(item => item.id === draft.refId);
      if (product?.nutritionTags?.length) {
        tags.push(...product.nutritionTags);
      }
    }
    if (draft.kind === 'dish' && draft.refId) {
      const recipe = data.library.recipes.find(item => item.id === draft.refId);
      if (recipe?.nutritionTags?.length) {
        tags.push(...recipe.nutritionTags);
      }
    }
    if (draft.kind === 'cheat') {
      tags.push('cheat');
    }
    if (draft.meal === 'snack') {
      tags.push('snack');
    }
    return Array.from(new Set(tags));
  };

  const toggleFoodTag = (tag: NutritionTag) => {
    setFoodSheet(prev => {
      if (!prev) return prev;
      const tags = prev.nutritionTags ?? [];
      return {
        ...prev,
        nutritionTags: tags.includes(tag) ? tags.filter(item => item !== tag) : [...tags, tag]
      };
    });
  };

  const saveFood = () => {
    if (!foodSheet) return;
    const payload: FoodEntry = {
      id: foodSheet.id,
      kind: foodSheet.kind,
      refId: foodSheet.refId || undefined,
      grams:
        foodSheet.kind === 'product' && foodSheet.portionMode === 'grams'
          ? foodSheet.grams
          : undefined,
      pieces:
        foodSheet.kind === 'product' && foodSheet.portionMode === 'pieces'
          ? foodSheet.pieces
          : undefined,
      servings: foodSheet.kind === 'dish' ? foodSheet.servings : undefined,
      portionLabel: foodSheet.kind === 'dish' ? foodSheet.portionLabel : undefined,
      meal: foodSheet.meal,
      time: foodSheet.time || undefined,
      title: foodSheet.kind === 'free' || foodSheet.kind === 'cheat' ? foodSheet.title : undefined,
      kcalOverride:
        (foodSheet.kind === 'free' || foodSheet.kind === 'cheat') && foodSheet.kcalOverrideText
          ? Number(foodSheet.kcalOverrideText)
          : undefined,
      proteinOverride:
        (foodSheet.kind === 'free' || foodSheet.kind === 'cheat') && foodSheet.proteinOverrideText
          ? Number(foodSheet.proteinOverrideText)
          : undefined,
      fatOverride:
        (foodSheet.kind === 'free' || foodSheet.kind === 'cheat') && foodSheet.fatOverrideText
          ? Number(foodSheet.fatOverrideText)
          : undefined,
      carbOverride:
        (foodSheet.kind === 'free' || foodSheet.kind === 'cheat') && foodSheet.carbOverrideText
          ? Number(foodSheet.carbOverrideText)
          : undefined,
      notes: foodSheet.notes,
      cheatCategory: foodSheet.kind === 'cheat' ? foodSheet.cheatCategory : undefined,
      nutritionTags: resolveFoodTags(foodSheet)
    };
    if (foodSheet.id) {
      updateFoodEntry(foodSheet.date, payload);
    } else {
      addFoodEntry(foodSheet.date, payload);
    }
    setFoodSheet(null);
  };

  const openTraining = (log?: ActivityLog) => {
    setTrainingDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate),
        type: 'workout',
        minutes: 45,
        sets: 0,
        reps: 0,
        timeOfDay: getTimeOfDayFromDateTime(new Date().toISOString())
      }
    );
  };

  const saveTraining = () => {
    if (!trainingDraft) return;
    const payload = {
      ...trainingDraft,
      sets: trainingDraft.sets || undefined,
      reps: trainingDraft.reps || undefined,
      calories: estimateTraining(trainingDraft) || undefined,
      timeOfDay: getTimeOfDayFromDateTime(trainingDraft.dateTime)
    };
    if (trainingDraft.id) {
      updateTrainingLog(payload);
    } else {
      addTrainingLog(payload);
    }
    setTrainingDraft(null);
  };

  const openMovement = (log?: MovementSessionLog) => {
    const activityRef = log?.activityRef ?? defaultMovementActivityId ?? '';
    setMovementDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate),
        activityRef,
        durationMinutes: 20,
        steps: 0,
        plannedFlights: 10,
        timeOfDay: getTimeOfDayFromDateTime(new Date().toISOString())
      }
    );
  };

  const saveMovement = () => {
    if (!movementDraft) return;
    const payload = {
      ...movementDraft,
      steps: movementDraft.steps || undefined,
      calories: estimateMovement(movementDraft) || undefined,
      timeOfDay: getTimeOfDayFromDateTime(movementDraft.dateTime)
    };
    if (movementDraft.id) {
      updateMovementSessionLog(payload);
    } else {
      addMovementSessionLog(payload);
    }
    setMovementDraft(null);
  };

  const openSmoking = (log?: SmokingLog) => {
    setSmokingDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate),
        count: 1,
        trigger: 'стресс',
        stressLevel1to5: 3,
        ruleApplied: false
      }
    );
  };

  const saveSmoking = () => {
    if (!smokingDraft) return;
    const payload = { ...smokingDraft };
    if (smokingDraft.id) {
      updateSmokingLog(payload);
    } else {
      addSmokingLog(payload);
    }
    setSmokingDraft(null);
  };

  const openWeight = (log?: WeightLog) => {
    setWeightDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate),
        weightKg: 72
      }
    );
  };

  const saveWeight = () => {
    if (!weightDraft) return;
    const payload = { ...weightDraft };
    if (weightDraft.id) {
      updateWeightLog(payload);
    } else {
      addWeightLog(payload);
    }
    setWeightDraft(null);
  };

  const openWaist = (log?: WaistLog) => {
    setWaistDraft(
      log ?? {
        id: '',
        date: selectedDate,
        waistCm: 80
      }
    );
  };

  const saveWaist = () => {
    if (!waistDraft) return;
    const payload = { ...waistDraft };
    if (waistDraft.id) {
      updateWaistLog(payload);
    } else {
      addWaistLog(payload);
    }
    setWaistDraft(null);
  };

  const openSleep = (log?: SleepLog) => {
    setSleepDraft(
      log ?? {
        id: '',
        date: selectedDate,
        wakeTime: '07:30',
        bedTime: '23:00',
        anchorMet: false,
        quality1to5: 3,
        notes: ''
      }
    );
  };

  const saveSleep = () => {
    if (!sleepDraft) return;
    const payload = { ...sleepDraft };
    if (sleepDraft.id) {
      updateSleepLog(payload);
    } else {
      addSleepLog(payload);
    }
    setSleepDraft(null);
  };

  const openDrink = (log?: DrinkLog) => {
    const drink = data.library.drinks.find(item => item.id === log?.drinkId) ?? defaultDrink;
    const portion = drink?.portions[0];
    setDrinkDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate, currentTimeString()),
        drinkId: drink?.id ?? '',
        portionLabel: portion?.label ?? '',
        portionMl: portion?.ml ?? 0,
        portionsCount: 1
      }
    );
  };

  const saveDrink = () => {
    if (!drinkDraft) return;
    const payload = { ...drinkDraft };
    if (drinkDraft.id) {
      updateDrinkLog(payload);
    } else {
      addDrinkLog(payload);
    }
    setDrinkDraft(null);
  };

  const filteredProducts = data.library.products.filter(product =>
    product.name.toLowerCase().includes(foodQuery.toLowerCase())
  );
  const filteredDishes = data.library.recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(foodQuery.toLowerCase())
  );

  const plannedWorkouts = dayPlan?.workoutsPlan ?? [];
  const plannedWorkoutCount = plannedWorkouts.filter(
    item => item.kind === 'workout' || item.protocolRef
  ).length;
  const plannedMovementMinutes = plannedWorkouts
    .filter(item => item.kind === 'movement')
    .reduce((sum, item) => sum + (item.plannedMinutes ?? 0), 0);
  const completedWorkoutCount = plannedWorkouts.filter(item => item.completed).length;
  const actualWorkoutCount = trainingLogs.length;
  const actualMovementMinutes = movementSessions.reduce(
    (sum, log) => sum + log.durationMinutes,
    0
  );
  const dayOptions = useMemo(() => {
    const base = new Date(todayISO());
    const options = Array.from({ length: 10 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() - index);
      return date.toISOString().slice(0, 10);
    });
    if (!options.includes(selectedDate)) {
      options.unshift(selectedDate);
    }
    return options;
  }, [selectedDate]);

  const formatDayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Архив дня</h1>
        <p className="text-sm text-slate-500">
          Детальная статистика за выбранный день без ввода данных.
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                active === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setActive(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {dayOptions.map(date => (
            <button
              key={date}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                selectedDate === date ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => setSelectedDate(date)}
            >
              {formatDayLabel(date)}
            </button>
          ))}
        </div>
        <Link className="btn-secondary w-full sm:w-auto" to="/">
          Внести показатели в разделе «Сегодня»
        </Link>
      </div>

      {active === 'Питание' && (
        <div className="space-y-3">
          <div className="card p-4">
            <h2 className="section-title">План vs факт</h2>
            <p className="mt-2 text-sm text-slate-600">
              План: {plannedTotals.kcal.toFixed(0)} ккал · Б {plannedTotals.protein.toFixed(0)} /
              Ж {plannedTotals.fat.toFixed(0)} / У {plannedTotals.carb.toFixed(0)}
            </p>
            <p className="text-xs text-slate-500">
              Выполнено: {plannedDone}/{plannedMealItems.length} ({plannedCompletion}%)
            </p>
          </div>
          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Итог дня</h2>
              {!isReadOnly && (
                <button className="btn-primary w-full sm:w-auto" onClick={openNewFood}>
                  Добавить запись
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Калории: {totals.kcal.toFixed(0)} | Б: {totals.protein.toFixed(1)} г | Ж:{' '}
              {totals.fat.toFixed(1)} г | У: {totals.carb.toFixed(1)} г
            </p>
          </div>
          {groupedFood.length === 0 ? (
            <div className="card p-4 text-sm text-slate-500">Записей нет.</div>
          ) : (
            groupedFood.map(([meal, entries]) => (
              <div key={meal} className="card p-4">
                <h3 className="text-sm font-semibold text-slate-500">{mealLabels[meal]}</h3>
                <div className="mt-3 space-y-2">
                  {entries.map(entry => {
                    const product =
                      entry.kind === 'product'
                        ? data.library.products.find(prod => prod.id === entry.refId)
                        : undefined;
                    const recipe =
                      entry.kind === 'dish'
                        ? data.library.recipes.find(rec => rec.id === entry.refId)
                        : undefined;
                    const pieceLabel = product?.pieceLabel ?? 'шт.';
                    const infoParts = [
                      entry.time,
                      entry.grams ? `${entry.grams} г` : '',
                      entry.pieces ? `${entry.pieces} ${pieceLabel}` : '',
                      entry.portionLabel
                        ? entry.portionLabel
                        : entry.servings
                        ? `${entry.servings} порц.`
                        : '',
                      entry.kcalOverride ? `${entry.kcalOverride} ккал` : ''
                    ].filter(Boolean);
                    return (
                      <div key={entry.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              {entry.kind === 'product'
                                ? product?.name
                                : entry.kind === 'dish'
                                ? recipe?.name
                                : entry.title ||
                                  (entry.kind === 'cheat' ? 'Читмил' : 'Свободная запись')}
                            </p>
                            <p className="text-xs text-slate-500">
                              {infoParts.length > 0 ? infoParts.join(' · ') : '—'}
                            </p>
                            {renderNutritionTags(entry.nutritionTags)}
                          </div>
                          {!isReadOnly && (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                className="btn-secondary w-full sm:w-auto"
                                onClick={() =>
                                  setFoodSheet({
                                    ...entry,
                                    date: selectedDate,
                                    kcalOverrideText: entry.kcalOverride?.toString() ?? '',
                                    proteinOverrideText: entry.proteinOverride?.toString() ?? '',
                                    fatOverrideText: entry.fatOverride?.toString() ?? '',
                                    carbOverrideText: entry.carbOverride?.toString() ?? '',
                                    portionMode: entry.pieces ? 'pieces' : 'grams'
                                  })
                                }
                              >
                                Изменить
                              </button>
                              <button
                                className="btn-secondary w-full text-red-500 sm:w-auto"
                                onClick={() => deleteFoodEntry(selectedDate, entry.id)}
                              >
                                Удалить
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {active === 'Активность' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">
                Итог активности: {trainingLogs.reduce((sum, log) => sum + log.minutes, 0)} мин
              </h2>
              {!isReadOnly && (
                <button className="btn-primary w-full sm:w-auto" onClick={() => openTraining()}>
                  Добавить тренировку
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              План: тренировки {plannedWorkoutCount}, движение {plannedMovementMinutes} мин
            </p>
            <p className="text-xs text-slate-500">
              Факт: тренировки {actualWorkoutCount}, движение {actualMovementMinutes} мин ·
              Закрыто по плану: {completedWorkoutCount}
            </p>
          </div>

          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-slate-500">Тренировки</h3>
              {!isReadOnly && (
                <button className="btn-secondary w-full sm:w-auto" onClick={() => openTraining()}>
                  Добавить
                </button>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {trainingLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Записей нет.</p>
              ) : (
                trainingLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          Тренировка · {log.minutes} мин
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(log.dateTime).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}{' '}
                          · {timeOfDayLabels[log.timeOfDay ?? getTimeOfDayFromDateTime(log.dateTime)]}
                        </p>
                      </div>
                      {!isReadOnly && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            className="btn-secondary w-full sm:w-auto"
                            onClick={() => openTraining(log)}
                          >
                            Изменить
                          </button>
                          <button
                            className="btn-secondary w-full text-red-500 sm:w-auto"
                            onClick={() => deleteTrainingLog(log.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card space-y-4 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-slate-500">Движение</h3>
              {!isReadOnly && (
                <button className="btn-secondary w-full sm:w-auto" onClick={() => openMovement()}>
                  Добавить вручную
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Шаги за день</p>
                  <p className="text-xs text-slate-500">Факт: {movementSteps} шагов</p>
                </div>
                {!isReadOnly && (
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={() => setMovementDayLog({ date: selectedDate, steps: movementSteps })}
                  >
                    Сохранить шаги
                  </button>
                )}
              </div>
              {!isReadOnly && (
                <>
                  <input
                    type="number"
                    className="input mt-2"
                    value={movementSteps}
                    onChange={event => setMovementSteps(Number(event.target.value))}
                    placeholder="Количество шагов"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Укажите итоговое количество шагов за день.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-500">Сессии движения</h3>
            <div className="mt-2 space-y-2">
              {movementSessions.length === 0 ? (
                <p className="text-sm text-slate-500">Записей нет.</p>
              ) : (
                movementSessions.map(log => {
                  const activity = data.library.movementActivities.find(
                    item => item.id === log.activityRef
                  );
                  return (
                    <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {activity?.name ?? 'Движение'} · {log.durationMinutes} мин
                          </p>
                          <p className="text-xs text-slate-500">
                            {log.distanceKm ? `Дистанция: ${log.distanceKm} км · ` : ''}
                            {log.plannedFlights ? `Пролеты: ${log.plannedFlights}` : ''}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(log.dateTime).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}{' '}
                            ·{' '}
                            {timeOfDayLabels[log.timeOfDay ?? getTimeOfDayFromDateTime(log.dateTime)]}
                          </p>
                        </div>
                        {!isReadOnly && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              className="btn-secondary w-full sm:w-auto"
                              onClick={() => openMovement(log)}
                            >
                              Изменить
                            </button>
                            <button
                              className="btn-secondary w-full text-red-500 sm:w-auto"
                              onClick={() => deleteMovementSessionLog(log.id)}
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {active === 'Здоровье' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Водный баланс</h2>
              {!isReadOnly && (
                <button className="btn-primary w-full sm:w-auto" onClick={() => openDrink()}>
                  Добавить напиток
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Эквивалент воды: {hydrationEquivalent.toFixed(0)} мл · Цель:{' '}
              {hydrationTargetMl !== undefined ? hydrationTargetMl.toFixed(0) : '—'} мл · Коэф.{' '}
              {hydrationTargetMl !== undefined ? hydrationCoefficient.toFixed(2) : '—'}
            </p>
            <p className="text-xs text-slate-500">
              Напитки: {drinkTotalMl.toFixed(0)} мл · Еда: {foodHydrationMl.toFixed(0)} мл · Вес:{' '}
              {hydrationWeight ?? '—'} кг · Активность: {activityCoefficient.toFixed(2)}
            </p>
            <p className={`text-xs ${getHydrationStatus(hydrationEquivalent, hydrationTargetMl).tone}`}>
              {getHydrationStatus(hydrationEquivalent, hydrationTargetMl).label}
            </p>
            {!isReadOnly && (
              <div className="mt-4 rounded-2xl border border-slate-200 p-3">
                <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_0.6fr_0.8fr_auto] sm:items-end">
                  <label className="text-xs text-slate-500">
                    Напиток
                    <select
                      className="input mt-1"
                      value={drinkForm.drinkId}
                      onChange={event => {
                        const nextId = event.target.value;
                        const drink = data.library.drinks.find(item => item.id === nextId);
                        const portion = drink?.portions[0];
                        setDrinkForm(prev => ({
                          ...prev,
                          drinkId: nextId,
                          portionLabel: portion?.label ?? '',
                          portionMl: portion?.ml ?? 0
                        }));
                      }}
                    >
                      {data.library.drinks.map(drink => (
                        <option key={drink.id} value={drink.id}>
                          {drink.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-slate-500">
                    Емкость
                    <select
                      className="input mt-1"
                      value={drinkForm.portionLabel}
                      onChange={event => {
                        const drink = data.library.drinks.find(item => item.id === drinkForm.drinkId);
                        const portion = drink?.portions.find(item => item.label === event.target.value);
                        setDrinkForm(prev => ({
                          ...prev,
                          portionLabel: event.target.value,
                          portionMl: portion?.ml ?? 0
                        }));
                      }}
                    >
                      {data.library.drinks
                        .find(item => item.id === drinkForm.drinkId)
                        ?.portions.map(portion => (
                          <option key={portion.label} value={portion.label}>
                            {portion.label}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="text-xs text-slate-500">
                    Порции
                    <input
                      type="number"
                      min={1}
                      className="input mt-1"
                      value={drinkForm.portionsCount}
                      onChange={event =>
                        setDrinkForm(prev => ({ ...prev, portionsCount: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Время
                    <input
                      type="time"
                      className="input mt-1"
                      value={drinkForm.time}
                      onChange={event => setDrinkForm(prev => ({ ...prev, time: event.target.value }))}
                    />
                  </label>
                  <button
                    className="btn-primary sm:mb-1"
                    onClick={() => {
                      if (!drinkForm.drinkId || !drinkForm.portionLabel || !drinkForm.portionMl) {
                        return;
                      }
                      addDrinkLog({
                        id: '',
                        dateTime: toDateTime(selectedDate, drinkForm.time),
                        drinkId: drinkForm.drinkId,
                        portionLabel: drinkForm.portionLabel,
                        portionMl: drinkForm.portionMl,
                        portionsCount: drinkForm.portionsCount
                      });
                      setDrinkForm(prev => ({ ...prev, time: currentTimeString() }));
                    }}
                  >
                    Добавить
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-500">Напитки за день</h3>
            <div className="mt-2 space-y-2">
              {drinkLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Записей нет.</p>
              ) : (
                drinkLogs.map(log => {
                  const drink = data.library.drinks.find(item => item.id === log.drinkId);
                  return (
                    <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">{drink?.name ?? 'Напиток'}</p>
                          <p className="text-xs text-slate-500">
                            {log.portionsCount} × {log.portionLabel} ·{' '}
                            {(log.portionMl * log.portionsCount).toFixed(0)} мл ·{' '}
                            {new Date(log.dateTime).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {!isReadOnly && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button className="btn-secondary w-full sm:w-auto" onClick={() => openDrink(log)}>
                              Изменить
                            </button>
                            <button
                              className="btn-secondary w-full text-red-500 sm:w-auto"
                              onClick={() => deleteDrinkLog(log.id)}
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">
                Курение · {smokingLogs.reduce((sum, log) => sum + log.count, 0)} шт
              </h2>
              {!isReadOnly && (
                <button className="btn-primary w-full sm:w-auto" onClick={() => openSmoking()}>
                  Добавить
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Цель: {dayPlan?.requirements?.smokingTargetMax ?? '—'} шт
            </p>
            <div className="mt-3 space-y-2">
              {smokingLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Записей нет.</p>
              ) : (
                smokingLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{log.count} шт</p>
                        <p className="text-xs text-slate-500">Триггер: {log.trigger}</p>
                      </div>
                      {!isReadOnly && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            className="btn-secondary w-full sm:w-auto"
                            onClick={() => openSmoking(log)}
                          >
                            Изменить
                          </button>
                          <button
                            className="btn-secondary w-full text-red-500 sm:w-auto"
                            onClick={() => deleteSmokingLog(log.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Сон</h2>
              {!isReadOnly && (
                <button className="btn-primary w-full sm:w-auto" onClick={() => openSleep()}>
                  Добавить
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
              <p>
                Средняя длительность (7 дней):{' '}
                <span className="font-semibold">{formatMinutes(avgSleepMinutes)}</span>
              </p>
              <p>
                Якорь соблюдён: <span className="font-semibold">{anchorRate ?? '—'}%</span>
              </p>
            </div>
            <div className="mt-2 space-y-2">
              {sleepLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Нет записей.</p>
              ) : (
                sleepLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {log.bedTime ?? '—'} → {log.wakeTime ?? '—'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Длительность: {formatMinutes(calcSleepDuration(log))} · Якорь:{' '}
                          {log.anchorMet ? 'да' : 'нет'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Оценка: {log.quality1to5 ?? '—'} / 5
                          {log.notes ? ` · ${log.notes}` : ''}
                        </p>
                      </div>
                      {!isReadOnly && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button className="btn-secondary w-full sm:w-auto" onClick={() => openSleep(log)}>
                            Изменить
                          </button>
                          <button
                            className="btn-secondary w-full text-red-500 sm:w-auto"
                            onClick={() => deleteSleepLog(log.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-500">История сна (последние 7)</h3>
            <div className="mt-2 space-y-2">
              {recentSleep.length === 0 ? (
                <p className="text-sm text-slate-500">История пуста.</p>
              ) : (
                recentSleep.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {log.date} · {log.bedTime ?? '—'} → {log.wakeTime ?? '—'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatMinutes(calcSleepDuration(log))} · Оценка: {log.quality1to5 ?? '—'} / 5
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        Якорь: {log.anchorMet ? 'да' : 'нет'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="section-title">Вес</h2>
                {!isReadOnly && (
                  <button className="btn-primary w-full sm:w-auto" onClick={() => openWeight()}>
                    Добавить
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-2">
                {weightLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">Нет записей.</p>
                ) : (
                  weightLogs.map(log => (
                    <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold">{log.weightKg} кг</p>
                        {!isReadOnly && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button className="btn-secondary w-full sm:w-auto" onClick={() => openWeight(log)}>
                              Изменить
                            </button>
                            <button
                              className="btn-secondary w-full text-red-500 sm:w-auto"
                              onClick={() => deleteWeightLog(log.id)}
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="section-title">Талия</h2>
                {!isReadOnly && (
                  <button className="btn-primary w-full sm:w-auto" onClick={() => openWaist()}>
                    Добавить
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-2">
                {waistLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">Нет записей.</p>
                ) : (
                  waistLogs.map(log => (
                    <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold">{log.waistCm} см</p>
                        {!isReadOnly && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button className="btn-secondary w-full sm:w-auto" onClick={() => openWaist(log)}>
                              Изменить
                            </button>
                            <button
                              className="btn-secondary w-full text-red-500 sm:w-auto"
                              onClick={() => deleteWaistLog(log.id)}
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isReadOnly && (
        <BottomSheet
          open={Boolean(foodSheet)}
          title={foodSheet?.id ? 'Редактировать питание' : 'Добавить питание'}
          onClose={() => setFoodSheet(null)}
        >
          {foodSheet && (
            <>
              <label className="text-sm font-semibold text-slate-600">Тип записи</label>
              <select
                className="input"
                value={foodSheet.kind}
                onChange={event =>
                  setFoodSheet(prev =>
                    prev ? { ...prev, kind: event.target.value as FoodEntry['kind'] } : prev
                  )
                }
              >
                <option value="dish">Блюдо</option>
                <option value="product">Продукт</option>
                <option value="free">Свободная</option>
                <option value="cheat">Читмил</option>
              </select>

              <label className="text-sm font-semibold text-slate-600">Приём пищи</label>
              <select
                className="input"
                value={foodSheet.meal}
                onChange={event =>
                  setFoodSheet(prev =>
                    prev ? { ...prev, meal: event.target.value as FoodEntry['meal'] } : prev
                  )
                }
              >
                {Object.entries(mealLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              <label className="text-sm font-semibold text-slate-600">Время</label>
              <input
                type="time"
                className="input"
                value={foodSheet.time ?? ''}
                onChange={event =>
                  setFoodSheet(prev => (prev ? { ...prev, time: event.target.value } : prev))
                }
              />

            {foodSheet.kind !== 'free' && foodSheet.kind !== 'cheat' && (
              <>
                <label className="text-sm font-semibold text-slate-600">Поиск</label>
                <input
                  className="input"
                  value={foodQuery}
                  onChange={event => setFoodQuery(event.target.value)}
                  placeholder="Название"
                />
              </>
            )}

            {foodSheet.kind === 'product' && (
              <>
                <label className="text-sm font-semibold text-slate-600">Продукт</label>
                <select
                  className="input"
                  value={foodSheet.refId ?? ''}
                  onChange={event =>
                    setFoodSheet(prev => {
                      if (!prev) return prev;
                      const refId = event.target.value;
                      const product = data.library.products.find(item => item.id === refId);
                      const tags = product?.nutritionTags ?? [];
                      const supportsPieces = Boolean(product?.pieceGrams);
                      return {
                        ...prev,
                        refId,
                        nutritionTags: tags,
                        portionMode: supportsPieces ? 'pieces' : 'grams',
                        pieces: supportsPieces ? prev.pieces ?? 1 : prev.pieces
                      };
                    })
                  }
                >
                  <option value="">Выберите продукт</option>
                  {filteredProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                {sheetProductSupportsPieces ? (
                  <div className="flex gap-2">
                    <button
                      className={foodSheet.portionMode === 'pieces' ? 'btn-primary' : 'btn-secondary'}
                      onClick={() =>
                        setFoodSheet(prev => (prev ? { ...prev, portionMode: 'pieces' } : prev))
                      }
                    >
                      Штуки
                    </button>
                    <button
                      className={foodSheet.portionMode === 'grams' ? 'btn-primary' : 'btn-secondary'}
                      onClick={() =>
                        setFoodSheet(prev => (prev ? { ...prev, portionMode: 'grams' } : prev))
                      }
                    >
                      Граммы
                    </button>
                  </div>
                ) : null}
                {(!sheetProductSupportsPieces || foodSheet.portionMode === 'grams') && (
                  <>
                    <label className="text-sm font-semibold text-slate-600">Граммы</label>
                    <input
                      type="number"
                      className="input"
                      value={foodSheet.grams ?? 0}
                      onChange={event =>
                        setFoodSheet(prev =>
                          prev ? { ...prev, grams: Number(event.target.value) } : prev
                        )
                      }
                    />
                    <div className="control-row">
                      {data.library.products
                        .find(product => product.id === foodSheet.refId)
                        ?.portionPresets?.map(preset => (
                          <button
                            key={preset.label}
                            className="btn-secondary"
                            onClick={() =>
                              setFoodSheet(prev =>
                                prev ? { ...prev, grams: preset.grams, portionMode: 'grams' } : prev
                              )
                            }
                          >
                            {preset.label}
                          </button>
                        ))}
                      {data.presets.portions.map(preset => (
                        <button
                          key={preset.label}
                          className="btn-secondary"
                          onClick={() =>
                            setFoodSheet(prev =>
                              prev ? { ...prev, grams: preset.grams, portionMode: 'grams' } : prev
                            )
                          }
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {sheetProductSupportsPieces && foodSheet.portionMode === 'pieces' && (
                  <>
                    <label className="text-sm font-semibold text-slate-600">
                      Количество ({sheetPieceLabel})
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={foodSheet.pieces ?? 1}
                      onChange={event =>
                        setFoodSheet(prev =>
                          prev ? { ...prev, pieces: Number(event.target.value) } : prev
                        )
                      }
                    />
                  </>
                )}
              </>
            )}

            {foodSheet.kind === 'dish' && (
              <>
                <label className="text-sm font-semibold text-slate-600">Блюдо</label>
                <select
                  className="input"
                  value={foodSheet.refId ?? ''}
                  onChange={event =>
                    setFoodSheet(prev => {
                      if (!prev) return prev;
                      const refId = event.target.value;
                      const tags =
                        data.library.recipes.find(recipe => recipe.id === refId)?.nutritionTags ??
                        [];
                      return { ...prev, refId, nutritionTags: tags };
                    })
                  }
                >
                  <option value="">Выберите блюдо</option>
                  {filteredDishes.map(recipe => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
                <label className="text-sm font-semibold text-slate-600">Порции (для расчётов)</label>
                <input
                  type="number"
                  className="input"
                  value={foodSheet.servings ?? 1}
                  onChange={event =>
                    setFoodSheet(prev =>
                      prev ? { ...prev, servings: Number(event.target.value) } : prev
                    )
                  }
                />
                <label className="text-sm font-semibold text-slate-600">Описание порции</label>
                <input
                  className="input"
                  placeholder="Например: 1 тарелка"
                  value={foodSheet.portionLabel ?? ''}
                  onChange={event =>
                    setFoodSheet(prev =>
                      prev ? { ...prev, portionLabel: event.target.value } : prev
                    )
                  }
                />
                <div className="control-row">
                  {data.presets.dishPortions.map(preset => (
                    <button
                      key={preset.label}
                      className="btn-secondary"
                      onClick={() =>
                        setFoodSheet(prev =>
                          prev
                            ? { ...prev, servings: preset.servings, portionLabel: preset.label }
                            : prev
                        )
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(foodSheet.kind === 'free' || foodSheet.kind === 'cheat') && (
              <>
                <label className="text-sm font-semibold text-slate-600">Название</label>
                <input
                  className="input"
                  value={foodSheet.title ?? ''}
                  onChange={event =>
                    setFoodSheet(prev => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                />
                {foodSheet.kind === 'cheat' ? (
                  <>
                    <label className="text-sm font-semibold text-slate-600">Категория читмила</label>
                    <select
                      className="input"
                      value={foodSheet.cheatCategory ?? 'pizza'}
                      onChange={event =>
                        setFoodSheet(prev =>
                          prev
                            ? {
                                ...prev,
                                cheatCategory: event.target.value as FoodEntry['cheatCategory']
                              }
                            : prev
                        )
                      }
                    >
                      <option value="pizza">Пицца</option>
                      <option value="fastfood">Фастфуд</option>
                      <option value="sweets">Сладкое</option>
                      <option value="other">Другое</option>
                    </select>
                  </>
                ) : null}
                <label className="text-sm font-semibold text-slate-600">Калории</label>
                <input
                  type="number"
                  className="input"
                  value={foodSheet.kcalOverrideText ?? ''}
                  onChange={event =>
                    setFoodSheet(prev =>
                      prev ? { ...prev, kcalOverrideText: event.target.value } : prev
                    )
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    className="input"
                    placeholder="Белки"
                    value={foodSheet.proteinOverrideText ?? ''}
                    onChange={event =>
                      setFoodSheet(prev =>
                        prev ? { ...prev, proteinOverrideText: event.target.value } : prev
                      )
                    }
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="Жиры"
                    value={foodSheet.fatOverrideText ?? ''}
                    onChange={event =>
                      setFoodSheet(prev =>
                        prev ? { ...prev, fatOverrideText: event.target.value } : prev
                      )
                    }
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="Углеводы"
                    value={foodSheet.carbOverrideText ?? ''}
                    onChange={event =>
                      setFoodSheet(prev =>
                        prev ? { ...prev, carbOverrideText: event.target.value } : prev
                      )
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600">Метки питания</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {(Object.keys(nutritionTagLabels) as NutritionTag[]).map(tag => (
                  <label key={tag} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={foodSheet.nutritionTags?.includes(tag) ?? false}
                      onChange={() => toggleFoodTag(tag)}
                    />
                    {nutritionTagLabels[tag]}
                  </label>
                ))}
              </div>
            </div>

            <button className="btn-primary w-full" onClick={saveFood}>
              Сохранить
            </button>
            </>
          )}
        </BottomSheet>
      )}

      {!isReadOnly && (
        <BottomSheet
          open={Boolean(trainingDraft)}
          title={trainingDraft?.id ? 'Редактировать тренировку' : 'Добавить тренировку'}
          onClose={() => setTrainingDraft(null)}
        >
          {trainingDraft && (
            <>
            <label className="text-sm font-semibold text-slate-600">Минуты</label>
            <input
              type="number"
              className="input"
              value={trainingDraft.minutes}
              onChange={event =>
                setTrainingDraft(prev =>
                  prev ? { ...prev, minutes: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Подходы</label>
            <input
              type="number"
              className="input"
              value={trainingDraft.sets ?? 0}
              onChange={event =>
                setTrainingDraft(prev =>
                  prev ? { ...prev, sets: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Повторы</label>
            <input
              type="number"
              className="input"
              value={trainingDraft.reps ?? 0}
              onChange={event =>
                setTrainingDraft(prev =>
                  prev ? { ...prev, reps: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">
              Калории (расчёт): {estimateTraining(trainingDraft).toFixed(0)} ккал
            </label>
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={trainingDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setTrainingDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <p className="text-xs text-slate-500">
              Время суток: {timeOfDayLabels[getTimeOfDayFromDateTime(trainingDraft.dateTime)]}
            </p>
            <button className="btn-primary w-full" onClick={saveTraining}>
              Сохранить
            </button>
            </>
          )}
        </BottomSheet>
      )}

      {!isReadOnly && (
        <BottomSheet
          open={Boolean(movementDraft)}
          title={movementDraft?.id ? 'Редактировать движение' : 'Добавить движение'}
          onClose={() => setMovementDraft(null)}
        >
          {movementDraft && (
            <>
            <label className="text-sm font-semibold text-slate-600">Активность</label>
            <select
              className="input"
              value={movementDraft.activityRef}
              onChange={event =>
                setMovementDraft(prev =>
                  prev ? { ...prev, activityRef: event.target.value } : prev
                )
              }
            >
              {data.library.movementActivities.map(activity => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Минуты</label>
            <input
              type="number"
              className="input"
              value={movementDraft.durationMinutes}
              onChange={event =>
                setMovementDraft(prev =>
                  prev ? { ...prev, durationMinutes: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Шаги</label>
            <input
              type="number"
              className="input"
              value={movementDraft.steps ?? 0}
              onChange={event =>
                setMovementDraft(prev =>
                  prev ? { ...prev, steps: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">
              Калории (расчёт): {estimateMovement(movementDraft).toFixed(0)} ккал
            </label>
            <label className="text-sm font-semibold text-slate-600">Дистанция (км)</label>
            <input
              type="number"
              className="input"
              value={movementDraft.distanceKm ?? 0}
              onChange={event =>
                setMovementDraft(prev =>
                  prev ? { ...prev, distanceKm: Number(event.target.value) } : prev
                )
              }
            />
            {data.library.movementActivities.find(item => item.id === movementDraft.activityRef)
              ?.kind === 'stairs' ? (
              <>
                <label className="text-sm font-semibold text-slate-600">План пролетов</label>
                <input
                  type="number"
                  className="input"
                  value={movementDraft.plannedFlights ?? 0}
                  onChange={event =>
                    setMovementDraft(prev =>
                      prev ? { ...prev, plannedFlights: Number(event.target.value) } : prev
                    )
                  }
                />
                <label className="text-sm font-semibold text-slate-600">Фактически пройдено</label>
                <input
                  type="number"
                  className="input"
                  value={movementDraft.actualFlights ?? 0}
                  onChange={event =>
                    setMovementDraft(prev =>
                      prev ? { ...prev, actualFlights: Number(event.target.value) } : prev
                    )
                  }
                />
              </>
            ) : null}
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={movementDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setMovementDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <p className="text-xs text-slate-500">
              Время суток: {timeOfDayLabels[getTimeOfDayFromDateTime(movementDraft.dateTime)]}
            </p>
            <button className="btn-primary w-full" onClick={saveMovement}>
              Сохранить
            </button>
            </>
          )}
        </BottomSheet>
      )}

      {!isReadOnly && (
        <BottomSheet
          open={Boolean(smokingDraft)}
          title={smokingDraft?.id ? 'Редактировать курение' : 'Добавить курение'}
          onClose={() => setSmokingDraft(null)}
        >
          {smokingDraft && (
            <>
            <label className="text-sm font-semibold text-slate-600">Количество</label>
            <input
              type="number"
              className="input"
              value={smokingDraft.count}
              onChange={event =>
                setSmokingDraft(prev =>
                  prev ? { ...prev, count: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Триггер</label>
            <input
              className="input"
              value={smokingDraft.trigger}
              onChange={event =>
                setSmokingDraft(prev => (prev ? { ...prev, trigger: event.target.value } : prev))
              }
            />
            <label className="text-sm font-semibold text-slate-600">Стресс (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              className="input"
              value={smokingDraft.stressLevel1to5 ?? 3}
              onChange={event =>
                setSmokingDraft(prev =>
                  prev
                    ? { ...prev, stressLevel1to5: Number(event.target.value) }
                    : prev
                )
              }
            />
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={smokingDraft.ruleApplied}
                onChange={event =>
                  setSmokingDraft(prev =>
                    prev ? { ...prev, ruleApplied: event.target.checked } : prev
                  )
                }
              />
              Правило применено
            </label>
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={smokingDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setSmokingDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <button className="btn-primary w-full" onClick={saveSmoking}>
              Сохранить
            </button>
            </>
          )}
        </BottomSheet>
      )}

      {!isReadOnly && (
        <BottomSheet
          open={Boolean(weightDraft)}
          title={weightDraft?.id ? 'Редактировать вес' : 'Добавить вес'}
          onClose={() => setWeightDraft(null)}
        >
          {weightDraft && (
            <>
            <label className="text-sm font-semibold text-slate-600">Вес (кг)</label>
            <input
              type="number"
              className="input"
              value={weightDraft.weightKg}
              onChange={event =>
                setWeightDraft(prev =>
                  prev ? { ...prev, weightKg: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={weightDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setWeightDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <button className="btn-primary w-full" onClick={saveWeight}>
              Сохранить
            </button>
            </>
          )}
        </BottomSheet>
      )}

      {!isReadOnly && (
        <BottomSheet
          open={Boolean(waistDraft)}
          title={waistDraft?.id ? 'Редактировать талию' : 'Добавить талию'}
          onClose={() => setWaistDraft(null)}
        >
          {waistDraft && (
            <>
            <label className="text-sm font-semibold text-slate-600">Талия (см)</label>
            <input
              type="number"
              className="input"
              value={waistDraft.waistCm}
              onChange={event =>
                setWaistDraft(prev =>
                  prev ? { ...prev, waistCm: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Дата</label>
            <input
              type="date"
              className="input"
              value={waistDraft.date}
              onChange={event =>
                setWaistDraft(prev => (prev ? { ...prev, date: event.target.value } : prev))
              }
            />
            <button className="btn-primary w-full" onClick={saveWaist}>
              Сохранить
            </button>
            </>
          )}
        </BottomSheet>
      )}

      {!isReadOnly && (
        <BottomSheet
          open={Boolean(sleepDraft)}
          title={sleepDraft?.id ? 'Редактировать сон' : 'Добавить сон'}
          onClose={() => setSleepDraft(null)}
        >
          {sleepDraft && (
            <>
            <label className="text-sm font-semibold text-slate-600">Дата</label>
            <input
              type="date"
              className="input"
              value={sleepDraft.date}
              onChange={event =>
                setSleepDraft(prev => (prev ? { ...prev, date: event.target.value } : prev))
              }
            />
            <label className="text-sm font-semibold text-slate-600">Отбой</label>
            <input
              type="time"
              className="input"
              value={sleepDraft.bedTime ?? ''}
              onChange={event =>
                setSleepDraft(prev => (prev ? { ...prev, bedTime: event.target.value } : prev))
              }
            />
            <label className="text-sm font-semibold text-slate-600">Подъём</label>
            <input
              type="time"
              className="input"
              value={sleepDraft.wakeTime ?? ''}
              onChange={event =>
                setSleepDraft(prev => (prev ? { ...prev, wakeTime: event.target.value } : prev))
              }
            />
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={sleepDraft.anchorMet}
                onChange={event =>
                  setSleepDraft(prev =>
                    prev ? { ...prev, anchorMet: event.target.checked } : prev
                  )
                }
              />
              Якорь выполнен
            </label>
            <label className="text-sm font-semibold text-slate-600">Качество сна (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              className="input"
              value={sleepDraft.quality1to5 ?? 3}
              onChange={event =>
                setSleepDraft(prev =>
                  prev ? { ...prev, quality1to5: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Заметки</label>
            <textarea
              className="input min-h-[90px]"
              value={sleepDraft.notes ?? ''}
              onChange={event =>
                setSleepDraft(prev => (prev ? { ...prev, notes: event.target.value } : prev))
              }
              placeholder="Например: сон прерывистый, поздний спорт"
            />
            <button className="btn-primary w-full" onClick={saveSleep}>
              Сохранить
            </button>
            </>
          )}
        </BottomSheet>
      )}

      {!isReadOnly && (
        <BottomSheet
          open={Boolean(drinkDraft)}
          title={drinkDraft?.id ? 'Редактировать напиток' : 'Добавить напиток'}
          onClose={() => setDrinkDraft(null)}
        >
          {drinkDraft && (
            <>
            <label className="text-sm font-semibold text-slate-600">Напиток</label>
            <select
              className="input"
              value={drinkDraft.drinkId}
              onChange={event => {
                const nextId = event.target.value;
                const drink = data.library.drinks.find(item => item.id === nextId);
                const portion = drink?.portions[0];
                setDrinkDraft(prev =>
                  prev
                    ? {
                        ...prev,
                        drinkId: nextId,
                        portionLabel: portion?.label ?? '',
                        portionMl: portion?.ml ?? 0
                      }
                    : prev
                );
              }}
            >
              {data.library.drinks.map(drink => (
                <option key={drink.id} value={drink.id}>
                  {drink.name}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Емкость</label>
            <select
              className="input"
              value={drinkDraft.portionLabel}
              onChange={event => {
                const drink = data.library.drinks.find(item => item.id === drinkDraft.drinkId);
                const portion = drink?.portions.find(item => item.label === event.target.value);
                setDrinkDraft(prev =>
                  prev ? { ...prev, portionLabel: event.target.value, portionMl: portion?.ml ?? 0 } : prev
                );
              }}
            >
              {data.library.drinks
                .find(item => item.id === drinkDraft.drinkId)
                ?.portions.map(portion => (
                  <option key={portion.label} value={portion.label}>
                    {portion.label}
                  </option>
                ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Порции</label>
            <input
              type="number"
              min={1}
              className="input"
              value={drinkDraft.portionsCount}
              onChange={event =>
                setDrinkDraft(prev =>
                  prev ? { ...prev, portionsCount: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={drinkDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setDrinkDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <button className="btn-primary w-full" onClick={saveDrink}>
              Сохранить
            </button>
            </>
          )}
        </BottomSheet>
      )}
    </section>
  );
};

export default TrackPage;
