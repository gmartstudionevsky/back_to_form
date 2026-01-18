import { useMemo, useState, useEffect, useRef } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { WorkoutRunner } from '../components/WorkoutRunner';
import { savePhotoBlob } from '../storage/photoDb';
import { useAppStore } from '../store/useAppStore';
import { combineDateTime, currentTimeString, formatDate, todayISO } from '../utils/date';
import { calcFoodEntry, calcMealPlanItem, calcRecipeNutrition } from '../utils/nutrition';
import {
  calcMovementActivityMetrics,
  calcPlannedWorkoutCoefficient,
  calcProtocolDurationMinutes,
  calcStepsCoefficient,
  calcTrainingActivityMetrics,
  resolveActivityDefaults
} from '../utils/activity';
import {
  ActivityLog,
  FoodEntry,
  GeoPoint,
  MealComponent,
  MealComponentType,
  MovementSessionLog,
  NutritionTag,
  WorkoutPlanItem
} from '../types';
import { useNavigate } from 'react-router-dom';
import {
  getDefaultMealTime,
  getDefaultTimeForTimeOfDay,
  getTimeOfDayFromDateTime,
  getTimeOfDayFromTime,
  timeOfDayLabels
} from '../utils/timeOfDay';

const mealLabels: Record<FoodEntry['meal'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const cheatLabels: Record<NonNullable<FoodEntry['cheatCategory']>, string> = {
  pizza: 'Пицца',
  fastfood: 'Фастфуд',
  sweets: 'Сладкое',
  other: 'Другое'
};

const nutritionTagLabels: Record<NutritionTag, string> = {
  snack: 'Перекус',
  cheat: 'Читмил',
  healthy: 'Правильное питание'
};

const photoLabels: Record<'front' | 'side', string> = {
  front: 'фронт',
  side: 'профиль'
};

const mealComponentLabels: Record<MealComponentType, string> = {
  main: 'Основное',
  side: 'Гарнир',
  salad: 'Салат',
  soup: 'Суп',
  drink: 'Напиток',
  dessert: 'Десерт',
  snack: 'Перекус'
};

const mealComponentPortions: Record<MealComponentType, string[]> = {
  main: ['1 порция', '1/2 порции', '2 порции'],
  side: ['1 порция', '1/2 порции'],
  salad: ['1 миска', '1/2 миски'],
  soup: ['1 тарелка', '1/2 тарелки'],
  drink: ['250 мл', '500 мл', '750 мл'],
  dessert: ['1 порция', '1/2 порции'],
  snack: ['1 порция', '1/2 порции']
};

const TodayPage = () => {
  const navigate = useNavigate();
  const {
    data,
    addFoodEntry,
    deleteFoodEntry,
    addTrainingLog,
    deleteTrainingLog,
    addMovementSessionLog,
    updateMovementSessionLog,
    deleteMovementSessionLog,
    setMovementDayLog,
    addSmokingLog,
    deleteSmokingLog,
    addDrinkLog,
    deleteDrinkLog,
    addWeightLog,
    addWaistLog,
    addPhotoMeta,
    updateData,
    createOrGetDayPlan
  } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [sheet, setSheet] = useState<
    | 'food'
    | 'training'
    | 'smoking'
    | 'weight'
    | 'waist'
    | 'photo'
    | 'meal-edit'
    | 'date'
    | null
  >(null);
  const [photoKind, setPhotoKind] = useState<'front' | 'side'>('front');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [runner, setRunner] = useState<WorkoutPlanItem | null>(null);
  const [runnerProtocolId, setRunnerProtocolId] = useState<string | null>(null);
  const [mealEdit, setMealEdit] = useState<FoodEntry['meal'] | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const isProgrammaticScroll = useRef(false);

  const [foodForm, setFoodForm] = useState({
    kind: 'product' as const,
    refId: '',
    grams: 120,
    servings: 1,
    meal: 'breakfast' as const,
    time: currentTimeString(),
    title: '',
    kcalOverride: '',
    proteinOverride: '',
    fatOverride: '',
    carbOverride: '',
    cheatCategory: 'pizza' as FoodEntry['cheatCategory'],
    nutritionTags: [] as NutritionTag[]
  });
  const [trainingForm, setTrainingForm] = useState({
    minutes: 45,
    sets: 0,
    reps: 0,
    time: currentTimeString()
  });
  const [movementDraft, setMovementDraft] = useState<MovementSessionLog | null>(null);
  const [movementActivityId, setMovementActivityId] = useState(
    data.library.movementActivities[0]?.id ?? ''
  );
  const [movementPlannedFlights, setMovementPlannedFlights] = useState(10);
  const [movementSteps, setMovementSteps] = useState(0);
  const [movementDurationMinutes, setMovementDurationMinutes] = useState(20);
  const [movementTimer, setMovementTimer] = useState({
    running: false,
    startedAt: 0,
    elapsedSec: 0,
    durationSec: 0
  });
  const [movementStartLocation, setMovementStartLocation] = useState<GeoPoint | null>(null);
  const [movementGeoStatus, setMovementGeoStatus] = useState<string | null>(null);
  const [smokingForm, setSmokingForm] = useState({
    count: 1,
    trigger: 'стресс',
    stress: 3,
    ruleApplied: false,
    time: currentTimeString()
  });
  const [drinkForm, setDrinkForm] = useState({
    drinkId: '',
    portionLabel: '',
    portionMl: 0,
    portionsCount: 1,
    time: currentTimeString()
  });
  const [weightForm, setWeightForm] = useState({ weightKg: 72, time: currentTimeString() });
  const [waistForm, setWaistForm] = useState({ waistCm: 80 });

  const dayPlan = data.planner.dayPlans.find(plan => plan.date === selectedDate);
  const foodDay = data.logs.foodDays.find(day => day.date === selectedDate);
  const nutritionTargets = dayPlan?.nutritionTargets ?? {};
  const drinkLogs = data.logs.drinks.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const plannedMealsCount = dayPlan
    ? (Object.keys(mealLabels) as FoodEntry['meal'][]).filter(
        meal => dayPlan.mealsPlan[meal].length > 0 || Boolean(dayPlan.mealTimes?.[meal])
      ).length
    : 0;
  const actualMealsCount = useMemo(() => {
    const entries = foodDay?.entries ?? [];
    return new Set(entries.map(entry => entry.meal)).size;
  }, [foodDay]);

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
  const defaultDrink = useMemo(
    () => data.library.drinks.find(item => item.id === 'drink-water') ?? data.library.drinks[0],
    [data.library.drinks]
  );

  useEffect(() => {
    if (!defaultDrink) return;
    setDrinkForm(prev => {
      if (prev.drinkId) return prev;
      const portion = defaultDrink.portions[0];
      return {
        ...prev,
        drinkId: defaultDrink.id,
        portionLabel: portion?.label ?? '',
        portionMl: portion?.ml ?? 0
      };
    });
  }, [defaultDrink]);

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

  const plannedTotals = useMemo(() => {
    if (!dayPlan?.mealsPlan) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    return Object.values(dayPlan.mealsPlan)
      .flat()
      .reduce(
        (acc, item) => {
          const macro = calcMealPlanItem(item, data.library);
          return {
            kcal: acc.kcal + macro.kcal,
            protein: acc.protein + macro.protein,
            fat: acc.fat + macro.fat,
            carb: acc.carb + macro.carb
          };
        },
        { kcal: 0, protein: 0, fat: 0, carb: 0 }
      );
  }, [dayPlan, data.library]);
  const mealTarget = nutritionTargets.meals ?? plannedMealsCount;
  const kcalTarget = nutritionTargets.kcal ?? (plannedTotals.kcal ? Math.round(plannedTotals.kcal) : undefined);
  const formatDelta = (actual: number, target?: number) => {
    if (target === undefined) return '—';
    const delta = actual - target;
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(0)}`;
  };
  const formatDeltaFloat = (actual: number, target?: number, digits = 2) => {
    if (target === undefined) return '—';
    const delta = actual - target;
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(digits)}`;
  };
  const getProgressStatus = (actual: number, target?: number) => {
    if (!target) {
      return { percent: 0, label: 'План не задан', tone: 'text-slate-400' };
    }
    const ratio = actual / target;
    const percent = Math.round(ratio * 100);
    if (ratio >= 1.05) {
      return {
        percent,
        label: `Перевыполнение +${Math.round((ratio - 1) * 100)}%`,
        tone: 'text-emerald-500'
      };
    }
    if (ratio >= 1) {
      return { percent, label: 'План выполнен', tone: 'text-emerald-500' };
    }
    return {
      percent,
      label: `Недобор ${Math.round((1 - ratio) * 100)}%`,
      tone: 'text-amber-500'
    };
  };

  const movementSessions = data.logs.movementSessions.filter(
    log => log.dateTime.slice(0, 10) === selectedDate
  );
  const movementMinutes = movementSessions.reduce((sum, log) => sum + log.durationMinutes, 0);
  const movementDay = data.logs.movementDays.find(day => day.date === selectedDate);
  const movementDaySteps = movementDay?.steps;
  const trainingLogs = data.logs.training.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const activityDefaults = resolveActivityDefaults(data.library.activityDefaults);
  const movementDistanceKm = movementSessions.reduce(
    (sum, log) => sum + (log.distanceKm ?? 0),
    0
  );
  const trainingMinutes = trainingLogs.reduce((sum, log) => sum + log.minutes, 0);
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
          includeSteps: !movementDaySteps
        }).coefficient
      );
    }, 0),
    calcStepsCoefficient(movementDaySteps ?? 0, activityDefaults)
  ].reduce((sum, value) => sum + value, 0);
  const cigaretteCount = data.logs.smoking
    .filter(log => log.dateTime.slice(0, 10) === selectedDate)
    .reduce((sum, log) => sum + log.count, 0);
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
    if (entry.kind === 'product' && entry.refId && entry.grams) {
      const product = data.library.products.find(item => item.id === entry.refId);
      if (!product?.hydrationContribution) return sum;
      return sum + entry.grams;
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
  const hydrationProgress = getProgressStatus(hydrationEquivalent, hydrationTargetMl);
  const lastWeight = data.logs.weight
    .filter(log => log.dateTime.slice(0, 10) === selectedDate)
    .slice(-1)[0]?.weightKg;
  const lastWaist = data.logs.waist.filter(log => log.date === selectedDate).slice(-1)[0]?.waistCm;
  const activityTargets = dayPlan?.activityTargets ?? {};
  const moveDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const resolveWeightForDateTime = (dateTime: string) =>
    data.logs.weight
      .filter(log => log.dateTime <= dateTime)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      .slice(-1)[0]?.weightKg;


  const resolveFoodTags = (draft: typeof foodForm) => {
    const tags = draft.nutritionTags.length ? [...draft.nutritionTags] : [];
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
    setFoodForm(prev => ({
      ...prev,
      nutritionTags: prev.nutritionTags.includes(tag)
        ? prev.nutritionTags.filter(item => item !== tag)
        : [...prev.nutritionTags, tag]
    }));
  };

  const openFoodSheet = (meal: FoodEntry['meal'], tags: NutritionTag[] = []) => {
    setFoodForm(prev => ({
      ...prev,
      meal,
      time: currentTimeString(),
      nutritionTags: tags
    }));
    setSheet('food');
  };

  const toDateTime = (date: string, time?: string) => combineDateTime(date, time);

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

  const getPlannedMealTime = (meal: FoodEntry['meal'], time?: string) =>
    time?.trim() ? time : getDefaultMealTime(meal);

  const getPlannedWorkoutTime = (item: WorkoutPlanItem) =>
    item.plannedTime?.trim() ? item.plannedTime : getDefaultTimeForTimeOfDay(item.timeOfDay);

  const requestLocation = () =>
    new Promise<GeoPoint | null>(resolve => {
      if (!navigator.geolocation) {
        setMovementGeoStatus('Геолокация недоступна в этом браузере.');
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position => {
          const point = { lat: position.coords.latitude, lng: position.coords.longitude };
          setMovementGeoStatus('Геолокация обновлена.');
          resolve(point);
        },
        () => {
          setMovementGeoStatus('Не удалось получить геолокацию.');
          resolve(null);
        }
      );
    });

  const calcDistanceKm = (start: GeoPoint, end: GeoPoint) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const radius = 6371;
    const dLat = toRad(end.lat - start.lat);
    const dLon = toRad(end.lng - start.lng);
    const lat1 = toRad(start.lat);
    const lat2 = toRad(end.lat);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getMealTimeOfDay = (meal: FoodEntry['meal'], time?: string) => {
    return getTimeOfDayFromTime(getPlannedMealTime(meal, time));
  };

  const getDefaultPortion = (type: MealComponentType) => mealComponentPortions[type][0];

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    isProgrammaticScroll.current = true;
    const headerOffset = headerRef.current?.offsetHeight ?? 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 500);
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let isMobile = window.matchMedia('(max-width: 639px)').matches;

    const updateVisibility = () => {
      if (!isMobile) {
        setIsNavVisible(true);
        lastScrollY = window.scrollY;
        return;
      }
      if (isProgrammaticScroll.current) {
        setIsNavVisible(true);
        lastScrollY = window.scrollY;
        return;
      }
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const passedThreshold = currentScrollY > 80;
      setIsNavVisible(!isScrollingDown || !passedThreshold);
      lastScrollY = currentScrollY;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        updateVisibility();
        ticking = false;
      });
    };

    const handleResize = () => {
      isMobile = window.matchMedia('(max-width: 639px)').matches;
      if (!isMobile) {
        setIsNavVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    updateVisibility();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const addMealComponent = (meal: FoodEntry['meal']) => {
    const plan = createOrGetDayPlan(selectedDate);
    updateData(state => {
      const target = state.planner.dayPlans.find(item => item.date === plan.date);
      if (!target) return { ...state };
      target.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
      const type: MealComponentType = meal === 'snack' ? 'snack' : 'main';
      const newComponent: MealComponent = {
        id: crypto.randomUUID(),
        type,
        recipeRef: data.library.recipes[0]?.id,
        portion: getDefaultPortion(type),
        extra: false
      };
      target.mealComponents[meal].push(newComponent);
      return { ...state };
    });
  };

  const updateMealComponent = (
    meal: FoodEntry['meal'],
    id: string,
    payload: Partial<MealComponent>
  ) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
      if (!plan) return { ...state };
      plan.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
      plan.mealComponents[meal] = plan.mealComponents[meal].map(item =>
        item.id === id ? { ...item, ...payload } : item
      );
      return { ...state };
    });
  };

  const removeMealComponent = (meal: FoodEntry['meal'], id: string) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
      if (!plan) return { ...state };
      plan.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
      plan.mealComponents[meal] = plan.mealComponents[meal].filter(item => item.id !== id);
      return { ...state };
    });
  };

  const updateMealTime = (meal: FoodEntry['meal'], time: string) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
      if (!plan) return { ...state };
      plan.mealTimes ??= { breakfast: '', lunch: '', dinner: '', snack: '' };
      plan.mealTimes[meal] = time;
      return { ...state };
    });
  };

  const updateWorkoutTime = (id: string, time: string) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
      if (!plan) return { ...state };
      plan.workoutsPlan = plan.workoutsPlan.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          plannedTime: time || undefined,
          timeOfDay: time ? getTimeOfDayFromTime(time) : item.timeOfDay
        };
      });
      return { ...state };
    });
  };

  const applyMealTemplate = (meal: FoodEntry['meal']) => {
    const template: MealComponentType[] =
      meal === 'breakfast'
        ? ['main', 'drink']
        : meal === 'snack'
          ? ['snack', 'drink']
          : ['main', 'side', 'salad', 'drink'];
    const plan = createOrGetDayPlan(selectedDate);
    updateData(state => {
      const target = state.planner.dayPlans.find(item => item.date === plan.date);
      if (!target) return { ...state };
      target.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
      target.mealComponents[meal] = template.map(type => ({
        id: crypto.randomUUID(),
        type,
        recipeRef: data.library.recipes[0]?.id,
        portion: getDefaultPortion(type),
        extra: false
      }));
      return { ...state };
    });
  };

  const savePhoto = async () => {
    if (!photoFile) return;
    const blobKey = crypto.randomUUID();
    await savePhotoBlob(blobKey, photoFile);
    addPhotoMeta({
      id: crypto.randomUUID(),
      dateTime: `${selectedDate}T${new Date().toISOString().slice(11, 19)}`,
      kind: photoKind,
      blobKey
    });
    setPhotoFile(null);
    setSheet(null);
  };

  const plannedWorkouts = dayPlan?.workoutsPlan ?? [];
  const plannedTraining = plannedWorkouts.filter(
    item => !(item.kind === 'movement' || !item.protocolRef)
  );
  const plannedMovementItems = plannedWorkouts.filter(
    item => item.kind === 'movement' || !item.protocolRef
  );
  const plannedMovementSession = plannedWorkouts.find(item => item.kind === 'movement');
  const plannedMovementActivityId =
    plannedMovementSession?.movementActivityRef ??
    plannedMovementItems.find(item => item.movementActivityRef)?.movementActivityRef;
  const plannedMovementSessionMinutes = plannedMovementSession?.plannedMinutes ?? 20;
  const plannedMovementActivityName = plannedMovementActivityId
    ? data.library.movementActivities.find(activity => activity.id === plannedMovementActivityId)
        ?.name
    : undefined;
  const defaultMovementActivityId =
    plannedMovementActivityId ??
    data.library.movementActivities.find(item => item.kind === 'march')?.id ??
    data.library.movementActivities[0]?.id ??
    '';
  const plannedTrainingMinutes = plannedTraining.reduce((sum, item) => {
    const protocol = data.library.protocols.find(
      protocolItem => protocolItem.id === item.protocolRef
    );
    const plannedMinutes = item.plannedMinutes ?? calcProtocolDurationMinutes(protocol) ?? 0;
    return sum + plannedMinutes;
  }, 0);
  const plannedMovementMinutes = plannedMovementItems.reduce(
    (sum, item) => sum + (item.plannedMinutes ?? 0),
    0
  );
  const plannedActivityCoefficient =
    plannedWorkouts.reduce((sum, item) => {
      const protocol = data.library.protocols.find(
        protocolItem => protocolItem.id === item.protocolRef
      );
      const movementActivity = data.library.movementActivities.find(
        activity => activity.id === item.movementActivityRef
      );
      return (
        sum +
        calcPlannedWorkoutCoefficient(
          item,
          protocol,
          data.library.exercises,
          activityDefaults,
          movementActivity
        )
      );
    }, 0) +
    calcStepsCoefficient(activityTargets.steps ?? dayPlan?.plannedSteps ?? 0, activityDefaults);
  const activityCoefficientTarget =
    activityTargets.coefficient ??
    (plannedActivityCoefficient ? plannedActivityCoefficient : undefined);
  const trainingMinutesTarget =
    activityTargets.trainingMinutes ?? (plannedTrainingMinutes || undefined);
  const movementMinutesTarget =
    activityTargets.movementMinutes ?? (plannedMovementMinutes || undefined);
  const stepsTarget = activityTargets.steps ?? dayPlan?.plannedSteps;
  const distanceTarget = activityTargets.distanceKm;
  const activityProgress = getProgressStatus(activityCoefficient, activityCoefficientTarget);

  useEffect(() => {
    setMovementSteps(movementDay?.steps ?? 0);
  }, [movementDay?.steps, selectedDate]);

  useEffect(() => {
    if (!defaultMovementActivityId) return;
    setMovementActivityId(defaultMovementActivityId);
  }, [defaultMovementActivityId, selectedDate]);

  useEffect(() => {
    setMovementDurationMinutes(plannedMovementSessionMinutes);
  }, [plannedMovementSessionMinutes, selectedDate]);

  useEffect(() => {
    if (!movementTimer.running) return;
    const id = window.setInterval(() => {
      setMovementTimer(prev => {
        const elapsedSec = Math.floor((Date.now() - prev.startedAt) / 1000);
        return {
          ...prev,
          elapsedSec: Math.min(elapsedSec, prev.durationSec)
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [movementTimer.running]);

  useEffect(() => {
    if (!movementTimer.running) return;
    if (movementTimer.elapsedSec < movementTimer.durationSec) return;
    stopMovementSession({ elapsedSec: movementTimer.durationSec });
  }, [movementTimer.elapsedSec, movementTimer.durationSec, movementTimer.running]);

  const openMovement = (log?: MovementSessionLog) => {
    const activityRef = log?.activityRef ?? defaultMovementActivityId ?? '';
    setMovementDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate),
        activityRef,
        durationMinutes: plannedMovementSessionMinutes,
        plannedFlights: 10,
        timeOfDay: getTimeOfDayFromDateTime(new Date().toISOString())
      }
    );
  };

  const saveMovement = () => {
    if (!movementDraft) return;
    const payload = {
      ...movementDraft,
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

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startMovementSession = async () => {
    if (
      !movementActivityId ||
      !Number.isFinite(movementDurationMinutes) ||
      movementDurationMinutes <= 0
    )
      return;
    setMovementGeoStatus('Запрашиваем геолокацию…');
    const startLocation = await requestLocation();
    setMovementStartLocation(startLocation);
    setMovementTimer({
      running: true,
      startedAt: Date.now(),
      elapsedSec: 0,
      durationSec: movementDurationMinutes * 60
    });
  };

  const stopMovementSession = async ({ elapsedSec }: { elapsedSec?: number } = {}) => {
    if (!movementTimer.running) return;
    const finalElapsedSec =
      typeof elapsedSec === 'number' ? elapsedSec : movementTimer.elapsedSec;
    const startedAt = movementTimer.startedAt;
    setMovementTimer(prev => ({ ...prev, running: false }));
    setMovementGeoStatus('Фиксируем завершение…');
    const endLocation = await requestLocation();
    const durationMinutes = Math.max(1, Math.round(finalElapsedSec / 60));
    const distanceKm =
      movementStartLocation && endLocation
        ? Math.round(calcDistanceKm(movementStartLocation, endLocation) * 100) / 100
        : undefined;
    const activity = data.library.movementActivities.find(item => item.id === movementActivityId);
    const log = {
      id: '',
      dateTime: new Date(startedAt).toISOString(),
      activityRef: movementActivityId,
      durationMinutes,
      distanceKm,
      startLocation: movementStartLocation ?? undefined,
      endLocation: endLocation ?? undefined,
      plannedFlights: activity?.kind === 'stairs' ? movementPlannedFlights : undefined,
      timeOfDay: getTimeOfDayFromDateTime(new Date(startedAt).toISOString())
    };
    addMovementSessionLog({
      ...log,
      calories: estimateMovement(log) || undefined
    });
    setMovementTimer({ running: false, startedAt: 0, elapsedSec: 0, durationSec: 0 });
    setMovementStartLocation(null);
  };
  const mealComponents = dayPlan?.mealComponents ?? {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  };
  const mealTimes = dayPlan?.mealTimes ?? {
    breakfast: '',
    lunch: '',
    dinner: '',
    snack: ''
  };

  const requirements = dayPlan?.requirements;
  const requiredPhotos = requirements?.requirePhotos ?? [];

  const runnerProtocol = runnerProtocolId
    ? data.library.protocols.find(item => item.id === runnerProtocolId)
    : null;

  const formatTimeFromDateTime = (value: string) =>
    new Date(value).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });

  const getFoodEntryTitle = (entry: FoodEntry) => {
    if (entry.kind === 'product') {
      return data.library.products.find(product => product.id === entry.refId)?.name ?? 'Продукт';
    }
    if (entry.kind === 'dish') {
      return data.library.recipes.find(recipe => recipe.id === entry.refId)?.name ?? 'Блюдо';
    }
    return entry.title ?? 'Запись';
  };

  const renderNutritionTags = (tags?: NutritionTag[]) => {
    if (!tags?.length) return null;
    return (
      <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
        {tags.map(tag => (
          <span key={tag} className="badge">
            {nutritionTagLabels[tag]}
          </span>
        ))}
      </div>
    );
  };

  const plannedMealKeys = dayPlan
    ? (Object.keys(mealLabels) as FoodEntry['meal'][]).filter(
        meal => mealComponents[meal].length > 0 || Boolean(mealTimes[meal] || '')
      )
    : [];

  const foodEntries = (foodDay?.entries ?? []).slice();
  const foodEntriesByMeal = (Object.keys(mealLabels) as FoodEntry['meal'][]).reduce(
    (acc, meal) => {
      const entries = foodEntries
        .filter(entry => entry.meal === meal)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
      acc[meal] = entries;
      return acc;
    },
    {} as Record<FoodEntry['meal'], FoodEntry[]>
  );

  const plannedMealItems = plannedMealKeys.map(meal => {
    const plannedTime = getPlannedMealTime(meal, mealTimes[meal]);
    const entries = foodEntriesByMeal[meal] ?? [];
    const primaryEntry = entries[0];
    return {
      id: meal,
      kind: 'meal-plan' as const,
      meal,
      title: mealLabels[meal],
      time: plannedTime,
      timeOfDay: getMealTimeOfDay(meal, plannedTime),
      completed: entries.length > 0,
      actualTime: primaryEntry?.time ?? '',
      entryId: primaryEntry?.id,
      entriesCount: entries.length
    };
  });

  const extraMealEntries = (Object.keys(mealLabels) as FoodEntry['meal'][]).flatMap(meal => {
    const entries = foodEntriesByMeal[meal] ?? [];
    const extraEntries = plannedMealKeys.includes(meal) ? entries.slice(1) : entries;
    return extraEntries.map(entry => ({
      id: entry.id,
      kind: 'meal-entry' as const,
      meal,
      title: getFoodEntryTitle(entry),
      time: entry.time ?? getPlannedMealTime(meal),
      timeOfDay: getMealTimeOfDay(meal, entry.time),
      entry
    }));
  });

  const trainingLogsWithTime = trainingLogs
    .map(log => ({
      ...log,
      time: formatTimeFromDateTime(log.dateTime),
      timeOfDay: log.timeOfDay ?? getTimeOfDayFromDateTime(log.dateTime)
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const movementLogsWithTime = movementSessions
    .map(log => ({
      ...log,
      time: formatTimeFromDateTime(log.dateTime),
      timeOfDay: log.timeOfDay ?? getTimeOfDayFromDateTime(log.dateTime)
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const remainingTrainingLogs = [...trainingLogsWithTime];
  const remainingMovementLogs = [...movementLogsWithTime];

  const takeTrainingLog = (timeOfDay: WorkoutPlanItem['timeOfDay']) => {
    const index = remainingTrainingLogs.findIndex(log => log.timeOfDay === timeOfDay);
    if (index === -1) return null;
    return remainingTrainingLogs.splice(index, 1)[0];
  };

  const takeMovementLog = (
    timeOfDay: WorkoutPlanItem['timeOfDay'],
    activityRef?: string
  ) => {
    const index = remainingMovementLogs.findIndex(
      log =>
        log.timeOfDay === timeOfDay &&
        (!activityRef || !log.activityRef || log.activityRef === activityRef)
    );
    if (index === -1) return null;
    return remainingMovementLogs.splice(index, 1)[0];
  };

  const getProtocolPlannedMinutes = (protocolId?: string) => {
    if (!protocolId) return undefined;
    const protocol = data.library.protocols.find(item => item.id === protocolId);
    if (!protocol) return undefined;
    const totalDurationSec = protocol.steps.reduce(
      (sum, step) => sum + (step.durationSec ?? 0),
      0
    );
    return totalDurationSec ? Math.max(1, Math.round(totalDurationSec / 60)) : undefined;
  };

  const plannedWorkoutItems = plannedWorkouts.map(item => {
    const plannedTime = getPlannedWorkoutTime(item);
    const timeOfDay = item.plannedTime ? getTimeOfDayFromTime(plannedTime) : item.timeOfDay;
    const isMovement = item.kind === 'movement' || !item.protocolRef;
    const matchedLog = isMovement
      ? takeMovementLog(timeOfDay, item.movementActivityRef)
      : takeTrainingLog(timeOfDay);
    const plannedMinutes = isMovement
      ? item.plannedMinutes
      : getProtocolPlannedMinutes(item.protocolRef);
    const actualMinutes = isMovement ? matchedLog?.durationMinutes : matchedLog?.minutes;
    const completionPercent = plannedMinutes
      ? Math.min(150, Math.round(((actualMinutes ?? 0) / plannedMinutes) * 100))
      : undefined;
    return {
      id: item.id,
      kind: 'workout-plan' as const,
      title:
        isMovement
          ? data.library.movementActivities.find(
              activity => activity.id === item.movementActivityRef
            )?.name ?? 'Движение'
          : data.library.protocols.find(protocol => protocol.id === item.protocolRef)?.name ??
            'Тренировка',
      time: plannedTime,
      timeOfDay,
      completed: Boolean(item.completed || actualMinutes),
      plannedMinutes,
      actualMinutes,
      actualTime: matchedLog?.time ?? '',
      completionPercent,
      isMovement,
      logId: matchedLog?.id
    };
  });

  const extraTrainingItems = remainingTrainingLogs.map(log => ({
    id: log.id,
    kind: 'training-log' as const,
    title: 'Тренировка',
    time: log.time,
    timeOfDay: log.timeOfDay,
    minutes: log.minutes
  }));

  const extraMovementItems = remainingMovementLogs.map(log => {
    const activityName =
      data.library.movementActivities.find(item => item.id === log.activityRef)?.name ??
      'Движение';
    return {
      id: log.id,
      kind: 'movement-log' as const,
      title: activityName,
      time: log.time,
      timeOfDay: log.timeOfDay,
      minutes: log.durationMinutes,
      flights: log.actualFlights ?? log.plannedFlights
    };
  });

  const smokingItems = data.logs.smoking
    .filter(log => log.dateTime.slice(0, 10) === selectedDate)
    .map(log => ({
      id: log.id,
      kind: 'smoking-log' as const,
      title: 'Сигареты',
      time: formatTimeFromDateTime(log.dateTime),
      timeOfDay: getTimeOfDayFromDateTime(log.dateTime),
      count: log.count
    }));

  const drinkItems = drinkLogs.map(log => ({
    id: log.id,
    kind: 'drink-log' as const,
    title: data.library.drinks.find(item => item.id === log.drinkId)?.name ?? 'Напиток',
    time: formatTimeFromDateTime(log.dateTime),
    timeOfDay: getTimeOfDayFromDateTime(log.dateTime),
    portionMl: log.portionMl,
    portionsCount: log.portionsCount
  }));

  const editingMeal = mealEdit ?? 'breakfast';
  const editComponents = mealEdit ? mealComponents[mealEdit] : [];
  const editMealTime = mealEdit ? getPlannedMealTime(mealEdit, mealTimes[mealEdit]) : '';
  const plannedMovementTime = plannedMovementSession
    ? getPlannedWorkoutTime(plannedMovementSession)
    : '';
  const scheduleItems = [
    ...plannedMealItems,
    ...plannedWorkoutItems,
    ...extraMealEntries,
    ...extraTrainingItems,
    ...extraMovementItems,
    ...smokingItems,
    ...drinkItems
  ];
  const plannedItemsCount = plannedMealItems.length + plannedWorkoutItems.length;
  const completedItemsCount =
    plannedMealItems.filter(item => item.completed).length +
    plannedWorkoutItems.filter(item => item.completed).length;
  const progressPercent = plannedItemsCount
    ? Math.round((completedItemsCount / plannedItemsCount) * 100)
    : 0;

  return (
    <section className="space-y-4">
      <header
        ref={headerRef}
        className={`sticky top-0 z-10 -mx-4 bg-slate-50 px-4 pb-2 pt-2 transition-transform duration-200 sm:pb-3 sm:pt-4 ${
          isNavVisible ? 'translate-y-0' : '-translate-y-full'
        } sm:translate-y-0`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <button
            className="btn-secondary px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
            onClick={() => setSheet('date')}
          >
            {formatDate(selectedDate)}
          </button>
          <div className="grid auto-cols-[minmax(80px,1fr)] grid-flow-col gap-1.5 overflow-x-auto pb-1 text-[11px] sm:gap-2 sm:text-xs sm:grid-cols-3 sm:grid-flow-row sm:auto-cols-auto sm:overflow-visible lg:grid-cols-6">
            <button
              className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
              onClick={() => scrollToSection('schedule')}
            >
              План дня
            </button>
            {dayPlan ? (
              <button
                className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
                onClick={() => scrollToSection('meal-plan')}
              >
                Питание
              </button>
            ) : null}
            {dayPlan ? (
              <>
                <button
                  className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
                  onClick={() => scrollToSection('training-plan')}
                >
                  Тренировки
                </button>
                <button
                  className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
                  onClick={() => scrollToSection('movement-plan')}
                >
                  Движение
                </button>
              </>
            ) : null}
            <button
              className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
              onClick={() => scrollToSection('smoking')}
            >
              Курение
            </button>
            <button
              className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
              onClick={() => scrollToSection('water')}
            >
              Вода
            </button>
            {requirements &&
            (requirements.requireWeight || requirements.requireWaist || requiredPhotos.length > 0) ? (
              <button
                className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
                onClick={() => scrollToSection('measurements')}
              >
                Измерения
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="card p-4" id="summary">
        <h2 className="section-title">Итоги дня</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">КБЖУ</p>
            <p className="text-lg font-semibold">
              {totals.kcal.toFixed(0)} / {nutritionTargets.kcal ?? '—'} ккал
            </p>
            <p className="text-xs text-slate-400">
              Б {totals.protein.toFixed(0)} / {nutritionTargets.protein ?? '—'} · Ж{' '}
              {totals.fat.toFixed(0)} / {nutritionTargets.fat ?? '—'} · У{' '}
              {totals.carb.toFixed(0)} / {nutritionTargets.carb ?? '—'}
            </p>
            <p className="text-[11px] text-slate-400">
              Δ ккал {formatDelta(totals.kcal, kcalTarget)} · Б{' '}
              {formatDelta(totals.protein, nutritionTargets.protein)} · Ж{' '}
              {formatDelta(totals.fat, nutritionTargets.fat)} · У{' '}
              {formatDelta(totals.carb, nutritionTargets.carb)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Активность</p>
            <p className="text-lg font-semibold">
              {activityCoefficient.toFixed(2)} /{' '}
              {activityCoefficientTarget !== undefined
                ? activityCoefficientTarget.toFixed(2)
                : '—'}{' '}
              коэф.
            </p>
            <p className={`text-xs ${activityProgress.tone}`}>{activityProgress.label}</p>
            <p className="text-[11px] text-slate-400">
              Тренировки: {trainingMinutes} мин / {trainingMinutesTarget ?? '—'} ·
              Движение: {movementMinutes} мин / {movementMinutesTarget ?? '—'}
            </p>
            <p className="text-[11px] text-slate-400">
              Шаги: {movementDaySteps ?? 0} / {stepsTarget ?? '—'} · Δ коэф{' '}
              {formatDeltaFloat(activityCoefficient, activityCoefficientTarget)}
            </p>
            {movementDistanceKm || distanceTarget ? (
              <p className="text-[11px] text-slate-400">
                Дистанция: {movementDistanceKm.toFixed(1)} км / {distanceTarget ?? '—'}
              </p>
            ) : null}
            {(activityCoefficientTarget !== undefined || kcalTarget !== undefined) && (
              <p className="text-[11px] text-slate-400">
                Маркер баланса: активность{' '}
                {formatDeltaFloat(activityCoefficient, activityCoefficientTarget)} · ккал{' '}
                {formatDelta(totals.kcal, kcalTarget)}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Сигареты</p>
            <p className="text-lg font-semibold">{cigaretteCount} шт</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Водный баланс</p>
            <p className="text-lg font-semibold">{hydrationEquivalent.toFixed(0)} мл</p>
            <p className="text-xs text-slate-400">
              Цель: {hydrationTargetMl !== undefined ? hydrationTargetMl.toFixed(0) : '—'} мл ·
              Коэф. {hydrationTargetMl !== undefined ? hydrationCoefficient.toFixed(2) : '—'}
            </p>
            <p className="text-[11px] text-slate-400">
              Напитки: {drinkTotalMl.toFixed(0)} мл · Еда: {foodHydrationMl.toFixed(0)} мл
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Вес</p>
            <p className="text-lg font-semibold">{lastWeight ? `${lastWeight} кг` : '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Приемы пищи</p>
            <p className="text-lg font-semibold">
              {actualMealsCount}/{mealTarget || '—'}
            </p>
            <p className="text-xs text-slate-400">
              План приемов: {plannedMealsCount || '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3" id="schedule">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">План дня</h2>
          <p className="text-xs text-slate-500">
            Автоматический хаб по текущему дню с планом, фактами и прогрессом.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Прогресс дня: {completedItemsCount}/{plannedItemsCount || 0}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-emerald-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="uppercase text-[10px]">Питание</p>
            <p className="text-sm font-semibold text-slate-700">
              {actualMealsCount}/{mealTarget || '—'}
            </p>
            <p className="text-[11px] text-slate-400">
              Ккал: {totals.kcal.toFixed(0)} · Δ {formatDelta(totals.kcal, kcalTarget)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="uppercase text-[10px]">Тренировки</p>
            <p className="text-sm font-semibold text-slate-700">
              {
                plannedWorkoutItems.filter(item => !item.isMovement && item.completed).length
              }
              /{plannedWorkoutItems.filter(item => !item.isMovement).length || 0}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="uppercase text-[10px]">Движение</p>
            <p className="text-sm font-semibold text-slate-700">
              {
                plannedWorkoutItems.filter(item => item.isMovement && item.completed).length
              }
              /{plannedWorkoutItems.filter(item => item.isMovement).length || 0}
            </p>
            <p className="text-[11px] text-slate-400">
              {dayPlan?.plannedSteps ? `Шаги: ${movementDaySteps ?? 0}/${dayPlan.plannedSteps}` : ''}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="uppercase text-[10px]">Активность</p>
            <p className="text-sm font-semibold text-slate-700">
              {activityCoefficient.toFixed(2)}
              {activityCoefficientTarget !== undefined
                ? ` / ${activityCoefficientTarget.toFixed(2)}`
                : ''}
            </p>
            <p className={`text-[11px] ${activityProgress.tone}`}>{activityProgress.label}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="uppercase text-[10px]">Сигареты</p>
            <p className="text-sm font-semibold text-slate-700">
              {cigaretteCount}/{requirements?.smokingTargetMax ?? '—'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="uppercase text-[10px]">Вода</p>
            <p className="text-sm font-semibold text-slate-700">
              {hydrationEquivalent.toFixed(0)} мл
            </p>
            <p className="text-[11px] text-slate-400">
              {hydrationTargetMl !== undefined
                ? `Цель: ${hydrationTargetMl.toFixed(0)} мл · Коэф. ${hydrationCoefficient.toFixed(2)}`
                : 'Нет данных для цели'}
            </p>
            <p className={`text-[11px] ${hydrationProgress.tone}`}>{hydrationProgress.label}</p>
          </div>
        </div>
        <div className="space-y-4">
          {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(timeOfDay => {
            const items = scheduleItems
              .filter(item => item.timeOfDay === timeOfDay)
              .sort((a, b) => a.time.localeCompare(b.time));
            if (items.length === 0) return null;
            return (
              <div key={timeOfDay} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {timeOfDayLabels[timeOfDay]}
                </p>
                <div className="space-y-2">
                  {items.map(item => {
                    if (item.kind === 'workout-plan') {
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 text-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                План · {item.time}
                                {item.actualTime
                                  ? ` · Факт: ${item.actualTime}`
                                  : item.completed
                                    ? ' · Факт отмечен'
                                    : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {item.completed ? <span className="badge">Выполнено</span> : null}
                              {dayPlan ? (
                                <button
                                  className="btn-secondary"
                                  onClick={() =>
                                    scrollToSection(
                                      item.isMovement ? 'movement-plan' : 'training-plan'
                                    )
                                  }
                                >
                                  К плану
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-2 text-xs text-slate-500">
                            <p>
                              Минуты:{' '}
                              {item.actualMinutes ? `${item.actualMinutes} мин` : '—'} из{' '}
                              {item.plannedMinutes ? `${item.plannedMinutes} мин` : '—'}
                              {item.completionPercent !== undefined
                                ? ` · ${item.completionPercent}%`
                                : ''}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    if (item.kind === 'meal-plan') {
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 text-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                План · {item.time}
                                {item.actualTime
                                  ? ` · Факт: ${item.actualTime}`
                                  : item.completed
                                    ? ' · Факт отмечен'
                                    : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {item.completed ? <span className="badge">Учтено</span> : null}
                              {dayPlan ? (
                                <button
                                  className="btn-secondary"
                                  onClick={() => scrollToSection('meal-plan')}
                                >
                                  К питанию
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-2 text-xs text-slate-500">
                            <p>Записей: {item.entriesCount}</p>
                          </div>
                          {dayPlan ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <label className="text-xs text-slate-500">
                                Время
                                <input
                                  type="time"
                                  className="input input-time mt-1 w-32"
                                  value={item.time}
                                  onChange={event => updateMealTime(item.meal, event.target.value)}
                                />
                              </label>
                              {!item.completed ? (
                                <button
                                  className="btn-secondary w-full sm:w-auto"
                                  onClick={() => {
                                    openFoodSheet(item.meal, item.meal === 'snack' ? ['snack'] : []);
                                  }}
                                >
                                  Отметить прием
                                </button>
                              ) : item.entryId ? (
                                <button
                                  className="btn-secondary w-full sm:w-auto"
                                  onClick={() => deleteFoodEntry(selectedDate, item.entryId ?? '')}
                                >
                                  Отменить отметку
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    }
                    if (item.kind === 'meal-entry') {
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 text-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                {mealLabels[item.meal]} · {item.time}
                              </p>
                            </div>
                            <span className="badge">Дополнительно</span>
                          </div>
                          {renderNutritionTags(item.entry?.nutritionTags)}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              className="btn-secondary w-full sm:w-auto"
                              onClick={() => deleteFoodEntry(selectedDate, item.id)}
                            >
                              Отменить запись
                            </button>
                          </div>
                        </div>
                      );
                    }
                    if (item.kind === 'training-log') {
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 text-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                Факт · {item.time} · {item.minutes} мин
                              </p>
                            </div>
                            <span className="badge">Дополнительно</span>
                          </div>
                          <button
                            className="btn-secondary w-full sm:w-auto"
                            onClick={() => deleteTrainingLog(item.id)}
                          >
                            Отменить запись
                          </button>
                        </div>
                      );
                    }
                    if (item.kind === 'movement-log') {
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 text-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                Факт · {item.time} · {item.minutes} мин
                                {item.flights ? ` · Пролеты: ${item.flights}` : ''}
                              </p>
                            </div>
                            <span className="badge">Дополнительно</span>
                          </div>
                          <button
                            className="btn-secondary w-full sm:w-auto"
                            onClick={() => deleteMovementSessionLog(item.id)}
                          >
                            Отменить запись
                          </button>
                        </div>
                      );
                    }
                    if (item.kind === 'smoking-log') {
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 text-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold">Сигареты</p>
                              <p className="text-xs text-slate-500">
                                Факт · {item.time} · {item.count} шт
                              </p>
                            </div>
                            <span className="badge">Запись</span>
                          </div>
                          <button
                            className="btn-secondary w-full sm:w-auto"
                            onClick={() => deleteSmokingLog(item.id)}
                          >
                            Отменить запись
                          </button>
                        </div>
                      );
                    }
                    if (item.kind === 'drink-log') {
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 text-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                Факт · {item.time} · {item.portionMl * item.portionsCount} мл
                              </p>
                            </div>
                            <span className="badge">Запись</span>
                          </div>
                          <button
                            className="btn-secondary w-full sm:w-auto"
                            onClick={() => deleteDrinkLog(item.id)}
                          >
                            Отменить запись
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })}
          {!scheduleItems.length ? (
            <p className="text-sm text-slate-500">
              Пока нет данных за день. Создайте план или добавьте записи в разделах ниже.
            </p>
          ) : null}
        </div>
      </div>

      {dayPlan ? (
        <>
          <div className="card p-4 space-y-3" id="training-plan">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">План тренировок</h2>
              <button
                className="btn-secondary"
                onClick={() => {
                  setTrainingForm(prev => ({ ...prev, time: currentTimeString() }));
                  setSheet('training');
                }}
              >
                Добавить тренировку
              </button>
            </div>
            <div className="space-y-3">
              {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(timeOfDay => {
                const sessions = plannedTraining.filter(item => item.timeOfDay === timeOfDay);
                if (sessions.length === 0) return null;
                return (
                  <div key={timeOfDay} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {timeOfDayLabels[timeOfDay]}
                    </p>
                    {sessions.map(session => {
                      const protocol = session.protocolRef
                        ? data.library.protocols.find(item => item.id === session.protocolRef)
                        : null;
                      return (
                        <div key={session.id} className="rounded-2xl border border-slate-200 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold">
                                {protocol?.name ?? 'Тренировка'}
                              </p>
                              <p className="text-xs text-slate-500">{protocol?.description}</p>
                            </div>
                            {session.completed ? <span className="badge">Выполнено</span> : null}
                          </div>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <label className="text-xs text-slate-500">
                              Время
                              <input
                                type="time"
                                className="input input-time mt-1 w-32"
                                value={getPlannedWorkoutTime(session)}
                                onChange={event => updateWorkoutTime(session.id, event.target.value)}
                              />
                            </label>
                            <label className="text-xs text-slate-500">
                              Время суток
                              <select
                                className="input input-time mt-1"
                                value={session.timeOfDay}
                                onChange={event => {
                                  const next = event.target.value as WorkoutPlanItem['timeOfDay'];
                                  updateData(state => {
                                    const plan = state.planner.dayPlans.find(
                                      item => item.date === selectedDate
                                    );
                                    if (!plan) return { ...state };
                                    plan.workoutsPlan = plan.workoutsPlan.map(item =>
                                      item.id === session.id ? { ...item, timeOfDay: next } : item
                                    );
                                    return { ...state };
                                  });
                                }}
                              >
                                {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(
                                  option => (
                                    <option key={option} value={option}>
                                      {timeOfDayLabels[option]}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>
                            <button
                              className="btn-primary w-full sm:w-auto"
                              onClick={() => {
                                setRunner(session);
                                setRunnerProtocolId(session.protocolRef ?? null);
                              }}
                            >
                              Запустить
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {plannedTraining.length === 0 ? (
                <p className="text-sm text-slate-500">План тренировок пуст.</p>
              ) : null}
            </div>
          </div>

          <div className="card space-y-4 p-4" id="movement-plan">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">План движения</h2>
              <button className="btn-secondary w-full sm:w-auto" onClick={() => openMovement()}>
                Добавить вручную
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3 text-sm">
              <p className="font-semibold">Запланированная активность</p>
              <p className="text-xs text-slate-500">
                {plannedMovementSession
                  ? `${plannedMovementActivityName ?? 'Движение'} · ${plannedMovementSessionMinutes} мин${
                      plannedMovementTime ? ` · ${plannedMovementTime}` : ''
                    }`
                  : 'Не задано'}
              </p>
              <div className="mt-3 space-y-2">
                <label className="text-xs text-slate-500">
                  Активность
                  <select
                    className="input mt-1"
                    value={movementActivityId}
                    onChange={event => setMovementActivityId(event.target.value)}
                  >
                    {data.library.movementActivities.map(activity => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  Время таймера, мин
                  <input
                    type="number"
                    className="input mt-1"
                    min={1}
                    value={movementDurationMinutes}
                    onChange={event => {
                      const value = Number(event.target.value);
                      setMovementDurationMinutes(Number.isFinite(value) ? value : 0);
                    }}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Калории (расчёт):{' '}
                  <span className="text-slate-700">
                    {estimateMovement({
                      id: '',
                      dateTime: toDateTime(selectedDate),
                      activityRef: movementActivityId,
                      durationMinutes: movementDurationMinutes,
                      plannedFlights: movementPlannedFlights
                    }).toFixed(0)}{' '}
                    ккал
                  </span>
                </label>
                {data.library.movementActivities.find(item => item.id === movementActivityId)
                  ?.kind === 'stairs' ? (
                  <label className="text-xs text-slate-500">
                    Пролеты вверх до спуска
                    <input
                      type="number"
                      className="input mt-1"
                      min={1}
                      value={movementPlannedFlights}
                      onChange={event => {
                        const value = Number(event.target.value);
                        setMovementPlannedFlights(Number.isFinite(value) ? value : 0);
                      }}
                    />
                  </label>
                ) : null}
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold">Таймер движения</p>
                {movementTimer.running ? (
                  <p className="text-xs text-slate-500">
                    Осталось:{' '}
                    {formatElapsed(
                      Math.max(0, movementTimer.durationSec - movementTimer.elapsedSec)
                    )}{' '}
                    · Всего: {formatElapsed(movementTimer.durationSec)}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    План таймера: {movementDurationMinutes} мин
                  </p>
                )}
                {movementGeoStatus ? (
                  <p className="text-xs text-slate-400">Геолокация: {movementGeoStatus}</p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {!movementTimer.running ? (
                    <button className="btn-primary w-full sm:w-auto" onClick={startMovementSession}>
                      Выполнить по плану
                    </button>
                  ) : (
                    <button className="btn-secondary w-full sm:w-auto" onClick={stopMovementSession}>
                      Завершить раньше
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Шаги за день</p>
                  <p className="text-xs text-slate-500">
                    План: {dayPlan?.plannedSteps ?? 'не задан'} · Факт: {movementSteps} шагов
                  </p>
                </div>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={() => setMovementDayLog({ date: selectedDate, steps: movementSteps })}
                >
                  Сохранить шаги
                </button>
              </div>
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
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card p-4 space-y-3" id="meal-plan">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Питание по плану</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="btn-secondary w-full sm:w-auto"
                  onClick={() => openFoodSheet('breakfast')}
                >
                  Добавить питание
                </button>
                <button
                  className="btn-secondary w-full sm:w-auto"
                  onClick={() => openFoodSheet('snack', ['snack'])}
                >
                  Перекус
                </button>
              </div>
            </div>
            {(Object.keys(mealLabels) as FoodEntry['meal'][]).map(meal => (
              <div key={meal} className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{mealLabels[meal]}</p>
                    <p className="text-xs text-slate-500">
                      {`Время: ${getPlannedMealTime(meal, mealTimes[meal])}`}
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setMealEdit(meal);
                      setSheet('meal-edit');
                    }}
                  >
                    Редактировать прием
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Состав приема пищи
                  </p>
                  {mealComponents[meal].length ? (
                    <div className="control-row text-xs">
                      {mealComponents[meal].map(component => {
                        const recipeName =
                          data.library.recipes.find(recipe => recipe.id === component.recipeRef)
                            ?.name ?? 'Не выбрано';
                        return (
                          <span key={component.id} className="badge">
                            {mealComponentLabels[component.type]} · {recipeName} · {component.portion}
                            {component.extra ? ' · добавка' : ''}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Состав не задан. Добавьте компоненты в редакторе приема пищи.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {requirements &&
          (requirements.requireWeight || requirements.requireWaist || requiredPhotos.length > 0) ? (
            <div className="card p-4 space-y-3" id="measurements">
              <h2 className="section-title">Фото и измерения</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {requirements.requireWeight ? (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setWeightForm(prev => ({ ...prev, time: currentTimeString() }));
                      setSheet('weight');
                    }}
                  >
                    Внести вес
                  </button>
                ) : null}
                {requirements.requireWaist ? (
                  <button className="btn-secondary" onClick={() => setSheet('waist')}>
                    Внести талию
                  </button>
                ) : null}
                {requiredPhotos.map(kind => (
                  <button
                    key={kind}
                    className="btn-secondary"
                    onClick={() => {
                      setPhotoKind(kind);
                      setSheet('photo');
                    }}
                  >
                    Добавить фото {photoLabels[kind]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card p-4 space-y-2">
          <h2 className="section-title">Плана нет</h2>
          <p className="text-sm text-slate-500">
            На эту дату пока нет плана. Выберите период или создайте план.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn-primary w-full" onClick={() => navigate('/plan')}>
              Перейти в планирование
            </button>
            <button
              className="btn-secondary w-full"
              onClick={() => {
                createOrGetDayPlan(selectedDate);
              }}
            >
              Создать расписание вручную
            </button>
          </div>
        </div>
      )}

      <div className="card p-4 space-y-2" id="smoking">
        <h2 className="section-title">Курение</h2>
        <p className="text-sm text-slate-500">
          Лимит: {requirements?.smokingTargetMax ?? '—'} · Факт: {cigaretteCount}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="btn-secondary"
            onClick={() => {
              setSmokingForm(prev => ({ ...prev, time: currentTimeString() }));
              setSheet('smoking');
            }}
          >
            Добавить сигарету
          </button>
          <button className="btn-secondary" onClick={() => scrollToSection('summary')}>
            Смотреть сводку
          </button>
        </div>
      </div>

      <div className="card p-4 space-y-2" id="water">
        <h2 className="section-title">Водный баланс</h2>
        <p className="text-sm text-slate-500">
          Эквивалент воды: {hydrationEquivalent.toFixed(0)} мл · Цель:{' '}
          {hydrationTargetMl !== undefined ? hydrationTargetMl.toFixed(0) : '—'} мл · Коэф.{' '}
          {hydrationTargetMl !== undefined ? hydrationCoefficient.toFixed(2) : '—'}
        </p>
        <p className="text-xs text-slate-400">
          Напитки: {drinkTotalMl.toFixed(0)} мл · Еда: {foodHydrationMl.toFixed(0)} мл ·
          Вес: {hydrationWeight ?? '—'} кг · Активность: {activityCoefficient.toFixed(2)}
        </p>
        <div className="rounded-2xl border border-slate-200 p-3 space-y-3">
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
                if (!drinkForm.drinkId || !drinkForm.portionLabel || !drinkForm.portionMl) return;
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
          <button className="btn-secondary w-full sm:w-auto" onClick={() => scrollToSection('summary')}>
            Смотреть сводку
          </button>
        </div>
      </div>

      <BottomSheet open={sheet === 'date'} title="Выбор даты" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Дата</label>
        <input
          type="date"
          className="input"
          value={selectedDate}
          onChange={event => setSelectedDate(event.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <button className="btn-secondary" onClick={() => moveDate(-1)}>
            Вчера
          </button>
          <button className="btn-secondary" onClick={() => setSelectedDate(todayISO())}>
            Сегодня
          </button>
          <button className="btn-secondary" onClick={() => moveDate(1)}>
            Завтра
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'meal-edit'}
        title={mealEdit ? `Редактирование · ${mealLabels[mealEdit]}` : 'Редактирование'}
        onClose={() => {
          setSheet(null);
          setMealEdit(null);
        }}
      >
        {mealEdit ? (
          <>
            <label className="text-sm font-semibold text-slate-600">Время приема пищи</label>
            <input
              type="time"
              className="input"
              value={editMealTime}
              onChange={event => updateMealTime(mealEdit, event.target.value)}
            />
            <div className="rounded-2xl border border-slate-200 p-3 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Компоненты приема пищи
                </p>
                <button className="btn-secondary" onClick={() => addMealComponent(mealEdit)}>
                  Добавить компонент
                </button>
              </div>
              <div className="control-row">
                <button className="btn-secondary" onClick={() => applyMealTemplate(mealEdit)}>
                  Шаблон приема
                </button>
              </div>
              {editComponents.length ? (
                <div className="space-y-3">
                  {editComponents.map(component => (
                    <div
                      key={component.id}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
                    >
                      <label className="text-xs text-slate-500">
                        Тип блюда
                        <select
                          className="input mt-1"
                          value={component.type}
                          onChange={event => {
                            const nextType = event.target.value as MealComponentType;
                            const nextPortion = mealComponentPortions[nextType].includes(
                              component.portion
                            )
                              ? component.portion
                              : getDefaultPortion(nextType);
                            updateMealComponent(mealEdit, component.id, {
                              type: nextType,
                              portion: nextPortion
                            });
                          }}
                        >
                          {(Object.keys(mealComponentLabels) as MealComponentType[]).map(option => (
                            <option key={option} value={option}>
                              {mealComponentLabels[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-slate-500">
                        Блюдо
                        <select
                          className="input mt-1"
                          value={component.recipeRef ?? ''}
                          onChange={event =>
                            updateMealComponent(mealEdit, component.id, {
                              recipeRef: event.target.value || undefined
                            })
                          }
                        >
                          <option value="">Выберите блюдо</option>
                          {data.library.recipes.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-slate-500">
                        Порция
                        <select
                          className="input mt-1"
                          value={component.portion}
                          onChange={event =>
                            updateMealComponent(mealEdit, component.id, {
                              portion: event.target.value
                            })
                          }
                        >
                          {mealComponentPortions[component.type].map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex flex-col gap-2 text-xs text-slate-500">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={Boolean(component.extra)}
                            onChange={event =>
                              updateMealComponent(mealEdit, component.id, {
                                extra: event.target.checked
                              })
                            }
                          />
                          Добавка
                        </label>
                        <button
                          className="btn-secondary"
                          onClick={() => removeMealComponent(mealEdit, component.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Добавьте компоненты, чтобы собрать прием пищи.
                </p>
              )}
            </div>
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet open={sheet === 'food'} title="Добавить питание" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Тип записи</label>
        <select
          className="input"
          value={foodForm.kind}
          onChange={event =>
            setFoodForm(prev => ({ ...prev, kind: event.target.value as typeof prev.kind }))
          }
        >
          <option value="product">Продукт</option>
          <option value="dish">Блюдо</option>
          <option value="free">Свободная запись</option>
          <option value="cheat">Читмил</option>
        </select>

        <label className="text-sm font-semibold text-slate-600">Приём пищи</label>
        <select
          className="input"
          value={foodForm.meal}
          onChange={event =>
            setFoodForm(prev => ({ ...prev, meal: event.target.value as typeof prev.meal }))
          }
        >
          {Object.entries(mealLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <label className="text-sm font-semibold text-slate-600">Время (опционально)</label>
        <input
          type="time"
          className="input"
          value={foodForm.time}
          onChange={event => setFoodForm(prev => ({ ...prev, time: event.target.value }))}
        />

        {foodForm.kind === 'product' && (
          <>
            <label className="text-sm font-semibold text-slate-600">Продукт</label>
            <select
              className="input"
              value={foodForm.refId}
              onChange={event =>
                setFoodForm(prev => {
                  const refId = event.target.value;
                  const tags =
                    data.library.products.find(product => product.id === refId)?.nutritionTags ??
                    [];
                  return { ...prev, refId, nutritionTags: tags };
                })
              }
            >
              <option value="">Выберите продукт</option>
              {data.library.products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Граммы</label>
            <input
              type="number"
              className="input"
              value={foodForm.grams}
              onChange={event =>
                setFoodForm(prev => ({ ...prev, grams: Number(event.target.value) }))
              }
            />
            <div className="control-row">
              {data.library.products
                .find(product => product.id === foodForm.refId)
                ?.portionPresets?.map(preset => (
                  <button
                    key={preset.label}
                    className="btn-secondary"
                    onClick={() => setFoodForm(prev => ({ ...prev, grams: preset.grams }))}
                  >
                    {preset.label}
                  </button>
                ))}
              {data.presets.portions.map(preset => (
                <button
                  key={preset.label}
                  className="btn-secondary"
                  onClick={() => setFoodForm(prev => ({ ...prev, grams: preset.grams }))}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}

        {foodForm.kind === 'dish' && (
          <>
            <label className="text-sm font-semibold text-slate-600">Блюдо</label>
            <select
              className="input"
              value={foodForm.refId}
              onChange={event =>
                setFoodForm(prev => {
                  const refId = event.target.value;
                  const tags =
                    data.library.recipes.find(recipe => recipe.id === refId)?.nutritionTags ?? [];
                  return { ...prev, refId, nutritionTags: tags };
                })
              }
            >
              <option value="">Выберите блюдо</option>
              {data.library.recipes.map(recipe => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Порции</label>
            <input
              type="number"
              className="input"
              value={foodForm.servings}
              onChange={event =>
                setFoodForm(prev => ({ ...prev, servings: Number(event.target.value) }))
              }
            />
          </>
        )}

        {(foodForm.kind === 'free' || foodForm.kind === 'cheat') && (
          <>
            <label className="text-sm font-semibold text-slate-600">Название</label>
            <input
              className="input"
              value={foodForm.title}
              onChange={event => setFoodForm(prev => ({ ...prev, title: event.target.value }))}
            />
            {foodForm.kind === 'cheat' ? (
              <>
                <label className="text-sm font-semibold text-slate-600">Категория читмила</label>
                <select
                  className="input"
                  value={foodForm.cheatCategory ?? 'pizza'}
                  onChange={event =>
                    setFoodForm(prev => ({
                      ...prev,
                      cheatCategory: event.target.value as FoodEntry['cheatCategory']
                    }))
                  }
                >
                  {Object.entries(cheatLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <label className="text-sm font-semibold text-slate-600">Калории</label>
            <input
              type="number"
              className="input"
              value={foodForm.kcalOverride}
              onChange={event =>
                setFoodForm(prev => ({ ...prev, kcalOverride: event.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className="input"
                placeholder="Белки"
                value={foodForm.proteinOverride}
                onChange={event =>
                  setFoodForm(prev => ({ ...prev, proteinOverride: event.target.value }))
                }
              />
              <input
                type="number"
                className="input"
                placeholder="Жиры"
                value={foodForm.fatOverride}
                onChange={event =>
                  setFoodForm(prev => ({ ...prev, fatOverride: event.target.value }))
                }
              />
              <input
                type="number"
                className="input"
                placeholder="Углеводы"
                value={foodForm.carbOverride}
                onChange={event =>
                  setFoodForm(prev => ({ ...prev, carbOverride: event.target.value }))
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
                  checked={foodForm.nutritionTags.includes(tag)}
                  onChange={() => toggleFoodTag(tag)}
                />
                {nutritionTagLabels[tag]}
              </label>
            ))}
          </div>
        </div>

        <button
          className="btn-primary w-full"
          onClick={() => {
            addFoodEntry(selectedDate, {
              id: '',
              kind: foodForm.kind,
              refId: foodForm.refId || undefined,
              grams: foodForm.kind === 'product' ? foodForm.grams : undefined,
              servings: foodForm.kind === 'dish' ? foodForm.servings : undefined,
              meal: foodForm.meal,
              time: foodForm.time || undefined,
              title: foodForm.kind === 'free' || foodForm.kind === 'cheat' ? foodForm.title : undefined,
              kcalOverride:
                (foodForm.kind === 'free' || foodForm.kind === 'cheat') && foodForm.kcalOverride
                  ? Number(foodForm.kcalOverride)
                  : undefined,
              proteinOverride:
                (foodForm.kind === 'free' || foodForm.kind === 'cheat') && foodForm.proteinOverride
                  ? Number(foodForm.proteinOverride)
                  : undefined,
              fatOverride:
                (foodForm.kind === 'free' || foodForm.kind === 'cheat') && foodForm.fatOverride
                  ? Number(foodForm.fatOverride)
                  : undefined,
              carbOverride:
                (foodForm.kind === 'free' || foodForm.kind === 'cheat') && foodForm.carbOverride
                  ? Number(foodForm.carbOverride)
                  : undefined,
              cheatCategory: foodForm.kind === 'cheat' ? foodForm.cheatCategory : undefined,
              nutritionTags: resolveFoodTags(foodForm)
            });
            setSheet(null);
          }}
        >
          Добавить
        </button>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'training'}
        title="Добавить тренировку"
        onClose={() => setSheet(null)}
      >
        <label className="text-sm font-semibold text-slate-600">Минуты</label>
        <input
          type="number"
          className="input"
          value={trainingForm.minutes}
          onChange={event =>
            setTrainingForm(prev => ({ ...prev, minutes: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">Подходы</label>
        <input
          type="number"
          className="input"
          value={trainingForm.sets}
          onChange={event =>
            setTrainingForm(prev => ({ ...prev, sets: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">Повторы</label>
        <input
          type="number"
          className="input"
          value={trainingForm.reps}
          onChange={event =>
            setTrainingForm(prev => ({ ...prev, reps: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">
          Калории (расчёт): {estimateTraining(trainingForm).toFixed(0)} ккал
        </label>
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={trainingForm.time}
          onChange={event => setTrainingForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            addTrainingLog({
              id: '',
              dateTime: toDateTime(selectedDate, trainingForm.time),
              type: 'workout',
              minutes: trainingForm.minutes,
              sets: trainingForm.sets || undefined,
              reps: trainingForm.reps || undefined,
              calories: estimateTraining(trainingForm) || undefined,
              timeOfDay: getTimeOfDayFromTime(trainingForm.time)
            });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

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
                <label className="text-sm font-semibold text-slate-600">
                  Фактически пройдено
                </label>
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

      <BottomSheet open={sheet === 'smoking'} title="Добавить сигарету" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Количество</label>
        <input
          type="number"
          className="input"
          value={smokingForm.count}
          onChange={event => setSmokingForm(prev => ({ ...prev, count: Number(event.target.value) }))}
        />
        <label className="text-sm font-semibold text-slate-600">Триггер</label>
        <input
          className="input"
          value={smokingForm.trigger}
          onChange={event => setSmokingForm(prev => ({ ...prev, trigger: event.target.value }))}
        />
        <label className="text-sm font-semibold text-slate-600">Стресс (1-5)</label>
        <input
          type="number"
          min={1}
          max={5}
          className="input"
          value={smokingForm.stress}
          onChange={event => setSmokingForm(prev => ({ ...prev, stress: Number(event.target.value) }))}
        />
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={smokingForm.ruleApplied}
            onChange={event =>
              setSmokingForm(prev => ({ ...prev, ruleApplied: event.target.checked }))
            }
          />
          Правило применено
        </label>
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={smokingForm.time}
          onChange={event => setSmokingForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            addSmokingLog({
              id: '',
              dateTime: toDateTime(selectedDate, smokingForm.time),
              count: smokingForm.count,
              trigger: smokingForm.trigger,
              stressLevel1to5: smokingForm.stress,
              ruleApplied: smokingForm.ruleApplied
            });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'weight'} title="Вес" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Вес (кг)</label>
        <input
          type="number"
          className="input"
          value={weightForm.weightKg}
          onChange={event =>
            setWeightForm(prev => ({ ...prev, weightKg: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={weightForm.time}
          onChange={event => setWeightForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            addWeightLog({
              id: '',
              dateTime: toDateTime(selectedDate, weightForm.time),
              weightKg: weightForm.weightKg
            });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'waist'} title="Талия" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Талия (см)</label>
        <input
          type="number"
          className="input"
          value={waistForm.waistCm}
          onChange={event =>
            setWaistForm(prev => ({ ...prev, waistCm: Number(event.target.value) }))
          }
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            addWaistLog({ id: '', date: selectedDate, waistCm: waistForm.waistCm });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'photo'} title="Добавить фото" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Тип</label>
        <select
          className="input"
          value={photoKind}
          onChange={event => setPhotoKind(event.target.value as 'front' | 'side')}
        >
          <option value="front">Фронт</option>
          <option value="side">Профиль</option>
        </select>
        <label className="text-sm font-semibold text-slate-600">Файл</label>
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={event => setPhotoFile(event.target.files?.[0] ?? null)}
        />
        <button className="btn-primary w-full" onClick={savePhoto}>
          Сохранить фото
        </button>
      </BottomSheet>

      {runner && runnerProtocol && (
        <BottomSheet open={Boolean(runner)} title={runnerProtocol.name} onClose={() => setRunner(null)}>
          <WorkoutRunner
            protocol={runnerProtocol}
            exercises={data.library.exercises}
            onClose={() => setRunner(null)}
            onComplete={() => {
              const totalDurationSec = runnerProtocol.steps.reduce(
                (sum, step) => sum + (step.durationSec ?? 0),
                0
              );
              const completedMinutes = totalDurationSec
                ? Math.max(1, Math.round(totalDurationSec / 60))
                : 30;
              const completedAt = new Date().toISOString();
              addTrainingLog({
                id: '',
                dateTime: completedAt,
                type: 'workout',
                minutes: completedMinutes,
                protocolRef: runnerProtocolId ?? undefined,
                timeOfDay: getTimeOfDayFromDateTime(completedAt)
              });
              updateData(state => {
                const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
                if (!plan) return { ...state };
                plan.workoutsPlan = plan.workoutsPlan.map(item =>
                  item.id === runner.id ? { ...item, completed: true } : item
                );
                return { ...state };
              });
            }}
          />
        </BottomSheet>
      )}

      {dayPlan ? (
        <div className="card p-4 text-xs text-slate-500">
          Плановые калории (по меню):{' '}
          {(() => {
            if (!dayPlan.mealsPlan) return '—';
            const meals = Object.values(dayPlan.mealsPlan).flat();
            const total = meals.reduce((sum, item) => {
              if (item.kind === 'product' && item.refId && item.plannedGrams) {
                const product = data.library.products.find(p => p.id === item.refId);
                if (!product) return sum;
                return sum + (product.kcalPer100g * item.plannedGrams) / 100;
              }
              if (item.kind === 'dish' && item.refId) {
                const dish = data.library.recipes.find(r => r.id === item.refId);
                if (!dish) return sum;
                const nutrition = calcRecipeNutrition(dish, data.library);
                return sum + nutrition.perServing.kcal * (item.plannedServings ?? 1);
              }
              return sum;
            }, 0);
            return `${total.toFixed(0)} ккал`;
          })()}
        </div>
      ) : null}
    </section>
  );
};

export default TodayPage;
